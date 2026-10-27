import "server-only";
import { env } from "@/lib/server/env";
import { HttpError, notConfigured } from "@/lib/server/http";
import { claimRenderCompletion, getSetting, selectMontage, setSetting } from "@/lib/server/montage/repo";
import { completeRender, failRender, HF_VERSION, nowIso, parseProgressLine, posterFromImage, reportProgress, stageLabel, tailForError } from "@/lib/server/montage/render/common";
import type { Montage, RenderState } from "@/lib/shared/types";

/**
 * Rendu dans une Vercel Sandbox (microVM Linux) — recommandé en production sur Vercel, d'après le
 * modèle officiel de HeyGen (hyperframes-vercel-template), rendu asynchrone :
 *   - une fois : « Préparer le rendu » crée un instantané (snapshot) avec Chrome, FFmpeg et la CLI
 *     HyperFrames ; son identifiant est gardé dans atelier.settings (hyperframes_sandbox_snapshot) ;
 *   - à chaque rendu : une sandbox démarre depuis l'instantané (~100 ms), reçoit index.html (médias
 *     en liens HTTPS signés), lance `hyperframes render` en tâche détachée qui écrit son code de
 *     sortie dans job/exit_code ; l'Atelier interroge ensuite la sandbox (refreshRender) puis
 *     récupère out.mp4 et l'affiche, et arrête la sandbox.
 * Authentification : automatique sur Vercel (OIDC), sinon VERCEL_TOKEN + VERCEL_TEAM_ID + VERCEL_PROJECT_ID.
 */

export const SNAPSHOT_SETTING = "hyperframes_sandbox_snapshot";
const RENDER_TIMEOUT_MS = 25 * 60_000;
const SETUP_TIMEOUT_MS = 20 * 60_000;
const JOB_DIR = "job";

export interface SandboxSnapshotInfo {
  snapshotId: string;
  sizeBytes: number | null;
  createdAt: string;
  hyperframesVersion: string;
}

type SandboxModule = typeof import("@vercel/sandbox");
type SandboxInstance = Awaited<ReturnType<SandboxModule["Sandbox"]["create"]>>;

/** Identifiants explicites si fournis ; sinon le SDK utilise l'OIDC de Vercel (VERCEL_OIDC_TOKEN). */
export function sandboxCredentials(): { token: string; teamId: string; projectId: string } | Record<string, never> {
  const { vercelSandboxToken: token, vercelTeamId: teamId, vercelProjectId: projectId } = env.hyperframes;
  if (token && teamId && projectId) return { token, teamId, projectId };
  if (!process.env.VERCEL_OIDC_TOKEN && !process.env.VERCEL) {
    throw notConfigured("Rendu Sandbox : hors de Vercel, définissez VERCEL_TOKEN, VERCEL_TEAM_ID et VERCEL_PROJECT_ID (ou lancez `vercel env pull`).");
  }
  return {};
}

async function sdk(): Promise<SandboxModule> {
  return import("@vercel/sandbox");
}

/** Nom de sandbox dérivé du travail (lettres, chiffres, tirets). */
export function sandboxName(jobId: string): string {
  return `atelier-hf-${jobId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 32)}`;
}

async function run(sb: SandboxInstance, label: string, params: { cmd: string; args?: string[]; sudo?: boolean }) {
  const r = await sb.runCommand(params);
  if (r.exitCode !== 0) throw new Error(`${label} (code ${r.exitCode}) : ${tailForError(await r.stderr())}`);
}

/** Commande de rendu détachée : journal, affiche, durée et code de sortie dans job/. */
export function renderScript(fps: number): string {
  return [
    `cd /vercel/sandbox`,
    `npx --no-install hyperframes render ${JOB_DIR} --output ${JOB_DIR}/out.mp4 --fps ${fps} --quality standard --workers auto > ${JOB_DIR}/render.log 2>&1`,
    `code=$?`,
    `if [ "$code" -eq 0 ]; then ffmpeg -y -loglevel error -ss 1 -i ${JOB_DIR}/out.mp4 -frames:v 1 ${JOB_DIR}/poster.png >/dev/null 2>&1; ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${JOB_DIR}/out.mp4 > ${JOB_DIR}/duration.txt 2>/dev/null; fi`,
    `echo "$code" > ${JOB_DIR}/exit_code`,
  ].join("; ");
}

/** Prépare l'instantané de rendu (plusieurs minutes, une fois par version de HyperFrames). */
export async function setupSandboxSnapshot(): Promise<SandboxSnapshotInfo> {
  const creds = sandboxCredentials();
  const { Sandbox } = await sdk();
  const sb = await Sandbox.create({ runtime: "node22", resources: { vcpus: 4 }, timeout: SETUP_TIMEOUT_MS, persistent: false, ...creds });
  try {
    await Promise.all([
      run(sb, "Installation des bibliothèques de Chrome", {
        cmd: "dnf",
        args: ["install", "-y", "--setopt=install_weak_deps=False", "nss", "nspr", "atk", "at-spi2-atk", "cups-libs", "libdrm", "libxkbcommon", "libXcomposite", "libXdamage", "libXext", "libXfixes", "libXrandr", "mesa-libgbm", "alsa-lib", "pango"],
        sudo: true,
      }),
      run(sb, "Installation de HyperFrames et FFmpeg", { cmd: "npm", args: ["install", "--no-save", "--no-audit", "--no-fund", `hyperframes@${HF_VERSION}`, "ffmpeg-static", "ffprobe-static"] }),
    ]);
    await run(sb, "Lien FFmpeg", { cmd: "ln", args: ["-sf", "/vercel/sandbox/node_modules/ffmpeg-static/ffmpeg", "/usr/local/bin/ffmpeg"], sudo: true });
    await run(sb, "Lien FFprobe", { cmd: "ln", args: ["-sf", "/vercel/sandbox/node_modules/ffprobe-static/bin/linux/x64/ffprobe", "/usr/local/bin/ffprobe"], sudo: true });
    await run(sb, "Téléchargement de Chrome", { cmd: "npx", args: ["--no-install", "hyperframes", "browser", "ensure"] });
    const snap = await sb.snapshot({ expiration: 0 });
    const info: SandboxSnapshotInfo = { snapshotId: snap.snapshotId, sizeBytes: snap.sizeBytes ?? null, createdAt: nowIso(), hyperframesVersion: HF_VERSION };
    await setSetting(SNAPSHOT_SETTING, info);
    return info;
  } finally {
    await sb.stop().catch(() => undefined);
  }
}

export async function getSnapshotInfo(): Promise<SandboxSnapshotInfo | null> {
  return getSetting<SandboxSnapshotInfo>(SNAPSHOT_SETTING);
}

/** Démarre le rendu dans une sandbox ; renvoie son nom (jobId du rendu). */
export async function startSandboxRender(montage: Montage, remoteHtml: string, jobId: string): Promise<string> {
  const creds = sandboxCredentials();
  const snap = await getSnapshotInfo();
  if (!snap) throw new HttpError(409, "sandbox_not_ready", "Le rendu Sandbox n'est pas encore préparé : lancez « Préparer le rendu » (POST /api/montages/render-setup) une fois.");
  const { Sandbox } = await sdk();
  const name = sandboxName(jobId);
  let sb: SandboxInstance;
  try {
    sb = await Sandbox.create({ name, source: { type: "snapshot", snapshotId: snap.snapshotId }, resources: { vcpus: 4 }, timeout: RENDER_TIMEOUT_MS, persistent: false, tags: { app: "atelier", montage: montage.id.slice(0, 32) }, ...creds });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/snapshot/i.test(msg) && /not.?found|expired/i.test(msg)) throw new HttpError(409, "sandbox_not_ready", "L'instantané de rendu a expiré : relancez « Préparer le rendu ».");
    throw err;
  }
  try {
    await sb.writeFiles([{ path: `${JOB_DIR}/index.html`, content: remoteHtml }]);
    await sb.runCommand({ cmd: "bash", args: ["-lc", renderScript(montage.spec.fps)], detached: true, env: { HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_NO_UPDATE_CHECK: "1", DO_NOT_TRACK: "1" } });
  } catch (err) {
    await sb.stop().catch(() => undefined);
    throw err;
  }
  return name;
}

async function getSandbox(name: string): Promise<SandboxInstance | null> {
  const { Sandbox } = await sdk();
  try {
    return (await Sandbox.get({ name, ...sandboxCredentials() })) as SandboxInstance;
  } catch {
    return null;
  }
}

/** Interroge la sandbox ; à la fin, récupère la vidéo, l'ajoute à la médiathèque et arrête la sandbox. */
export async function pollSandboxRender(montage: Montage): Promise<Montage> {
  const state = montage.render as RenderState;
  if (!state.jobId) return montage;
  const sb = await getSandbox(state.jobId);
  if (!sb) {
    const age = Date.now() - new Date(state.startedAt).getTime();
    if (age > RENDER_TIMEOUT_MS + 60_000) return (await failRender(montage.id, state, "La sandbox de rendu a expiré avant la fin du rendu.")) ?? montage;
    return montage;
  }
  const exit = await sb.readFileToBuffer({ path: `${JOB_DIR}/exit_code` }).catch(() => null);
  if (!exit) {
    const log = (await sb.readFileToBuffer({ path: `${JOB_DIR}/render.log` }).catch(() => null))?.toString("utf8") ?? "";
    const last = log
      .split(/\r?\n/)
      .map(parseProgressLine)
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .pop();
    if (last) await reportProgress(montage, { ...state, progress: Math.round((0.05 + (last.pct / 100) * 0.9) * 1000) / 1000, message: stageLabel(last.stage, last.pct) }, true);
    else await reportProgress(montage, { ...state, message: "Démarrage du moteur de rendu…" }, true);
    return (await selectMontage(montage.id)) ?? montage;
  }
  if (!(await claimRenderCompletion(montage.id, state.jobId))) return (await selectMontage(montage.id)) ?? montage;
  try {
    const code = exit.toString("utf8").trim();
    if (code !== "0") {
      const log = (await sb.readFileToBuffer({ path: `${JOB_DIR}/render.log` }).catch(() => null))?.toString("utf8") ?? "";
      return (await failRender(montage.id, state, `Le rendu HyperFrames a échoué dans la sandbox (code ${code}) : ${tailForError(log) || "aucun détail"}`)) ?? montage;
    }
    const video = await sb.readFileToBuffer({ path: `${JOB_DIR}/out.mp4` });
    if (!video) return (await failRender(montage.id, state, "La sandbox n'a pas produit de vidéo.")) ?? montage;
    const posterPng = await sb.readFileToBuffer({ path: `${JOB_DIR}/poster.png` }).catch(() => null);
    const poster = posterPng ? await posterFromImage(posterPng).catch(() => null) : null;
    const dur = Number((await sb.readFileToBuffer({ path: `${JOB_DIR}/duration.txt` }).catch(() => null))?.toString("utf8").trim());
    const done = await completeRender(montage.id, { ...state, message: "Enregistrement dans la médiathèque…" }, { buffer: video }, { actor: null, poster, durationS: Number.isFinite(dur) && dur > 0 ? dur : null });
    return done ?? (await selectMontage(montage.id)) ?? montage;
  } catch (err) {
    return (await failRender(montage.id, state, `Vidéo non récupérée depuis la sandbox : ${err instanceof Error ? err.message : String(err)}`)) ?? montage;
  } finally {
    await sb.stop().catch(() => undefined);
  }
}

export async function cancelSandboxRender(montage: Montage): Promise<void> {
  if (!montage.render?.jobId) return;
  const sb = await getSandbox(montage.render.jobId);
  await sb?.stop().catch(() => undefined);
}

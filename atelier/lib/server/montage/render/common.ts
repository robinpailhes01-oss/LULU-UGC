import "server-only";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { getDb } from "@/lib/server/db";
import { logActivity } from "@/lib/server/repo/activity";
import { addServerAsset } from "@/lib/server/services/uploads";
import { FORMAT_SIZE } from "@/lib/client/montage/timing";
import { patchRenderIfCurrent, selectMontage } from "@/lib/server/montage/repo";
import type { Montage, RenderState } from "@/lib/shared/types";

const run = promisify(execFile);

/** Version de HyperFrames utilisée par tous les rendus (alignée sur @hyperframes/player et /lint). */
export const HF_VERSION = "0.8.150";

export const ffmpegBin = () => process.env.HYPERFRAMES_FFMPEG_PATH?.trim() || "ffmpeg";
export const ffprobeBin = () => process.env.HYPERFRAMES_FFPROBE_PATH?.trim() || "ffprobe";

export function nowIso(): string {
  return new Date().toISOString();
}

/** Mise à jour de la progression, au plus une écriture par seconde et demie par rendu. */
const lastWrite = new Map<string, number>();
export async function reportProgress(montage: Pick<Montage, "id">, state: RenderState, force = false): Promise<void> {
  const key = `${montage.id}:${state.jobId}`;
  const now = Date.now();
  if (!force && now - (lastWrite.get(key) ?? 0) < 1500) return;
  lastWrite.set(key, now);
  await patchRenderIfCurrent(montage.id, state.jobId ?? "", state).catch((err) => console.error("[atelier] progression du rendu", err));
}

/** Échec du rendu : état « failed », message lisible, journal. */
export async function failRender(montageId: string, state: RenderState, message: string): Promise<Montage | null> {
  const m = await patchRenderIfCurrent(montageId, state.jobId ?? "", { ...state, progress: state.progress, error: message, message: "Échec du rendu", finishedAt: nowIso() }, { status: "failed" });
  if (m) await logActivity({ actor: null, verb: "n'a pas pu rendre", objectType: "montage", objectId: montageId, summary: m.title });
  return m;
}

/** Image d'affiche (et vignette) extraite de la vidéo rendue, si FFmpeg est disponible. */
export async function posterFromVideo(file: string, durationS: number | null): Promise<{ poster: Buffer; thumb: Buffer } | null> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "atelier-poster-"));
  try {
    const png = path.join(dir, "poster.png");
    const at = durationS && durationS < 2 ? Math.max(0, durationS / 3) : 1;
    await run(ffmpegBin(), ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(at), "-i", file, "-frames:v", "1", png], { timeout: 60_000 });
    return await posterFromImage(await readFile(png));
  } catch (err) {
    console.warn("[atelier] affiche du rendu indisponible", err instanceof Error ? err.message : err);
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function posterFromImage(img: Buffer): Promise<{ poster: Buffer; thumb: Buffer }> {
  const poster = await sharp(img).resize({ width: 720, height: 1280, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const thumb = await sharp(img).resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  return { poster, thumb };
}

/** Durée réelle d'un fichier vidéo (ffprobe), ou null. */
export async function probeDuration(file: string): Promise<number | null> {
  try {
    const { stdout } = await run(ffprobeBin(), ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file], { timeout: 30_000 });
    const v = Number(String(stdout).trim());
    return Number.isFinite(v) && v > 0 ? Math.round(v * 1000) / 1000 : null;
  } catch {
    return null;
  }
}

/** Dossier de la médiathèque où ranger la vidéo : celui du premier plan, sinon la racine. */
async function targetFolder(m: Montage): Promise<string | null> {
  const first = m.spec.clips[0]?.assetId;
  if (!first) return null;
  const db = await getDb();
  const r = await db.one<{ folder_id: string | null }>(`select folder_id from atelier.assets where id = $1`, [first]);
  return r?.folder_id ?? null;
}

/**
 * Le MP4 rendu devient un média de la médiathèque (source « montage »), avec son affiche ;
 * le montage passe à « Vidéo prête ». Accepte un fichier local ou un tampon.
 */
export async function completeRender(
  montageId: string,
  state: RenderState,
  video: { file: string } | { buffer: Buffer },
  opts: { actor: string | null; poster?: { poster: Buffer; thumb: Buffer } | null; durationS?: number | null },
): Promise<Montage | null> {
  const m = await selectMontage(montageId);
  if (!m || m.render?.jobId !== state.jobId) return null;
  let file: string;
  let tmpDir: string | null = null;
  if ("file" in video) file = video.file;
  else {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "atelier-render-"));
    file = path.join(tmpDir, "out.mp4");
    await writeFile(file, video.buffer);
  }
  try {
    const data = "buffer" in video ? video.buffer : await readFile(file);
    if (data.byteLength < 1000) throw new Error("Le fichier vidéo produit est vide.");
    const durationS = (await probeDuration(file)) ?? opts.durationS ?? m.durationS;
    const poster = opts.poster ?? (await posterFromVideo(file, durationS));
    const size = FORMAT_SIZE[m.spec.format] ?? FORMAT_SIZE["9:16"];
    const safeTitle = m.title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "Montage";
    const asset = await addServerAsset(
      {
        name: `${safeTitle}.mp4`,
        mime: "video/mp4",
        data,
        folderId: await targetFolder(m),
        // La vidéo rendue appartient au client du montage.
        clientId: m.clientId,
        source: "montage",
        tags: ["montage"],
        facts: { width: size.width, height: size.height, durationS: durationS ?? null, sha256: createHash("sha256").update(data).digest("hex"), hasThumb: Boolean(poster), hasPoster: Boolean(poster) },
        thumb: poster?.thumb ?? null,
        poster: poster?.poster ?? null,
      },
      opts.actor,
    );
    const done = await patchRenderIfCurrent(montageId, state.jobId ?? "", { ...state, progress: 1, message: "Vidéo prête", error: null, finishedAt: nowIso() }, { status: "rendered", outputAssetId: asset.id });
    await logActivity({ actor: null, verb: "a terminé le rendu de", objectType: "montage", objectId: montageId, summary: m.title, meta: { assetId: asset.id, provider: state.provider }, clientId: m.clientId });
    return done;
  } finally {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Dernières lignes utiles d'un journal de rendu, pour un message d'erreur lisible. */
export function tailForError(log: string, lines = 6): string {
  const clean = log
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("@hf-progress"));
  return clean.slice(-lines).join(" · ").slice(0, 900);
}

/** Lit une ligne « @hf-progress {…} » émise par la CLI HyperFrames (sortie non interactive). */
export function parseProgressLine(line: string): { pct: number; stage: string | null } | null {
  const m = /@hf-progress\s+(\{.*\})\s*$/.exec(line);
  if (!m) return null;
  try {
    const j = JSON.parse(m[1]) as { pct?: number; code?: string; stage?: string };
    if (typeof j.pct !== "number") return null;
    return { pct: Math.max(0, Math.min(100, j.pct)), stage: j.code ?? j.stage ?? null };
  } catch {
    return null;
  }
}

/** Libellé français d'une étape de rendu HyperFrames. */
export function stageLabel(stage: string | null, pct: number): string {
  const s = (stage ?? "").toLowerCase();
  if (/compil|prepar|setup|lint|probe/.test(s)) return "Préparation de la composition…";
  if (/extract|media|download|asset/.test(s)) return "Préparation des médias…";
  if (/audio/.test(s)) return "Préparation du son…";
  if (/captur|frame|render/.test(s)) return `Rendu des images… ${Math.round(pct)} %`;
  if (/encod/.test(s)) return `Encodage… ${Math.round(pct)} %`;
  if (/mux|assembl|finaliz/.test(s)) return "Assemblage de la vidéo…";
  return `Rendu en cours… ${Math.round(pct)} %`;
}

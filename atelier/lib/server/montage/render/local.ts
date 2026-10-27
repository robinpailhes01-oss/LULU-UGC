import "server-only";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/server/env";
import { materializeForLocalRender } from "@/lib/server/montage/context";
import { completeRender, failRender, HF_VERSION, parseProgressLine, reportProgress, stageLabel, tailForError } from "@/lib/server/montage/render/common";
import type { Montage, RenderState } from "@/lib/shared/types";

/**
 * Rendu local : la CLI HyperFrames (`npx hyperframes@0.8.150 render`) tourne sur cette machine
 * (Chrome headless + FFmpeg). Pratique en développement ou sur un poste dédié ; impossible dans
 * une fonction Vercel. Le rendu tourne en arrière-plan dans le processus Node : la requête répond
 * tout de suite et la progression est enregistrée au fil de l'eau dans montages.render.
 *
 * Variables utiles : HYPERFRAMES_FFMPEG_PATH / HYPERFRAMES_FFPROBE_PATH (FFmpeg),
 * PRODUCER_HEADLESS_SHELL_PATH (Chrome headless déjà installé), ATELIER_RENDER_WORKERS.
 */

interface LocalJob {
  jobId: string;
  child: ChildProcess | null;
  cancelled: boolean;
}

const jobs: Map<string, LocalJob> = ((globalThis as unknown as { __atelierLocalRenders?: Map<string, LocalJob> }).__atelierLocalRenders ??= new Map());

const RENDER_TIMEOUT_MS = 30 * 60_000;

export function localJobAlive(montageId: string, jobId: string | null): boolean {
  const j = jobs.get(montageId);
  return Boolean(j && j.jobId === jobId && !j.cancelled);
}

export function cancelLocalRender(montageId: string): void {
  const j = jobs.get(montageId);
  if (!j) return;
  j.cancelled = true;
  j.child?.kill("SIGTERM");
  setTimeout(() => j.child?.kill("SIGKILL"), 5000).unref();
  jobs.delete(montageId);
}

export function renderDir(montageId: string, jobId: string): string {
  return path.join(env.dataDir, "renders", montageId, jobId);
}

/** Lance le rendu en arrière-plan (ne bloque pas l'appelant). */
export function startLocalRender(montage: Montage, storedHtml: string, state: RenderState, actor: string | null): void {
  const jobId = state.jobId!;
  cancelLocalRender(montage.id);
  const job: LocalJob = { jobId, child: null, cancelled: false };
  jobs.set(montage.id, job);
  void runLocal(montage, storedHtml, state, actor, job).catch(async (err) => {
    console.error("[atelier] rendu local", err);
    if (!job.cancelled) await failRender(montage.id, state, `Le rendu a échoué : ${err instanceof Error ? err.message : String(err)}`);
  }).finally(() => {
    if (jobs.get(montage.id) === job) jobs.delete(montage.id);
  });
}

async function runLocal(montage: Montage, storedHtml: string, initial: RenderState, actor: string | null, job: LocalJob): Promise<void> {
  const dir = renderDir(montage.id, job.jobId);
  await mkdir(dir, { recursive: true });
  let state: RenderState = { ...initial, message: "Préparation des médias…", progress: 0.02 };
  await reportProgress(montage, state, true);
  await materializeForLocalRender(storedHtml, dir);
  if (job.cancelled) return;

  const out = path.join(dir, "out.mp4");
  const args = ["--yes", `hyperframes@${HF_VERSION}`, "render", dir, "--output", out, "--fps", String(montage.spec.fps), "--quality", "standard", "--workers", process.env.ATELIER_RENDER_WORKERS?.trim() || "auto"];
  state = { ...state, message: "Démarrage du moteur de rendu…", progress: 0.04 };
  await reportProgress(montage, state, true);

  const log: string[] = [];
  const code = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", args, {
      cwd: dir,
      env: { ...process.env, HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_NO_UPDATE_CHECK: "1", DO_NOT_TRACK: "1", FORCE_COLOR: "0", NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    job.child = child;
    const timer = setTimeout(() => child.kill("SIGKILL"), RENDER_TIMEOUT_MS);
    timer.unref();
    let buf = "";
    const onData = (chunk: Buffer) => {
      buf += chunk.toString("utf8");
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const p = parseProgressLine(line);
        if (p) {
          // 5 % réservés à la préparation, 5 % à l'enregistrement dans la médiathèque.
          state = { ...state, progress: Math.round((0.05 + (p.pct / 100) * 0.9) * 1000) / 1000, message: stageLabel(p.stage, p.pct) };
          void reportProgress(montage, state);
        } else if (line.trim()) {
          log.push(line);
          if (log.length > 400) log.splice(0, log.length - 400);
        }
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`impossible de lancer « npx hyperframes » (${err.message}). Node.js 22+ et npm sont nécessaires sur la machine de rendu.`));
    });
    child.on("close", (c) => {
      clearTimeout(timer);
      if (buf.trim()) log.push(buf);
      resolve(c);
    });
  });
  job.child = null;
  await writeFile(path.join(dir, "render.log"), log.join("\n"), "utf8").catch(() => undefined);
  if (job.cancelled) return;

  const produced = await stat(out).then((s) => s.size > 0).catch(() => false);
  if (code !== 0 || !produced) {
    const hint = /ffmpeg/i.test(log.join("\n")) && /not found|ENOENT|introuvable/i.test(log.join("\n")) ? " (FFmpeg introuvable : installez-le ou définissez HYPERFRAMES_FFMPEG_PATH)" : "";
    await failRender(montage.id, state, `Le rendu HyperFrames a échoué${code !== null ? ` (code ${code})` : ""}${hint} : ${tailForError(log.join("\n")) || "aucun détail"}`);
    return;
  }
  state = { ...state, progress: 0.96, message: "Enregistrement dans la médiathèque…" };
  await reportProgress(montage, state, true);
  await completeRender(montage.id, state, { file: out }, { actor });
  // Les copies des médias ne servent plus ; on garde le journal du rendu.
  await rm(path.join(dir, "media"), { recursive: true, force: true }).catch(() => undefined);
  await rm(out, { force: true }).catch(() => undefined);
}

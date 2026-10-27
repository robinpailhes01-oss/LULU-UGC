import "server-only";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/server/env";
import { badRequest, HttpError, notConfigured, notFound } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import { getAssets } from "@/lib/server/repo/assets";
import { getStore } from "@/lib/server/storage";
import { listSkills } from "@/lib/server/services/skills";
import { defaultClip, refitClip, type ResolvedStyle } from "@/lib/client/montage/style";
import { computeTiming } from "@/lib/client/montage/timing";
import type { MontageCard, MontageDetail } from "@/lib/client/montage/types";
import {
  buildStored,
  durationFromHtml,
  loadAssetsFor,
  loadStyle,
  resolveForLint,
  resolveForPreview,
  resolveForRemote,
  resolveLook,
  styleGuide,
  type StyleContext,
} from "@/lib/server/montage/context";
import { atelierFinding, lintComposition, lintErrorSummary, type MontageFinding, type MontageLint } from "@/lib/server/montage/lint";
import { deleteMontageRow, insertMontage, patchMontageRow, patchRenderIfCurrent, requireMontageRow, selectMontage, selectMontages, storageKeysFor } from "@/lib/server/montage/repo";
import { failRender, nowIso } from "@/lib/server/montage/render/common";
import { cancelHeygenRender, pollHeygenRender, startHeygenRender } from "@/lib/server/montage/render/heygen";
import { cancelLocalRender, localJobAlive, startLocalRender } from "@/lib/server/montage/render/local";
import { cancelSandboxRender, pollSandboxRender, setupSandboxSnapshot, startSandboxRender, type SandboxSnapshotInfo } from "@/lib/server/montage/render/sandbox";
import { parseSpecPatch } from "@/lib/server/montage/schema";
import type { Asset, Montage, MontageSpec, RenderState } from "@/lib/shared/types";

/**
 * Montage vidéo (HyperFrames). Un montage = un titre + une spécification (plans, textes, musique,
 * transition, look, carte de fin) construite « dans un style » (skill de type montage), d'où l'on
 * génère une composition HyperFrames, prévisualisée dans le navigateur et rendue en MP4.
 * Appelé par les routes /api/montages/** et directement par l'agent.
 */

/** Style par défaut d'un nouveau montage (s'il existe parmi les skills). */
export const DEFAULT_MONTAGE_STYLE = "reel-immersion";
const MAX_HTML_BYTES = 2_000_000;

export interface CreateMontageInput {
  title: string;
  /** Spécification partielle : format, plans, textes… Les valeurs manquantes prennent les défauts. */
  spec?: Partial<MontageSpec>;
  /** Raccourci : crée un plan par média, dans l'ordre. */
  assetIds?: string[];
}

// ---------------------------------------------------------------------------------------------
// Lecture

async function toDetail(m: Montage, preloaded?: { style?: StyleContext; assets?: Map<string, Asset> }): Promise<MontageDetail> {
  const style = preloaded?.style ?? (await loadStyle(m.spec.style));
  const assets = preloaded?.assets ?? (await loadAssetsFor(m.spec));
  let html = m.html;
  let durationS = m.durationS;
  if (!m.customHtml) {
    // Toujours à jour : le style (skill) a pu être amélioré depuis le dernier enregistrement.
    const built = await buildStored(m, { style, assets });
    html = built.html;
    durationS = built.durationS;
  }
  return { ...m, html, durationS, assets: Object.fromEntries(assets), timing: computeTiming(m.spec), styleGuide: styleGuide(style, m.spec) };
}

export async function listMontages(): Promise<Montage[]> {
  return selectMontages();
}

/** Liste pour l'écran Montage : affiche (premier plan ou vidéo rendue) et nom du style. */
export async function listMontageCards(): Promise<MontageCard[]> {
  const montages = await selectMontages();
  const names = new Map<string, string>();
  try {
    for (const s of await listSkills({ kind: "montage", includeDisabled: true })) names.set(s.slug, s.name);
  } catch {
    /* skills indisponibles : on affiche le slug */
  }
  const coverIds = montages.map((m) => m.outputAssetId ?? m.spec.clips[0]?.assetId).filter((x): x is string => Boolean(x));
  const keys = await storageKeysFor(coverIds);
  return montages.map((m) => {
    const id = m.outputAssetId ?? m.spec.clips[0]?.assetId ?? null;
    const k = id ? keys.get(id.toLowerCase()) : undefined;
    let coverUrl: string | null = null;
    if (id && k) coverUrl = k.poster ? `/api/media/${id}/poster` : k.thumb || k.kind === "photo" ? `/api/media/${id}/thumb` : null;
    return { ...m, html: null, coverUrl, styleName: m.spec.style ? names.get(m.spec.style) ?? m.spec.style : null, clipCount: m.spec.clips.length };
  });
}

/** Montage complet : spécification, composition à jour, médias utilisés, déroulé et guide du style. */
export async function getMontage(id: string): Promise<MontageDetail | null> {
  const m = await selectMontage(id);
  return m ? toDetail(m) : null;
}

async function requireDetail(id: string): Promise<MontageDetail> {
  const m = await getMontage(id);
  if (!m) throw notFound("Montage");
  return m;
}

// ---------------------------------------------------------------------------------------------
// Création et modification

/** Valeurs par défaut d'une spécification, tirées du style. */
function specFromStyle(style: ResolvedStyle, slug: string | null): MontageSpec {
  return {
    format: style.format,
    fps: style.fps,
    clips: [],
    texts: [],
    transition: style.transition.type,
    transitionS: style.transition.type === "cut" ? 0 : style.transition.durationS,
    look: null,
    lookId: null,
    musicAssetId: null,
    musicVolume: style.music.volume,
    endCard: style.endCard ? { ...style.endCard } : null,
    style: slug,
  };
}

async function requireStyle(slug: string): Promise<StyleContext> {
  const ctx = await loadStyle(slug);
  if (ctx.missing) {
    let available = "";
    try {
      available = (await listSkills({ kind: "montage" })).map((s) => `${s.slug} (${s.name})`).join(", ");
    } catch {
      /* liste indisponible */
    }
    throw badRequest(`Le style de montage « ${slug} » est introuvable.${available ? ` Styles disponibles : ${available}.` : ""}`);
  }
  return ctx;
}

export async function createMontage(input: CreateMontageInput, actor: string | null): Promise<MontageDetail> {
  const title = (input.title ?? "").trim() || "Nouveau montage";
  const rawStyle = input.spec && Object.prototype.hasOwnProperty.call(input.spec, "style") ? input.spec.style : undefined;
  let slug: string | null;
  if (rawStyle !== undefined) slug = rawStyle ? String(rawStyle).trim() : null;
  else slug = (await loadStyle(DEFAULT_MONTAGE_STYLE)).missing ? null : DEFAULT_MONTAGE_STYLE;
  const styleCtx = slug ? await requireStyle(slug) : await loadStyle(null);
  if (styleCtx.skill) slug = styleCtx.skill.slug;
  const style = styleCtx.style;

  const patch = parseSpecPatch(input.spec ?? {}, { textPlacement: style.textPlacement });
  const spec: MontageSpec = { ...specFromStyle(style, slug), ...patch, style: slug };

  if (!patch.clips && input.assetIds?.length) {
    const assets = await getAssets([...new Set(input.assetIds.map((s) => s.toLowerCase()))]);
    const clips = [];
    for (const a of assets) {
      if (a.kind === "audio") {
        if (!spec.musicAssetId && patch.musicAssetId === undefined) spec.musicAssetId = a.id;
        continue;
      }
      clips.push(defaultClip(a, style, clips.length));
    }
    spec.clips = clips;
  }

  if (patch.look === undefined) {
    const look = patch.lookId ? await resolveLook({ id: patch.lookId }) : style.look ? await resolveLook({ name: style.look }) : null;
    if (look) {
      spec.look = look.params;
      spec.lookId = look.id;
    }
  }

  const built = await buildStored({ title, spec }, { style: styleCtx });
  const row = await insertMontage({ title, spec, html: built.html, customHtml: false, durationS: built.durationS }, actor);
  await logActivity({ actor, verb: "a créé le montage", objectType: "montage", objectId: row.id, summary: title, meta: { style: slug, clips: spec.clips.length } });
  return toDetail(row, { style: styleCtx, assets: built.assets });
}

/** Met à jour le titre, la spécification (fusion superficielle) ou la composition HTML personnalisée. */
export async function updateMontage(id: string, patch: { title?: string; spec?: Partial<MontageSpec>; html?: string | null }, actor: string | null): Promise<MontageDetail> {
  void actor;
  const cur = await requireMontageRow(id);
  const title = patch.title !== undefined ? patch.title.trim() : cur.title;
  if (!title) throw badRequest("Le montage doit avoir un titre.");

  let spec = cur.spec;
  let specChanged = false;
  if (patch.spec) {
    const target = patch.spec.style !== undefined ? patch.spec.style : cur.spec.style;
    const placement = (await loadStyle(target)).style.textPlacement;
    const p = parseSpecPatch(patch.spec, { textPlacement: placement });
    if (p.lookId !== undefined && p.look === undefined) {
      p.look = p.lookId ? (await resolveLook({ id: p.lookId }))?.params ?? cur.spec.look : null;
    }
    spec = { ...cur.spec, ...p };
    specChanged = JSON.stringify(spec) !== JSON.stringify(cur.spec);
  }

  if (typeof patch.html === "string" && Buffer.byteLength(patch.html, "utf8") > MAX_HTML_BYTES) throw badRequest("Composition trop volumineuse (2 Mo maximum).");
  const customHtml = patch.html === undefined ? cur.customHtml : patch.html !== null;
  let html: string | null;
  let durationS: number | null;
  let styleCtx: StyleContext | undefined;
  let assets: Map<string, Asset> | undefined;
  if (customHtml) {
    html = typeof patch.html === "string" ? patch.html : cur.html;
    durationS = html ? durationFromHtml(html) : null;
  } else {
    const built = await buildStored({ title, spec });
    html = built.html;
    durationS = built.durationS;
    styleCtx = built.style;
    assets = built.assets;
  }
  const htmlChanged = patch.html !== undefined && (html !== cur.html || customHtml !== cur.customHtml);
  const status = (specChanged || htmlChanged) && (cur.status === "rendered" || cur.status === "failed") ? "draft" : undefined;
  const row = await patchMontageRow(id, { title, spec, html, customHtml, durationS, ...(status ? { status } : {}) });
  if (patch.title !== undefined && title !== cur.title) await logActivity({ actor, verb: "a renommé le montage", objectType: "montage", objectId: id, summary: `${cur.title} → ${title}` });
  if (patch.html !== undefined && customHtml !== cur.customHtml)
    await logActivity({ actor, verb: customHtml ? "a personnalisé le code du montage" : "a rétabli la composition générée de", objectType: "montage", objectId: id, summary: title });
  return toDetail(row, { style: styleCtx, assets });
}

/**
 * Applique (ou réapplique) un style : format, cadence, transition, rythme des plans, look,
 * volume de la musique et carte de fin reprennent les valeurs du style. Plans, textes et musique
 * choisis sont conservés.
 */
export async function applyMontageStyle(id: string, slug: string | null, actor: string | null): Promise<MontageDetail> {
  const cur = await requireMontageRow(id);
  const ctx = slug ? await requireStyle(slug) : await loadStyle(null);
  const s = ctx.style;
  const realSlug = ctx.skill?.slug ?? null;
  const assets = await loadAssetsFor(cur.spec);
  const base = specFromStyle(s, realSlug);
  const look = s.look ? await resolveLook({ name: s.look }) : null;
  const spec: MontageSpec = {
    ...cur.spec,
    format: base.format,
    fps: base.fps,
    transition: base.transition,
    transitionS: base.transitionS,
    musicVolume: base.musicVolume,
    // Le style ne propose pas de carte de fin : on garde celle du montage, s'il en a une.
    endCard: s.endCard ? { ...s.endCard } : cur.spec.endCard,
    look: look ? look.params : s.look ? cur.spec.look : null,
    lookId: look ? look.id : s.look ? cur.spec.lookId : null,
    clips: cur.spec.clips.map((c) => refitClip(c, assets.get(c.assetId.toLowerCase()), s)),
    style: realSlug,
  };
  const detail = await updateMontage(id, { spec }, actor);
  await logActivity({ actor, verb: "a appliqué un style au montage", objectType: "montage", objectId: id, summary: `${cur.title} — ${ctx.skill?.name ?? "sans style"}` });
  return detail;
}

/** Copie d'un montage (spécification et code personnalisé), sans son rendu. */
export async function duplicateMontage(id: string, actor: string | null): Promise<MontageDetail> {
  const cur = await requireMontageRow(id);
  const title = `${cur.title} (copie)`;
  const row = await insertMontage({ title, spec: cur.spec, html: cur.html, customHtml: cur.customHtml, durationS: cur.durationS }, actor);
  await logActivity({ actor, verb: "a dupliqué le montage", objectType: "montage", objectId: row.id, summary: cur.title });
  return toDetail(row);
}

export async function deleteMontage(id: string, actor: string | null): Promise<void> {
  const cur = await selectMontage(id);
  if (!cur) throw notFound("Montage");
  if (cur.status === "rendering") await cancelProvider(cur).catch(() => undefined);
  await deleteMontageRow(id);
  await logActivity({ actor, verb: "a supprimé le montage", objectType: "montage", objectId: id, summary: cur.title });
}

// ---------------------------------------------------------------------------------------------
// Composition, aperçu et vérification

async function storedHtml(m: Montage, override?: { spec?: unknown; html?: string | null }): Promise<{ html: string; findings: MontageFinding[] }> {
  if (typeof override?.html === "string") return { html: override.html, findings: [] };
  const custom = override?.html === null ? false : m.customHtml;
  if (custom && m.html) return { html: m.html, findings: [] };
  let spec = m.spec;
  if (override?.spec) {
    const placement = (await loadStyle(m.spec.style)).style.textPlacement;
    spec = { ...m.spec, ...parseSpecPatch(override.spec, { textPlacement: placement }) };
  }
  const built = await buildStored({ title: m.title, spec });
  return { html: built.html, findings: built.findings };
}

/** Composition HyperFrames (HTML complet) prête à prévisualiser ou rendre. */
export async function compositionHtml(id: string, opts?: { forRender?: boolean }): Promise<string> {
  const m = await requireMontageRow(id);
  const { html } = await storedHtml(m);
  return opts?.forRender ? resolveForRemote(html) : resolveForPreview(html, env.appUrl, env.appUrl);
}

/**
 * Aperçu pour le lecteur du navigateur (liens de médias signés sur l'origine de la requête).
 * `override` permet de prévisualiser une modification pas encore enregistrée.
 */
export async function previewComposition(id: string, origin: string, override?: { spec?: unknown; html?: string | null }): Promise<string> {
  const m = await requireMontageRow(id);
  const { html } = await storedHtml(m, override);
  return resolveForPreview(html, origin, env.appUrl);
}

/** Vérification HyperFrames (lint) + remarques d'Atelier, sur la composition enregistrée ou proposée. */
export async function lintMontage(id: string, override?: { spec?: unknown; html?: string | null }): Promise<MontageLint> {
  const m = await requireMontageRow(id);
  return lintStored(await storedHtml(m, override));
}

async function lintStored(s: { html: string; findings: MontageFinding[] }): Promise<MontageLint> {
  const { html, missing } = await resolveForLint(s.html);
  const extra = [...s.findings];
  for (const r of missing) {
    if (!extra.some((f) => f.code === "atelier_missing_media")) extra.push(atelierFinding("error", "atelier_missing_media", `Un média référencé est introuvable (atelier-media://${r.assetId}/${r.variant}).`));
  }
  return lintComposition(html, extra);
}

// ---------------------------------------------------------------------------------------------
// Rendu

const PROVIDER_LABEL: Record<RenderState["provider"], string> = { local: "local", sandbox: "Sandbox", heygen: "HeyGen", none: "aucun" };

/** Lance le rendu MP4 ; renvoie l'état initial. Le résultat devient un média (source « montage »). */
export async function startRender(id: string, actor: string | null): Promise<RenderState> {
  const m = await requireMontageRow(id);
  if (m.status === "rendering" && m.render && !m.render.finishedAt) {
    const alive = m.render.provider !== "local" || localJobAlive(m.id, m.render.jobId);
    if (alive) return m.render;
  }
  const provider = env.hyperframes.render;
  if (provider === "none") {
    throw notConfigured(
      "Aucun moteur de rendu configuré. Choisissez HYPERFRAMES_RENDER=sandbox (Vercel Sandbox, recommandé en ligne), heygen (HEYGEN_API_KEY) ou local (Node 22, Chrome et FFmpeg sur la machine).",
    );
  }
  if (!m.customHtml && m.spec.clips.length === 0) throw badRequest("Ajoutez au moins un plan avant de lancer le rendu.");
  const stored = await storedHtml(m);
  const lint = await lintStored(stored);
  if (!lint.ok) throw new HttpError(422, "lint_errors", lintErrorSummary(lint));
  if (provider !== "local" && getStore().kind !== "s3") {
    throw notConfigured(`Le rendu ${PROVIDER_LABEL[provider]} télécharge les médias par Internet : configurez un stockage S3/R2 (S3_BUCKET, S3_ACCESS_KEY_ID…). Avec le stockage local, utilisez HYPERFRAMES_RENDER=local.`);
  }

  const startedAt = nowIso();
  let state: RenderState;
  if (provider === "local") {
    state = { provider, jobId: randomUUID(), progress: 0, message: "Préparation…", error: null, startedAt, finishedAt: null };
    const row = await patchMontageRow(id, { status: "rendering", render: state });
    startLocalRender(row, stored.html, state, actor);
  } else {
    const remote = await resolveForRemote(stored.html);
    const jobKey = randomUUID();
    const jobId = provider === "sandbox" ? await startSandboxRender(m, remote, jobKey) : await startHeygenRender(m, remote, jobKey);
    state = { provider, jobId, progress: 0.02, message: provider === "sandbox" ? "Démarrage de la sandbox de rendu…" : "Envoyé à HeyGen…", error: null, startedAt, finishedAt: null };
    await patchMontageRow(id, { status: "rendering", render: state });
  }
  await logActivity({ actor, verb: "a lancé le rendu de", objectType: "montage", objectId: id, summary: m.title, meta: { provider } });
  return state;
}

/** État à jour du rendu (interroge le fournisseur si nécessaire). */
export async function refreshRender(id: string): Promise<Montage> {
  const m = await requireMontageRow(id);
  const r = m.render;
  if (m.status !== "rendering" || !r || r.finishedAt) return m;
  if (r.provider === "local") {
    const age = Date.now() - new Date(r.startedAt).getTime();
    if (!localJobAlive(m.id, r.jobId) && age > 20_000) {
      return (await failRender(m.id, r, "Le rendu a été interrompu (le serveur a redémarré). Relancez-le.")) ?? m;
    }
    return m;
  }
  if (r.provider === "sandbox") return pollSandboxRender(m);
  if (r.provider === "heygen") return pollHeygenRender(m);
  return m;
}

async function cancelProvider(m: Montage): Promise<void> {
  if (!m.render) return;
  if (m.render.provider === "local") cancelLocalRender(m.id);
  else if (m.render.provider === "sandbox") await cancelSandboxRender(m);
  else if (m.render.provider === "heygen") await cancelHeygenRender(m);
}

/** Annule le rendu en cours. */
export async function cancelRender(id: string, actor: string | null): Promise<Montage> {
  const m = await requireMontageRow(id);
  if (m.status !== "rendering" || !m.render) return m;
  await cancelProvider(m).catch((err) => console.error("[atelier] annulation du rendu", err));
  const next = await patchRenderIfCurrent(m.id, m.render.jobId ?? "", { ...m.render, message: "Rendu annulé", error: "Rendu annulé.", finishedAt: nowIso() }, { status: "draft" });
  await logActivity({ actor, verb: "a annulé le rendu de", objectType: "montage", objectId: id, summary: m.title });
  return next ?? (await requireMontageRow(id));
}

/** Prépare l'instantané de la Vercel Sandbox (une fois, puis à chaque nouvelle version de HyperFrames). */
export async function setupRenderSandbox(actor: string | null): Promise<SandboxSnapshotInfo> {
  if (env.hyperframes.render !== "sandbox") throw badRequest("La préparation concerne seulement le rendu Sandbox (HYPERFRAMES_RENDER=sandbox).");
  const info = await setupSandboxSnapshot();
  await logActivity({ actor, verb: "a préparé le rendu vidéo", objectType: "system", summary: `Instantané Sandbox ${info.snapshotId} (HyperFrames ${info.hyperframesVersion})` });
  return info;
}

export { requireDetail as requireMontage };

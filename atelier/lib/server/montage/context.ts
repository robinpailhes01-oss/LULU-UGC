import "server-only";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { getAssets } from "@/lib/server/repo/assets";
import { getStore, extFromName } from "@/lib/server/storage";
import { blobPath } from "@/lib/server/storage/local";
import { getMontageStyle } from "@/lib/server/services/skills";
import { findLookByName, getLook } from "@/lib/server/services/looks";
import { resolveStyle, styleSummary, type ResolvedStyle, type StyleIssue } from "@/lib/client/montage/style";
import { assignRoles, computeTiming } from "@/lib/client/montage/timing";
import type { StyleGuide } from "@/lib/client/montage/types";
import { buildComposition, type BuildResult } from "@/lib/server/montage/compose";
import { atelierFinding, type MontageFinding } from "@/lib/server/montage/lint";
import { collectMediaRefs, mediaRef, refKey, resolveMediaRefs, type MediaRefUse, type MediaVariant } from "@/lib/server/montage/media";
import { storageKeysFor } from "@/lib/server/montage/repo";
import type { Asset, Look, Montage, MontageSpec, Skill } from "@/lib/shared/types";

/**
 * Tout ce qu'il faut pour transformer un montage enregistré en composition : style (skill),
 * modèle éventuel, médias, look, et résolution des références de médias selon l'usage.
 */

export interface StyleContext {
  style: ResolvedStyle;
  issues: StyleIssue[];
  skill: Skill | null;
  template: string | null;
  /** Un slug était demandé mais le style n'existe pas (ou plus). */
  missing: boolean;
}

/** Style d'un montage (skill « montage »), résolu avec ses valeurs de repli. */
export async function loadStyle(slug: string | null | undefined): Promise<StyleContext> {
  if (!slug) return { ...resolveStyle(null), skill: null, template: null, missing: false };
  let found: Awaited<ReturnType<typeof getMontageStyle>> = null;
  try {
    found = await getMontageStyle(slug);
  } catch (err) {
    console.error("[atelier] style de montage", err);
  }
  if (!found) {
    const r = resolveStyle(null, { slug });
    return { ...r, skill: null, template: null, missing: true };
  }
  const r = resolveStyle(found.data as Record<string, unknown>, { slug: found.skill.slug, name: found.skill.name });
  const template = typeof found.skill.files?.["template.html"] === "string" ? found.skill.files["template.html"] : null;
  return { ...r, skill: found.skill, template, missing: false };
}

export function styleFindings(ctx: StyleContext, slug: string | null): MontageFinding[] {
  const out: MontageFinding[] = [];
  if (ctx.missing && slug) out.push(atelierFinding("warning", "atelier_style_missing", `Le style « ${slug} » est introuvable (supprimé ou désactivé) : les valeurs par défaut sont utilisées.`));
  for (const i of ctx.issues) out.push(atelierFinding("warning", "atelier_style_invalid_field", i.message));
  return out;
}

/** Look de retouche par nom ou par identifiant (le service des looks peut ne pas être prêt). */
export async function resolveLook(ref: { name?: string | null; id?: string | null }): Promise<Look | null> {
  try {
    if (ref.id) {
      const l = await getLook(ref.id);
      if (l) return l;
    }
    if (ref.name) return await findLookByName(ref.name);
  } catch {
    // Service des looks indisponible : le montage reste sans look.
  }
  return null;
}

/** Médias utilisés par une spécification (plans + musique), y compris en corbeille. */
export async function loadAssetsFor(spec: Pick<MontageSpec, "clips" | "musicAssetId">): Promise<Map<string, Asset>> {
  const ids = [...new Set([...spec.clips.map((c) => c.assetId), ...(spec.musicAssetId ? [spec.musicAssetId] : [])].map((s) => s.toLowerCase()))];
  const list = await getAssets(ids);
  return new Map(list.map((a) => [a.id.toLowerCase(), a]));
}

export interface Built extends BuildResult {
  style: StyleContext;
  assets: Map<string, Asset>;
}

/** Composition « enregistrée » : médias désignés par des références stables atelier-media://. */
export async function buildStored(m: Pick<Montage, "title" | "spec">, preloaded?: { style?: StyleContext; assets?: Map<string, Asset> }): Promise<Built> {
  const style = preloaded?.style ?? (await loadStyle(m.spec.style));
  const assets = preloaded?.assets ?? (await loadAssetsFor(m.spec));
  const result = buildComposition(m.spec, assets, (a, v) => mediaRef(a.id, v), { style: style.style, title: m.title, template: style.template });
  return { ...result, findings: [...styleFindings(style, m.spec.style), ...result.findings], style, assets };
}

/** Durée déclarée par la racine d'une composition éditée à la main. */
export function durationFromHtml(html: string): number | null {
  const root = /<[^>]+data-composition-id[^>]*>/i.exec(html)?.[0];
  const m = root ? /data-duration\s*=\s*["']?([\d.]+)/i.exec(root) : null;
  const v = m ? Number(m[1]) : NaN;
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Guide du style : ce que le style attend, et quels plans remplissent chaque rôle. */
export function styleGuide(ctx: StyleContext, spec: MontageSpec): StyleGuide | null {
  if (!spec.style) return null;
  const s = ctx.style;
  return {
    slug: spec.style,
    found: !ctx.missing,
    name: ctx.skill?.name ?? spec.style,
    description: ctx.skill?.description ?? "",
    summary: styleSummary(s),
    pacing: s.pacing,
    targetDurationS: s.targetDurationS,
    textPlacement: s.textPlacement,
    textAnimation: s.textAnimation,
    captions: s.captions,
    musicMood: s.music.mood,
    look: s.look,
    structure: assignRoles(s.structure, computeTiming(spec)),
    issues: ctx.issues,
    hasTemplate: Boolean(ctx.template),
  };
}

// ---------------------------------------------------------------------------------------------
// Résolution des médias selon l'usage

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/aac": "aac",
};

interface ResolvedKey {
  key: string;
  ext: string;
}

async function keysForRefs(refs: MediaRefUse[]): Promise<Map<string, ResolvedKey>> {
  const keys = await storageKeysFor([...new Set(refs.map((r) => r.assetId))]);
  const out = new Map<string, ResolvedKey>();
  for (const r of refs) {
    const k = keys.get(r.assetId);
    if (!k) continue;
    let key: string | null;
    if (r.variant === "original") key = k.original;
    else if (r.variant === "thumb") key = k.thumb ?? (k.kind === "photo" ? k.original : k.poster);
    else key = k.poster ?? k.thumb;
    if (!key) continue;
    const ext = extFromName(key) || (key === k.original ? MIME_EXT[k.mime] ?? "" : "webp");
    out.set(refKey(r), { key, ext });
  }
  return out;
}

const localName = (r: MediaRefUse, ext: string) => `media/${r.assetId}-${r.variant}${ext ? `.${ext}` : ""}`;

/**
 * Aperçu dans le navigateur : liens signés absolus (le lecteur est un iframe isolé, sans cookies).
 * En stockage local, le lien vise /api/blob sur l'origine de la requête plutôt qu'ATELIER_APP_URL.
 */
export async function resolveForPreview(html: string, origin: string, appUrl: string): Promise<string> {
  const refs = collectMediaRefs(html);
  if (refs.length === 0) return html;
  const keys = await keysForRefs(refs);
  const store = getStore();
  const urls = new Map<string, string>();
  for (const r of refs) {
    const k = keys.get(refKey(r));
    if (!k) continue;
    let url = await store.presignGet(k.key, { ttlS: 6 * 3600, stable: true });
    if (store.kind === "local" && url.startsWith(appUrl)) url = origin.replace(/\/$/, "") + url.slice(appUrl.length);
    urls.set(refKey(r), url);
  }
  return resolveMediaRefs(html, urls);
}

/** Rendu distant (Sandbox, HeyGen) : liens HTTPS signés valables 48 h (stockage S3/R2). */
export async function resolveForRemote(html: string): Promise<string> {
  const refs = collectMediaRefs(html);
  const keys = await keysForRefs(refs);
  const store = getStore();
  const urls = new Map<string, string>();
  for (const r of refs) {
    const k = keys.get(refKey(r));
    if (k) urls.set(refKey(r), await store.presignGet(k.key, { ttlS: 48 * 3600 }));
  }
  return resolveMediaRefs(html, urls);
}

/** Vérification : chemins relatifs (comme dans le dossier de rendu local), sans accès disque. */
export async function resolveForLint(html: string): Promise<{ html: string; missing: MediaRefUse[] }> {
  const refs = collectMediaRefs(html);
  const keys = await keysForRefs(refs);
  const urls = new Map<string, string>();
  const missing: MediaRefUse[] = [];
  for (const r of refs) {
    const k = keys.get(refKey(r));
    if (k) urls.set(refKey(r), localName(r, k.ext));
    else missing.push(r);
  }
  return { html: resolveMediaRefs(html, urls), missing };
}

/** Rendu local : copie chaque média dans <dossier>/media/ et le référence en chemin relatif. */
export async function materializeForLocalRender(html: string, workDir: string): Promise<string> {
  const refs = collectMediaRefs(html);
  const keys = await keysForRefs(refs);
  const store = getStore();
  await mkdir(path.join(workDir, "media"), { recursive: true });
  const urls = new Map<string, string>();
  for (const r of refs) {
    const k = keys.get(refKey(r));
    if (!k) continue;
    const rel = localName(r, k.ext);
    const dest = path.join(workDir, rel);
    if (store.kind === "local") {
      await copyFile(blobPath(k.key), dest);
    } else {
      const res = await fetch(await store.presignGet(k.key, { ttlS: 3600 }));
      if (!res.ok || !res.body) throw new Error(`Téléchargement du média impossible (${res.status}).`);
      await pipeline(Readable.fromWeb(res.body as never), createWriteStream(dest));
    }
    urls.set(refKey(r), rel);
  }
  const out = resolveMediaRefs(html, urls);
  await writeFile(path.join(workDir, "index.html"), out, "utf8");
  return out;
}

export type { MediaVariant };

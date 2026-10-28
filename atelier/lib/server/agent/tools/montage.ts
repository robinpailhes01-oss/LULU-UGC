import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAssets } from "@/lib/server/agent/tools/common";
import { defineTool, plural, Uuid } from "@/lib/server/agent/tool-kit";
import { getAssets } from "@/lib/server/repo/assets";
import { findLookByName, getLook } from "@/lib/server/services/looks";
import { createMontage, getMontage, listMontages, refreshRender, startRender, updateMontage } from "@/lib/server/services/montages";
import { getMontageStyle, listSkills } from "@/lib/server/services/skills";
import type { Asset, Montage, MontageClip, MontageSpec, MontageStyleData, MontageText } from "@/lib/shared/types";

/**
 * Outils de montage (HyperFrames). Les styles de montage sont des skills de type « montage » :
 * leur data.json (MontageStyleData) donne rythme, durées, typographies, structure plan par plan.
 * L'agent lit le style (read_skill), associe les plans aux rôles de la structure grâce aux
 * analyses IA des médias, puis crée le montage avec style = slug.
 */

const DEFAULT_STYLE = "reel-immersion";

const Format = z.enum(["9:16", "4:5", "1:1", "16:9"]);
const TextIn = z.object({
  text: z.string().min(1).max(160),
  start_s: z.number().min(0).max(600),
  end_s: z.number().min(0).max(600),
  position: z.enum(["top", "center", "bottom"]).optional(),
  style: z.enum(["hook", "title", "caption", "label"]).optional(),
});
const ClipIn = z.object({
  asset_id: Uuid,
  in_s: z.number().min(0).optional().describe("Début dans la vidéo source (s)."),
  out_s: z.number().min(0).optional().describe("Fin dans la vidéo source, ou durée d'affichage d'une photo (s)."),
  motion: z.enum(["none", "zoom-in", "zoom-out", "pan-left", "pan-right"]).optional().describe("Mouvement lent sur une photo."),
});
const EndCard = z.object({ title: z.string().min(1).max(80), subtitle: z.string().max(120).nullable().optional(), duration_s: z.number().min(0.5).max(6).optional() });

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

async function resolveStyle(ref: string | null | undefined): Promise<{ slug: string; name: string; data: MontageStyleData }> {
  const wanted = ref?.trim() || DEFAULT_STYLE;
  const style = await getMontageStyle(wanted);
  if (style) return { slug: style.skill.slug, name: style.skill.name, data: style.data };
  const styles = (await listSkills({ kind: "montage" })).map((s) => `${s.slug} (${s.name})`);
  throw new Error(`Style de montage « ${wanted} » introuvable.${styles.length ? ` Styles disponibles : ${styles.join(", ")}.` : ""}`);
}

async function resolveLookRef(ref: string): Promise<{ id: string; name: string; params: MontageSpec["look"] }> {
  const look = isUuid(ref) ? await getLook(ref) : await findLookByName(ref);
  if (!look) throw new Error(`Look « ${ref} » introuvable (list_looks).`);
  return { id: look.id, name: look.name, params: look.params };
}

function toTexts(texts: z.infer<typeof TextIn>[] | undefined, hook: string | undefined, style: MontageStyleData): MontageText[] | undefined {
  const out: MontageText[] = [];
  if (hook?.trim()) out.push({ id: randomUUID(), startS: 0, endS: 2.5, text: hook.trim(), position: style.textPlacement ?? "center", style: "hook" });
  for (const t of texts ?? []) {
    if (t.end_s <= t.start_s) throw new Error(`Texte « ${t.text} » : end_s doit être après start_s.`);
    out.push({ id: randomUUID(), startS: t.start_s, endS: t.end_s, text: t.text, position: t.position ?? style.textPlacement ?? "bottom", style: t.style ?? "caption" });
  }
  return out.length || texts ? out : undefined;
}

/** Plans explicites (durées) à partir des médias, avec les valeurs par défaut du style. */
function toClips(clips: z.infer<typeof ClipIn>[], assets: Map<string, Asset>, style: MontageStyleData): MontageClip[] {
  return clips.map((c) => {
    const a = assets.get(c.asset_id);
    if (!a) throw new Error(`Média ${c.asset_id} introuvable.`);
    if (a.kind === "audio") throw new Error(`« ${a.name} » est un audio : utilise music_asset_id.`);
    if (a.kind === "photo") {
      const d = c.out_s ?? style.photoDurationS ?? 2.5;
      return { id: randomUUID(), assetId: a.id, inS: 0, outS: d, motion: c.motion ?? "zoom-in" };
    }
    const inS = c.in_s ?? 0;
    const max = a.durationS ?? inS + (style.videoClipS?.max ?? 3);
    const outS = Math.min(max, c.out_s ?? inS + (style.videoClipS?.max ?? 3));
    if (outS <= inS) throw new Error(`« ${a.name} » : out_s doit être après in_s (durée ${a.durationS ?? "?"} s).`);
    return { id: randomUUID(), assetId: a.id, inS, outS, muted: true };
  });
}

async function summarizeMontage(m: Montage) {
  const assets = new Map((await getAssets([...new Set(m.spec.clips.map((c) => c.assetId).concat(m.spec.musicAssetId ? [m.spec.musicAssetId] : []))])).map((a) => [a.id, a]));
  return {
    id: m.id,
    title: m.title,
    status: m.status,
    style: m.spec.style,
    format: m.spec.format,
    duration_s: m.durationS ?? Math.round(m.spec.clips.reduce((s, c) => s + (c.outS - c.inS), 0) * 10) / 10,
    clips: m.spec.clips.map((c, n) => ({ n: n + 1, asset_id: c.assetId, name: assets.get(c.assetId)?.name ?? "?", title: assets.get(c.assetId)?.ai?.title ?? undefined, in_s: c.inS, out_s: c.outS, motion: c.motion })),
    texts: m.spec.texts.map((t) => ({ text: t.text, start_s: t.startS, end_s: t.endS, style: t.style, position: t.position })),
    transition: `${m.spec.transition} ${m.spec.transitionS}s`,
    look_id: m.spec.lookId,
    music: m.spec.musicAssetId ? { id: m.spec.musicAssetId, name: assets.get(m.spec.musicAssetId)?.name ?? "?", volume: m.spec.musicVolume } : null,
    end_card: m.spec.endCard,
    custom_html: m.customHtml || undefined,
    render: m.render ? { provider: m.render.provider, progress: m.render.progress, message: m.render.message, error: m.render.error, finished_at: m.render.finishedAt } : null,
    output_asset_id: m.outputAssetId,
    link: `/montage/${m.id}`,
  };
}

export const listMontagesTool = defineTool({
  name: "list_montages",
  label: "Lecture des montages",
  description: "Liste les montages (titre, statut, style, format, durée, vidéo rendue). À appeler pour retrouver un montage cité par son titre.",
  input: z.object({ limit: z.number().int().min(1).max(50).optional() }),
  run: async (i) => {
    const all = await listMontages();
    const items = all.slice(0, i.limit ?? 20).map((m) => ({ id: m.id, title: m.title, status: m.status, style: m.spec.style, format: m.spec.format, clips: m.spec.clips.length, duration_s: m.durationS, output_asset_id: m.outputAssetId, updated: m.updatedAt.slice(0, 10), link: `/montage/${m.id}` }));
    return { summary: plural(all.length, "montage"), data: { total: all.length, items } };
  },
});

export const getMontageTool = defineTool({
  name: "get_montage",
  label: "Lecture d'un montage",
  description: "Renvoie le détail d'un montage : plans (médias, durées), textes, transition, look, musique, carton de fin, état du rendu.",
  input: z.object({ id: Uuid }),
  run: async (i) => {
    const m = await getMontage(i.id);
    if (!m) throw new Error("Montage introuvable (list_montages).");
    return { summary: `Montage « ${m.title} »`, data: await summarizeMontage(m), assetIds: m.spec.clips.slice(0, 12).map((c) => c.assetId) };
  },
});

export const createMontageTool = defineTool({
  name: "create_montage",
  label: "Création d'un montage",
  description:
    "Crée un montage vidéo (brouillon) à partir de médias, dans un style de montage (skill de type montage, reel-immersion par défaut). " +
    "AVANT : lis le style (read_skill) et la voix (voix-june) ; choisis et ordonne les plans selon la structure du style (rôles : accroche, détail, moment fort…) en t'appuyant sur les analyses IA des médias. " +
    "asset_ids suffit (durées du style) ; clips permet de préciser les durées et coupes. Le style fournit format, rythme, typographies et couleurs ; les champs donnés ici priment.",
  input: z.object({
    title: z.string().min(1).max(120),
    asset_ids: z.array(Uuid).min(1).max(60).describe("Médias dans l'ordre du montage."),
    style: z.string().max(80).optional().describe("Slug ou nom du style de montage (skill). Par défaut reel-immersion."),
    format: Format.optional(),
    clips: z.array(ClipIn).max(60).optional().describe("Facultatif : plans détaillés (remplacent asset_ids pour l'ordre et les durées)."),
    hook: z.string().max(80).optional().describe("Accroche affichée dans la première seconde, dans la voix du client (skill voix du client, sinon celle de l'agence)."),
    texts: z.array(TextIn).max(30).optional().describe("Autres textes à l'écran."),
    look: z.string().max(80).optional().describe("Look appliqué à tous les plans (nom ou id)."),
    music_asset_id: Uuid.optional().describe("Fichier audio de la médiathèque."),
    end_card: EndCard.optional(),
  }),
  run: async (i, ctx) => {
    const style = await resolveStyle(i.style);
    const ids = i.clips?.length ? i.clips.map((c) => c.asset_id) : i.asset_ids;
    const assets = await requireAssets([...ids, ...(i.music_asset_id ? [i.music_asset_id] : [])]);
    const byId = new Map(assets.map((a) => [a.id, a]));
    const visual = ids.filter((id) => byId.get(id)?.kind !== "audio");
    if (visual.length === 0) throw new Error("Il faut au moins une photo ou une vidéo.");
    if (i.music_asset_id && byId.get(i.music_asset_id)?.kind !== "audio") throw new Error("music_asset_id doit désigner un fichier audio.");
    const look = i.look ? await resolveLookRef(i.look) : null;
    const spec: Partial<MontageSpec> = { style: style.slug };
    if (i.format) spec.format = i.format;
    const texts = toTexts(i.texts, i.hook, style.data);
    if (texts) spec.texts = texts;
    if (look) Object.assign(spec, { lookId: look.id, look: look.params });
    if (i.music_asset_id) spec.musicAssetId = i.music_asset_id;
    if (i.end_card) spec.endCard = { title: i.end_card.title, subtitle: i.end_card.subtitle ?? null, durationS: i.end_card.duration_s ?? style.data.endCard?.durationS ?? 2 };
    const explicit = i.clips?.some((c) => c.in_s !== undefined || c.out_s !== undefined || c.motion !== undefined);
    if (explicit && i.clips) spec.clips = toClips(i.clips, byId, style.data);
    const m = await createMontage({ title: i.title, spec, assetIds: explicit ? undefined : visual }, ctx.actor);
    return {
      summary: `Montage « ${m.title} » créé (${plural(m.spec.clips.length, "plan")}, style ${style.name})`,
      data: await summarizeMontage(m),
      refresh: ["montages"],
      assetIds: visual.slice(0, 12),
    };
  },
});

export const updateMontageTool = defineTool({
  name: "update_montage",
  label: "Modification d'un montage",
  description:
    "Modifie un montage : titre, style, format, plans (asset_ids ou clips : remplacent tous les plans), textes (texts et hook remplacent tous les textes), transition, look, musique, carton de fin. Les champs absents ne changent pas.",
  input: z.object({
    id: Uuid,
    title: z.string().min(1).max(120).optional(),
    style: z.string().max(80).optional(),
    format: Format.optional(),
    asset_ids: z.array(Uuid).min(1).max(60).optional(),
    clips: z.array(ClipIn).min(1).max(60).optional(),
    hook: z.string().max(80).optional(),
    texts: z.array(TextIn).max(30).optional(),
    transition: z.enum(["cut", "fade", "slide", "zoom"]).optional(),
    transition_s: z.number().min(0).max(2).optional(),
    look: z.string().max(80).nullable().optional().describe("Nom ou id d'un look ; null = aucun look."),
    music_asset_id: Uuid.nullable().optional(),
    music_volume: z.number().min(0).max(1).optional(),
    end_card: EndCard.nullable().optional(),
  }),
  run: async (i, ctx) => {
    const cur = await getMontage(i.id);
    if (!cur) throw new Error("Montage introuvable (list_montages).");
    const style = await resolveStyle(i.style ?? cur.spec.style ?? DEFAULT_STYLE);
    const spec: Partial<MontageSpec> = {};
    if (i.style) spec.style = style.slug;
    if (i.format) spec.format = i.format;
    if (i.transition) spec.transition = i.transition;
    if (i.transition_s !== undefined) spec.transitionS = i.transition_s;
    if (i.music_volume !== undefined) spec.musicVolume = i.music_volume;
    if (i.texts !== undefined || i.hook !== undefined) spec.texts = toTexts(i.texts ?? [], i.hook, style.data) ?? [];
    if (i.look !== undefined) {
      if (i.look === null) Object.assign(spec, { lookId: null, look: null });
      else {
        const look = await resolveLookRef(i.look);
        Object.assign(spec, { lookId: look.id, look: look.params });
      }
    }
    if (i.end_card !== undefined) spec.endCard = i.end_card ? { title: i.end_card.title, subtitle: i.end_card.subtitle ?? null, durationS: i.end_card.duration_s ?? 2 } : null;
    const clipIds = i.clips?.map((c) => c.asset_id) ?? i.asset_ids;
    if (clipIds || i.music_asset_id) {
      const assets = await requireAssets([...(clipIds ?? []), ...(i.music_asset_id ? [i.music_asset_id] : [])]);
      const byId = new Map(assets.map((a) => [a.id, a]));
      if (i.music_asset_id && byId.get(i.music_asset_id)?.kind !== "audio") throw new Error("music_asset_id doit désigner un fichier audio.");
      if (clipIds) spec.clips = toClips(i.clips ?? clipIds.map((asset_id) => ({ asset_id })), byId, style.data);
    }
    if (i.music_asset_id !== undefined) spec.musicAssetId = i.music_asset_id;
    if (Object.keys(spec).length === 0 && i.title === undefined) throw new Error("Rien à modifier.");
    const m = await updateMontage(i.id, { title: i.title, spec: Object.keys(spec).length ? spec : undefined }, ctx.actor);
    return { summary: `Montage « ${m.title} » mis à jour`, data: await summarizeMontage(m), refresh: ["montages"] };
  },
});

export const renderMontageTool = defineTool({
  name: "render_montage",
  label: "Lancement du rendu",
  description: "Lance le rendu MP4 d'un montage (asynchrone, plusieurs minutes). Ne l'attends pas : préviens l'utilisateur, puis consulte montage_status plus tard. La vidéo rendue devient un média.",
  input: z.object({ id: Uuid }),
  run: async (i, ctx) => {
    const m = await getMontage(i.id);
    if (!m) throw new Error("Montage introuvable (list_montages).");
    const r = await startRender(i.id, ctx.actor);
    return { summary: `Rendu de « ${m.title} » lancé`, data: { id: m.id, provider: r.provider, message: r.message, error: r.error, link: `/montage/${m.id}` }, refresh: ["montages"] };
  },
});

export const montageStatusTool = defineTool({
  name: "montage_status",
  label: "État du rendu",
  description: "Donne l'état à jour du rendu d'un montage (progression, erreur, vidéo produite).",
  input: z.object({ id: Uuid }),
  run: async (i) => {
    const m = await refreshRender(i.id);
    const pct = m.render?.progress !== null && m.render?.progress !== undefined ? ` (${Math.round(m.render.progress * 100)} %)` : "";
    const label = m.status === "rendered" ? "vidéo prête" : m.status === "rendering" ? `rendu en cours${pct}` : m.status === "failed" ? "échec du rendu" : "brouillon";
    return {
      summary: `« ${m.title} » : ${label}`,
      data: { id: m.id, status: m.status, progress: m.render?.progress ?? null, message: m.render?.message ?? null, error: m.render?.error ?? null, output_asset_id: m.outputAssetId, link: `/montage/${m.id}` },
      refresh: m.status === "rendered" ? ["montages", "assets"] : ["montages"],
      assetIds: m.outputAssetId ? [m.outputAssetId] : undefined,
    };
  },
});

export const MONTAGE_TOOLS = [listMontagesTool, getMontageTool, createMontageTool, updateMontageTool, renderMontageTool, montageStatusTool];

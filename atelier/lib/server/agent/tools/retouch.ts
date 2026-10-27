import "server-only";
import { z } from "zod";
import { requireAssets } from "@/lib/server/agent/tools/common";
import { defineTool, plural, Uuid } from "@/lib/server/agent/tool-kit";
import { serviceErrorMessage } from "@/lib/server/agent/errors";
import { createLook, findLookByName, getLook, listLooks } from "@/lib/server/services/looks";
import { exportRetouch } from "@/lib/server/services/retouch";
import type { Look, RetouchParams } from "@/lib/shared/types";

/** Outils de retouche : looks June, retouche d'une photo, look en lot, nouveau look. */

const Adjustments = z
  .object({
    exposure: z.number().min(-2).max(2).describe("EV, -2 … +2"),
    contrast: z.number().min(-100).max(100),
    highlights: z.number().min(-100).max(100).describe("Hautes lumières (négatif = récupérer le ciel)"),
    shadows: z.number().min(-100).max(100).describe("Ombres (positif = déboucher)"),
    whites: z.number().min(-100).max(100),
    blacks: z.number().min(-100).max(100),
    temperature: z.number().min(-100).max(100).describe("-100 froid … +100 chaud"),
    tint: z.number().min(-100).max(100).describe("-100 vert … +100 magenta"),
    saturation: z.number().min(-100).max(100),
    vibrance: z.number().min(-100).max(100),
    fade: z.number().min(0).max(100).describe("Noirs relevés, rendu film"),
    vignette: z.number().min(0).max(100),
    grain: z.number().min(0).max(100),
    sharpen: z.number().min(0).max(100),
    rotate: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
    flipH: z.boolean(),
    straighten: z.number().min(-15).max(15).describe("Redresser l'horizon, en degrés"),
    crop: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0).max(1), h: z.number().min(0).max(1) }).nullable().describe("Recadrage normalisé 0–1"),
  })
  .partial();

const Aspect = z.enum(["original", "free", "1:1", "4:5", "9:16", "16:9", "3:2"]);

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Look par identifiant ou par nom ; erreur listant les looks disponibles sinon. */
async function resolveLook(ref: string): Promise<Look> {
  const look = isUuid(ref) ? await getLook(ref) : await findLookByName(ref);
  if (look) return look;
  const names = (await listLooks().catch(() => [] as Look[])).map((l) => `« ${l.name} »`);
  throw new Error(`Look « ${ref} » introuvable.${names.length ? ` Looks disponibles : ${names.join(", ")}.` : ""}`);
}

function lookSummary(l: Look) {
  return { id: l.id, name: l.name, builtin: l.builtin, params: l.params };
}

export const listLooksTool = defineTool({
  name: "list_looks",
  label: "Lecture des looks",
  description: "Liste les looks de retouche enregistrés (looks June intégrés et looks créés), avec leurs réglages. À appeler avant de retoucher si le skill retouche-june ne suffit pas à choisir.",
  input: z.object({}),
  run: async () => {
    const looks = await listLooks();
    return { summary: plural(looks.length, "look"), data: { looks: looks.map(lookSummary) } };
  },
});

export const retouchPhoto = defineTool({
  name: "retouch_photo",
  label: "Retouche",
  description:
    "Retouche une photo et exporte une NOUVELLE version (l'original n'est jamais modifié), dans le même dossier sauf folder_id. " +
    "Combine un look (nom ou id) et/ou des réglages fins qui s'ajoutent au look. Lis le skill retouche-june avant de choisir. " +
    "Plages : exposure -2…2 ; contrast, highlights, shadows, whites, blacks, temperature, tint, saturation, vibrance -100…100 ; fade, vignette, grain, sharpen 0…100 ; straighten -15…15 ; rotate 0/90/180/270 ; crop normalisé 0–1.",
  input: z.object({
    asset_id: Uuid,
    look: z.string().max(80).optional().describe("Nom ou identifiant d'un look (list_looks)."),
    adjustments: Adjustments.optional().describe("Réglages fins, appliqués par-dessus le look."),
    aspect: Aspect.optional().describe("Format du recadrage (4:5 pour Instagram, 9:16 pour une story)."),
    name: z.string().max(200).optional().describe("Nom du fichier exporté (par défaut « <nom> (retouche).jpg »)."),
    folder_id: Uuid.nullable().optional().describe("Dossier de l'export (par défaut celui de l'original)."),
  }),
  run: async (i, ctx) => {
    const [asset] = await requireAssets([i.asset_id]);
    if (asset.kind !== "photo") throw new Error(`« ${asset.name} » n'est pas une photo.`);
    const look = i.look ? await resolveLook(i.look) : null;
    const params: Partial<RetouchParams> = { ...(look?.params ?? {}), ...(i.adjustments ?? {}), ...(i.aspect ? { aspect: i.aspect } : {}) };
    if (Object.keys(params).length === 0) throw new Error("Indique un look ou des réglages.");
    const out = await exportRetouch(asset.id, params, { name: i.name, folderId: i.folder_id }, ctx.actor);
    return {
      summary: `Photo retouchée${look ? ` (look « ${look.name} »)` : ""} : « ${out.name} »`,
      data: { original: { id: asset.id, name: asset.name }, export: { id: out.id, name: out.name, folder_id: out.folderId }, look: look?.name ?? null, params, link: `/retouche/${out.id}` },
      refresh: ["assets", "folders"],
      assetIds: [out.id],
    };
  },
});

export const applyLook = defineTool({
  name: "apply_look",
  label: "Application d'un look",
  description:
    "Applique un même look à plusieurs photos (30 au plus) : une nouvelle version retouchée par photo, les originaux restent intacts. Les vidéos sont ignorées. Idéal pour harmoniser un carrousel ou une livraison.",
  input: z.object({
    asset_ids: z.array(Uuid).min(1).max(30),
    look: z.string().max(80).describe("Nom ou identifiant du look."),
    folder_id: Uuid.nullable().optional().describe("Dossier des exports (par défaut celui de chaque original)."),
  }),
  run: async (i, ctx) => {
    const look = await resolveLook(i.look);
    const photos = (await requireAssets(i.asset_ids)).filter((a) => a.kind === "photo" && !a.trashedAt);
    if (photos.length === 0) throw new Error("Aucune photo dans cette liste.");
    const done: { id: string; name: string; from: string }[] = [];
    const errors: { id: string; name: string; message: string }[] = [];
    for (const [n, a] of photos.entries()) {
      ctx.progress(`Look « ${look.name} » : ${n + 1}/${photos.length}`);
      try {
        const out = await exportRetouch(a.id, look.params, { folderId: i.folder_id }, ctx.actor);
        done.push({ id: out.id, name: out.name, from: a.name });
      } catch (err) {
        errors.push({ id: a.id, name: a.name, message: serviceErrorMessage(err) });
        // Module indisponible : inutile d'insister sur les suivantes.
        if (/pas encore disponible/.test(errors[errors.length - 1].message)) break;
      }
    }
    if (done.length === 0) throw new Error(errors[0]?.message ?? "Aucune photo retouchée.");
    return {
      summary: `Look « ${look.name} » appliqué à ${plural(done.length, "photo")}${errors.length ? ` (${plural(errors.length, "erreur")})` : ""}`,
      data: { look: look.name, exports: done, errors },
      refresh: ["assets", "folders"],
      assetIds: done.slice(0, 12).map((d) => d.id),
    };
  },
});

export const createLookTool = defineTool({
  name: "create_look",
  label: "Création d'un look",
  description: "Enregistre un nouveau look (réglages de couleur et de lumière, sans recadrage ni rotation), réutilisable dans la retouche et les montages.",
  input: z.object({
    name: z.string().min(1).max(60),
    params: Adjustments.omit({ rotate: true, flipH: true, straighten: true, crop: true }).describe("Réglages du look (mêmes plages que retouch_photo)."),
  }),
  run: async (i, ctx) => {
    if (Object.keys(i.params).length === 0) throw new Error("Un look a besoin d'au moins un réglage.");
    const look = await createLook({ name: i.name, params: i.params }, ctx.actor);
    return { summary: `Look « ${look.name} » enregistré`, data: lookSummary(look), refresh: ["looks"] };
  },
});

export const RETOUCH_TOOLS = [listLooksTool, retouchPhoto, applyLook, createLookTool];

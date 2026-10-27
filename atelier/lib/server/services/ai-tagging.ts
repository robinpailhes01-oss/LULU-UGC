import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam, BetaMessage, BetaTextBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { LOW_EFFORT, ONE_SHOT_BETAS } from "@/lib/server/agent/config";
import { describeAiError } from "@/lib/server/agent/errors";
import { loadPreview, mapLimit, type Preview } from "@/lib/server/agent/media";
import { aiModel, getAnthropic } from "@/lib/server/ai/client";
import { badRequest, HttpError } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import { getAssets, normalizeTags, updateAsset } from "@/lib/server/repo/assets";
import { listFolders } from "@/lib/server/repo/folders";
import { getSkill } from "@/lib/server/services/skills";
import type { AiAnalysis, Asset } from "@/lib/shared/types";

/**
 * Analyse IA des médias (vision) et propositions de légendes.
 *
 * Les consignes viennent des skills ACTUELS de la base (voix-june, marque-june, tri-shooting) :
 * une amélioration faite dans l'Atelier change immédiatement le résultat. Rien de ce qui relève
 * du goût de June n'est écrit ici en dur, seulement la forme de la réponse attendue.
 */

export const UNIVERS = [
  "chambre",
  "salle de bain",
  "piscine",
  "spa",
  "restaurant",
  "petit-déjeuner",
  "cuisine",
  "bar",
  "extérieur",
  "jardin",
  "terrasse",
  "vue",
  "montagne",
  "mer",
  "détail",
  "décoration",
  "portrait",
  "activité",
  "événement",
  "produit",
  "autre",
] as const;

const PEOPLE = ["aucune", "une", "plusieurs"] as const;

/** Images par requête (un lot = une requête, réponse structurée). */
const BATCH_SIZE = 8;

// ---------------------------------------------------------------------------------------------
// Skills de référence (lus à chaque appel ; absents ou désactivés : ignorés)

async function skillBody(slug: string): Promise<string | null> {
  try {
    const s = await getSkill(slug);
    if (!s || !s.enabled || !s.body.trim()) return null;
    return s.body.trim();
  } catch {
    return null;
  }
}

async function brandContext(slugs: { slug: string; tag: string }[]): Promise<string> {
  const parts = await Promise.all(slugs.map(async ({ slug, tag }) => ({ tag, slug, body: await skillBody(slug) })));
  return parts
    .filter((p) => p.body)
    .map((p) => `<${p.tag} skill="${p.slug}">\n${p.body}\n</${p.tag}>`)
    .join("\n\n");
}

// ---------------------------------------------------------------------------------------------
// Sortie structurée de l'analyse

const ImageAnalysisSchema = z.object({
  image: z.number().describe("Numéro de l'image dans la demande (1, 2, 3…)."),
  title: z.string().describe("Titre court en français, 3 à 7 mots, sans emoji ni point final."),
  description: z.string().describe("Une ou deux phrases factuelles."),
  tags: z.array(z.string()).describe("5 à 12 mots-clés en français, minuscules, au singulier, sans « # »."),
  univers: z.array(z.enum(UNIVERS)).describe("Un ou plusieurs univers de la liste."),
  people: z.enum(PEOPLE).describe("Personnes visibles."),
  quality: z.object({
    score: z.number().describe("Qualité perçue de 0 à 100."),
    issues: z.array(z.string()).describe("Défauts visibles, en français, courts. Liste vide si rien."),
  }),
  alt: z.string().describe("Texte alternatif d'une phrase."),
  captionIdea: z.string().nullable().describe("Idée de légende dans la voix June, ou null."),
  suggestedFolder: z.string().nullable().describe("Nom d'un lieu ou d'une marque lisible sur l'image, sinon null."),
});

const BatchSchema = z.object({ images: z.array(ImageAnalysisSchema) });

/** Schéma JSON envoyé (transformé par le SDK : les contraintes non gérées passent en description). */
const ANALYSIS_FORMAT = (() => {
  const f = betaZodOutputFormat(BatchSchema);
  return { type: f.type, schema: f.schema };
})();

type AiFields = Omit<AiAnalysis, "model" | "analyzedAt">;

const str = (v: unknown, max = 400): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
const UNIVERS_BY_NORM = new Map(UNIVERS.map((u) => [norm(u), u]));

/** Lecture tolérante d'une entrée (casse, valeurs hors liste, score hors bornes). */
function readItem(raw: unknown): (AiFields & { image: number }) | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const image = Number(r.image);
  const title = str(r.title, 120).replace(/[.。]+$/, "");
  if (!Number.isFinite(image) || !title) return null;
  const tags = normalizeTags((Array.isArray(r.tags) ? r.tags : []).map((t) => str(t, 40).replace(/^#+/, ""))).slice(0, 12);
  const univers = [...new Set((Array.isArray(r.univers) ? r.univers : []).map((u) => UNIVERS_BY_NORM.get(norm(str(u, 40)))).filter((u): u is (typeof UNIVERS)[number] => Boolean(u)))];
  const peopleRaw = norm(str(r.people, 20));
  const people = (PEOPLE as readonly string[]).includes(peopleRaw) ? (peopleRaw as AiAnalysis["people"]) : "aucune";
  const q = (r.quality && typeof r.quality === "object" ? r.quality : {}) as Record<string, unknown>;
  const score = Math.round(Math.min(100, Math.max(0, Number(q.score) || 0)));
  const issues = (Array.isArray(q.issues) ? q.issues : []).map((i) => str(i, 80)).filter(Boolean).slice(0, 6);
  const caption = str(r.captionIdea, 600);
  const folder = str(r.suggestedFolder, 80);
  return {
    image: Math.round(image),
    title,
    description: str(r.description, 600),
    tags,
    univers: univers.length ? univers : ["autre"],
    people,
    quality: { score, issues },
    alt: str(r.alt, 300) || title,
    captionIdea: caption || null,
    suggestedFolder: folder && !/^null$/i.test(folder) ? folder : null,
  };
}

async function analysisSystem(): Promise<BetaTextBlockParam[]> {
  const skills = await brandContext([
    { slug: "tri-shooting", tag: "methode_de_tri" },
    { slug: "voix-june", tag: "voix_june" },
    { slug: "marque-june", tag: "marque_june" },
  ]);
  const text = `Tu analyses des photos (et des images d'affiche de vidéos) pour la médiathèque de June Content Studio, le studio de contenus de Ludivine pour l'hospitalité et le bien-être. Tu réponds uniquement avec l'objet JSON demandé, en français, une entrée par image, dans l'ordre.

<champs>
- image : le numéro de l'image dans la demande.
- title : titre court et concret (3 à 7 mots), sans emoji ni point final.
- description : une ou deux phrases factuelles : ce que l'on voit, la lumière, le moment.
- tags : 5 à 12 mots-clés en français, en minuscules, au singulier, sans « # », sans doublon : univers, éléments visibles, matières, moment de la journée, ambiance — en suivant le vocabulaire de la méthode de tri ci-dessous quand elle en donne un.
- univers : un ou plusieurs parmi : ${UNIVERS.join(", ")}.
- people : « aucune », « une » ou « plusieurs » personnes visibles.
- quality : score de 0 à 100 (netteté, lumière, cadrage, horizon, exposition) et défauts visibles, courts, en français (liste vide si rien à signaler).
- alt : une phrase de texte alternatif pour une personne qui ne voit pas l'image.
- captionIdea : une idée de légende Instagram dans la voix June décrite ci-dessous : Ludivine à la première personne, chaleureuse, sensorielle, une ou deux lignes, sans hashtag, sans les mots à éviter ; null si l'image ne s'y prête pas (photo ratée, document, capture).
- suggestedFolder : seulement si l'image montre clairement le nom d'un lieu ou d'une marque (enseigne, panneau, logo lisible) : ce nom ; sinon null. Ne le déduis jamais du nom du fichier ni du dossier.
</champs>

Les consignes des skills ci-dessous sont celles de l'équipe : elles priment.

${skills || "(Aucun skill de voix ou de tri n'est disponible : reste sobre et factuel.)"}`;
  return [{ type: "text", text, cache_control: { type: "ephemeral" } }];
}

function describeForPrompt(a: Asset, i: number, folderName: string | null): string {
  const bits = [`Image ${i + 1}`, a.kind === "video" ? `image d'affiche d'une vidéo${a.durationS ? ` de ${Math.round(a.durationS)} s` : ""}` : "photo"];
  if (a.width && a.height) bits.push(`${a.width}×${a.height}`);
  if (a.takenAt) bits.push(`prise le ${a.takenAt.slice(0, 10)}`);
  if (folderName) bits.push(`dossier « ${folderName} »`);
  return `${bits.join(" — ")} — fichier « ${a.name} » :`;
}

function firstText(msg: BetaMessage): string | null {
  for (const b of msg.content) if (b.type === "text" && b.text.trim()) return b.text;
  return null;
}

/** Erreur sur un lot entier (refus, réponse coupée…), en français. */
function batchFailure(msg: BetaMessage): string | null {
  if (msg.stop_reason === "refusal") return "Claude a décliné l'analyse de ces images.";
  if (msg.stop_reason === "max_tokens" || msg.stop_reason === "model_context_window_exceeded") return "Réponse de Claude coupée avant la fin : relancez l'analyse.";
  return null;
}

export interface AnalyzeResult {
  analyzed: Asset[];
  skipped: string[];
  errors: { id: string; message: string }[];
}

/**
 * Analyse des médias : titre, description, mots-clés, univers, personnes, qualité, texte
 * alternatif, idée de légende, dossier suggéré. Écrit `ai` (avec le modèle et la date) et
 * fusionne les mots-clés. Les médias déjà analysés sont ignorés sauf `force` ; l'audio aussi.
 */
export async function analyzeAssets(assetIds: string[], actor: string | null, opts?: { force?: boolean }): Promise<AnalyzeResult> {
  const client = getAnthropic(); // 503 lisible si la clé manque, avant tout travail
  const ids = [...new Set(assetIds)];
  if (ids.length === 0) throw badRequest("Aucun média à analyser.");
  if (ids.length > 200) throw badRequest("200 médias au plus par analyse.");

  const found = await getAssets(ids);
  const byId = new Map(found.map((a) => [a.id, a]));
  const out: AnalyzeResult = { analyzed: [], skipped: [], errors: [] };
  const todo: Asset[] = [];
  for (const id of ids) {
    const a = byId.get(id);
    if (!a) out.errors.push({ id, message: "Média introuvable." });
    else if (a.status !== "ready") out.errors.push({ id, message: `« ${a.name} » n'est pas encore prêt (envoi en cours ou en erreur).` });
    else if (a.kind === "audio" || a.trashedAt || (a.ai && !opts?.force)) out.skipped.push(id);
    else todo.push(a);
  }
  if (todo.length === 0) return out;

  // Aperçus (vignettes) en parallèle limité ; un aperçu impossible n'arrête pas le lot.
  const previews = await mapLimit(todo, 4, async (a) => {
    try {
      return await loadPreview(a);
    } catch (err) {
      out.errors.push({ id: a.id, message: err instanceof Error ? err.message : "Aperçu impossible." });
      return null;
    }
  });
  const ready = todo.map((a, i) => ({ asset: a, preview: previews[i] })).filter((x): x is { asset: Asset; preview: Preview } => x.preview !== null);
  if (ready.length === 0) return out;

  const folderNames = new Map((await listFolders()).map((f) => [f.id, f.name]));
  const system = await analysisSystem();
  const model = aiModel();
  const batches: (typeof ready)[] = [];
  for (let i = 0; i < ready.length; i += BATCH_SIZE) batches.push(ready.slice(i, i + BATCH_SIZE));

  const runBatch = async (batch: typeof ready) => {
    const content: BetaContentBlockParam[] = [];
    batch.forEach(({ asset, preview }, i) => {
      content.push({ type: "text", text: describeForPrompt(asset, i, asset.folderId ? folderNames.get(asset.folderId) ?? null : null) });
      content.push({ type: "image", source: { type: "base64", media_type: preview.mediaType, data: preview.data } });
    });
    content.push({ type: "text", text: `Analyse ces ${batch.length} image${batch.length > 1 ? "s" : ""} : une entrée par image dans « images », champ « image » = son numéro.` });

    let msg: BetaMessage;
    try {
      msg = await client.beta.messages.create({
        model,
        max_tokens: 16_000,
        betas: ONE_SHOT_BETAS,
        fallbacks: "default",
        output_config: { effort: LOW_EFFORT, format: ANALYSIS_FORMAT },
        system,
        messages: [{ role: "user", content }],
      });
    } catch (err) {
      const { message } = describeAiError(err);
      for (const { asset } of batch) out.errors.push({ id: asset.id, message });
      return;
    }
    const failure = batchFailure(msg);
    const text = failure ? null : firstText(msg);
    let items: ReturnType<typeof readItem>[] = [];
    if (text) {
      try {
        const parsed = JSON.parse(text) as { images?: unknown };
        items = Array.isArray(parsed.images) ? parsed.images.map(readItem) : [];
      } catch {
        items = [];
      }
    }
    const byIndex = new Map(items.filter((x): x is NonNullable<typeof x> => x !== null).map((x) => [x.image, x]));
    const analyzedAt = new Date().toISOString();
    const done: Asset[] = [];
    for (const [i, { asset }] of batch.entries()) {
      const item = byIndex.get(i + 1);
      if (!item) {
        out.errors.push({ id: asset.id, message: failure ?? "Analyse illisible pour ce média : relancez-la." });
        continue;
      }
      const { image: _image, ...fields } = item;
      void _image;
      const ai: AiAnalysis = { ...fields, model: msg.model, analyzedAt };
      try {
        done.push(await updateAsset(asset.id, { ai, tags: normalizeTags([...asset.tags, ...fields.tags]) }, actor));
      } catch (err) {
        out.errors.push({ id: asset.id, message: err instanceof Error ? err.message : "Enregistrement impossible." });
      }
    }
    if (done.length > 0) {
      out.analyzed.push(...done);
      await logActivity({
        actor,
        verb: "a analysé avec l'IA",
        objectType: "asset",
        objectId: done.length === 1 ? done[0].id : null,
        summary: done.length === 1 ? done[0].name : `${done.length} médias`,
        meta: { ids: done.map((a) => a.id), model: msg.model },
      });
    }
  };

  // Le premier lot écrit le cache du prompt système ; les suivants le relisent (3 en parallèle).
  await runBatch(batches[0]);
  await mapLimit(batches.slice(1), 3, runBatch);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Légendes

const CaptionsSchema = z.object({ captions: z.array(z.string()).describe("Exactement trois légendes, différentes les unes des autres.") });
const CAPTIONS_FORMAT = (() => {
  const f = betaZodOutputFormat(CaptionsSchema);
  return { type: f.type, schema: f.schema };
})();

const PLATFORM_HINT: Record<string, string> = {
  instagram: "Instagram : accroche visible avant « plus », corps de 2 à 5 lignes courtes, invitation douce facultative, hashtags selon la voix June (3 à 6, précis, en fin de légende).",
  tiktok: "TikTok : plus court (1 à 3 lignes), accroche immédiate, 2 à 4 hashtags précis.",
  facebook: "Facebook : 2 à 4 phrases, ton chaleureux, pas plus de 2 hashtags.",
  linkedin: "LinkedIn : sobre, 3 à 5 phrases, sans hashtag ou presque.",
  pinterest: "Pinterest : une phrase descriptive et évocatrice, mots-clés naturels, sans hashtag.",
};

/** Trois légendes dans la voix June pour des médias donnés (4 images regardées au plus). */
export async function suggestCaptions(input: { assetIds: string[]; brief?: string; platform?: string }): Promise<string[]> {
  const client = getAnthropic();
  const platform = (input.platform ?? "instagram").toLowerCase();
  const assets = (await getAssets([...new Set(input.assetIds)])).filter((a) => !a.trashedAt);
  if (assets.length === 0 && !input.brief?.trim()) throw badRequest("Choisissez au moins un média ou décrivez la publication.");

  const visual = assets.filter((a) => a.kind !== "audio").slice(0, 4);
  const previews = await mapLimit(visual, 4, async (a) => {
    try {
      return { asset: a, preview: await loadPreview(a) };
    } catch {
      return null;
    }
  });

  const skills = await brandContext([
    { slug: "voix-june", tag: "voix_june" },
    { slug: "marque-june", tag: "marque_june" },
  ]);
  const system: BetaTextBlockParam[] = [
    {
      type: "text",
      text: `Tu écris des légendes de publication pour June Content Studio, le studio de contenus de Ludivine (hospitalité, bien-être). Par défaut, c'est le compte de June : Ludivine parle à la première personne, avec simplicité. Si le brief indique une légende pour un client, adopte le ton du client comme le décrit la voix June.
Tu proposes exactement trois légendes vraiment différentes (angle, accroche, longueur), prêtes à publier, sans guillemets autour, sans numérotation, sans emoji dans la première ligne, sans aucun des mots à éviter. Tu ne décris que ce que l'on voit ou ce que dit le brief : n'invente ni lieu, ni prix, ni détail.

${skills || "(Aucun skill de voix n'est disponible : reste simple, chaleureux et sensoriel.)"}`,
      cache_control: { type: "ephemeral" },
    },
  ];

  const content: BetaContentBlockParam[] = [];
  previews.forEach((p, i) => {
    if (!p) return;
    content.push({ type: "text", text: `Média ${i + 1} — « ${p.asset.name} »${p.asset.ai?.description ? ` (${p.asset.ai.description})` : ""} :` });
    content.push({ type: "image", source: { type: "base64", media_type: p.preview.mediaType, data: p.preview.data } });
  });
  const others = assets.filter((a) => !previews.some((p) => p?.asset.id === a.id));
  if (others.length) content.push({ type: "text", text: `Autres médias de la publication : ${others.map((a) => `« ${a.name} »${a.ai?.title ? ` (${a.ai.title})` : ""}`).join(", ")}.` });
  content.push({
    type: "text",
    text: [
      `Plateforme : ${PLATFORM_HINT[platform] ?? `${platform} : adapte la longueur et les hashtags à la plateforme.`}`,
      input.brief?.trim() ? `Brief : ${input.brief.trim()}` : "Pas de brief : appuie-toi sur les images.",
      "Écris les trois légendes.",
    ].join("\n"),
  });

  let msg: BetaMessage;
  try {
    msg = await client.beta.messages.create({
      model: aiModel(),
      max_tokens: 8_000,
      betas: ONE_SHOT_BETAS,
      fallbacks: "default",
      output_config: { effort: LOW_EFFORT, format: CAPTIONS_FORMAT },
      system,
      messages: [{ role: "user", content }],
    });
  } catch (err) {
    const d = describeAiError(err);
    throw new HttpError(d.status === 429 ? 429 : 502, "ai_error", d.message);
  }
  const failure = batchFailure(msg);
  if (failure) throw new HttpError(502, "ai_error", failure);
  const text = firstText(msg);
  let captions: string[] = [];
  try {
    const parsed = JSON.parse(text ?? "{}") as { captions?: unknown };
    captions = (Array.isArray(parsed.captions) ? parsed.captions : []).map((c) => (typeof c === "string" ? c.trim().replace(/^["«]\s*|\s*["»]$/g, "") : "")).filter(Boolean);
  } catch {
    captions = [];
  }
  const unique = [...new Set(captions)].slice(0, 3);
  if (unique.length === 0) throw new HttpError(502, "ai_error", "Claude n'a pas proposé de légende lisible. Réessayez.");
  return unique;
}

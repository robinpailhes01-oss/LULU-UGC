import "server-only";
import type { BetaImageBlockParam, BetaTextBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { loadPreview, mapLimit } from "@/lib/server/agent/media";
import { compactAsset, detailedAsset, folderIndex, quoteNames, requireAssets } from "@/lib/server/agent/tools/common";
import { countKinds, defineTool, Ids, plural, Uuid } from "@/lib/server/agent/tool-kit";
import { bulkAssets, listAssets, normalizeTags, requireAsset, updateAsset } from "@/lib/server/repo/assets";
import { createFolder, findFolderByName, getFolder, updateFolder } from "@/lib/server/repo/folders";
import { analyzeAssets } from "@/lib/server/services/ai-tagging";

/** Outils de la médiathèque : chercher, regarder, ranger, taguer, analyser, corbeille. */

export const searchAssets = defineTool({
  name: "search_assets",
  label: "Recherche dans la médiathèque",
  description:
    "Cherche des médias (photos, vidéos, audio) dans la médiathèque et renvoie une liste compacte : id, nom, type, dossier, mots-clés, titre IA, dimensions, durée, date de prise de vue, date d'import. " +
    "À appeler dès que l'utilisateur parle de médias sans donner leurs identifiants (« les photos de piscine », « les vidéos de ce dossier », « ce qui n'est pas tagué »). " +
    "Ne renvoie pas les images : pour les voir, appelle view_images avec les identifiants trouvés.",
  input: z.object({
    query: z.string().max(200).optional().describe("Texte libre cherché dans le nom du fichier, le titre et la description IA, les mots-clés et le nom du dossier. Plusieurs mots : tous requis."),
    folder_id: Uuid.nullable().optional().describe("Limiter à un dossier (sans ses sous-dossiers). null = médias rangés à la racine. Absent = toute la médiathèque."),
    kind: z.enum(["photo", "video", "audio"]).optional(),
    tags: z.array(z.string().max(40)).max(10).optional().describe("Mots-clés exigés (tous)."),
    untagged: z.boolean().optional().describe("Seulement les médias sans mot-clé ni analyse IA."),
    starred: z.boolean().optional().describe("Seulement les favoris."),
    in_trash: z.boolean().optional().describe("Chercher dans la corbeille (pour restaurer)."),
    sort: z.enum(["recent", "oldest", "name", "taken", "size"]).optional().describe("recent par défaut ; taken = date de prise de vue."),
    limit: z.number().int().min(1).max(100).optional().describe("30 par défaut, 100 au plus."),
    offset: z.number().int().min(0).optional().describe("Pour la page suivante."),
  }),
  run: async (i) => {
    const limit = i.limit ?? 30;
    const [page, folders] = await Promise.all([
      listAssets({ q: i.query, folderId: i.folder_id, kind: i.kind, tags: i.tags, untagged: i.untagged, starred: i.starred, trashed: i.in_trash, sort: i.sort, limit, offset: i.offset }),
      folderIndex(),
    ]);
    const shown = page.items.length;
    return {
      summary: page.total === 0 ? "Aucun média trouvé" : page.total > shown ? `${plural(page.total, "média trouvé", "médias trouvés")} (${shown} affichés)` : plural(page.total, "média trouvé", "médias trouvés"),
      data: { total: page.total, offset: i.offset ?? 0, items: page.items.map((a) => compactAsset(a, folders)) },
      assetIds: page.items.slice(0, 12).map((a) => a.id),
    };
  },
});

export const getAssetsTool = defineTool({
  name: "get_assets",
  label: "Lecture des fiches médias",
  description:
    "Renvoie la fiche détaillée de médias précis : dossier, mots-clés, analyse IA (description, univers, personnes, défauts, texte alternatif, idée de légende, dossier suggéré), dimensions, appareil, netteté, exposition, origine (import, retouche, montage). " +
    "À appeler pour connaître un média sélectionné ou avant de le modifier.",
  input: z.object({ ids: Ids(50) }),
  run: async (i) => {
    const [assets, folders] = await Promise.all([requireAssets(i.ids, { allowTrashed: true }), folderIndex()]);
    return { summary: plural(assets.length, "fiche lue", "fiches lues"), data: { items: assets.map((a) => detailedAsset(a, folders)) }, assetIds: assets.map((a) => a.id) };
  },
});

export const viewImages = defineTool({
  name: "view_images",
  label: "Regarde les images",
  description:
    "Te montre les images (vignettes, ou image d'affiche pour une vidéo) de médias précis, pour juger le cadrage, la lumière, le moment, la qualité ou choisir les plus belles. 8 au plus par appel. " +
    "À appeler avant de sélectionner, comparer, décrire ou écrire sur des photos : les noms de fichiers ne suffisent pas. Pour analyser et taguer en masse, préfère analyze_assets.",
  input: z.object({ ids: Ids(8) }),
  run: async (i) => {
    const assets = await requireAssets(i.ids, { allowTrashed: true });
    const previews = await mapLimit(assets, 4, async (a) => {
      try {
        return { asset: a, preview: await loadPreview(a), error: null as string | null };
      } catch (err) {
        return { asset: a, preview: null, error: err instanceof Error ? err.message : "Aperçu impossible." };
      }
    });
    const seen = previews.filter((p) => p.preview);
    const content: (BetaTextBlockParam | BetaImageBlockParam)[] = [
      {
        type: "text",
        text: JSON.stringify({
          resume: `${plural(seen.length, "image")} à regarder`,
          images: previews.map((p, n) => ({ n: n + 1, id: p.asset.id, name: p.asset.name, kind: p.asset.kind, error: p.error ?? undefined })),
        }),
      },
    ];
    previews.forEach((p, n) => {
      if (!p.preview) return;
      content.push({ type: "text", text: `Image ${n + 1} — « ${p.asset.name} » (${p.asset.kind === "video" ? "affiche de la vidéo" : "photo"}, id ${p.asset.id}) :` });
      content.push({ type: "image", source: { type: "base64", media_type: p.preview.mediaType, data: p.preview.data } });
    });
    if (seen.length === 0) throw new Error(previews.map((p) => p.error).filter(Boolean).join(" ") || "Aucun aperçu disponible.");
    return { summary: `${plural(seen.length, "image regardée", "images regardées")}`, content, assetIds: seen.map((p) => p.asset.id) };
  },
});

export const listFoldersTool = defineTool({
  name: "list_folders",
  label: "Lecture des dossiers",
  description:
    "Renvoie l'arborescence des dossiers de la médiathèque (id, chemin complet, nombre de médias directement dedans). À appeler avant de ranger, de créer un dossier ou quand l'utilisateur cite un dossier par son nom.",
  input: z.object({}),
  run: async () => {
    const folders = await folderIndex();
    const items = [...folders.byId.values()]
      .map((f) => ({ id: f.id, path: folders.path(f.id) ?? f.name, parent_id: f.parentId, count: f.assetCount }))
      .sort((a, b) => a.path.localeCompare(b.path, "fr"));
    return { summary: plural(items.length, "dossier"), data: { total: items.length, folders: items } };
  },
});

export const createFolderTool = defineTool({
  name: "create_folder",
  label: "Création d'un dossier",
  description:
    "Crée un dossier (à la racine ou dans un dossier parent). Si un dossier du même nom existe déjà au même endroit, le renvoie sans en créer un second. Suis l'arborescence du skill tri-shooting pour un projet client.",
  input: z.object({
    name: z.string().min(1).max(120).describe("Nom du dossier, ex. « Gîte de l'Abric — octobre 2026 » ou « Sélection »."),
    parent_id: Uuid.nullable().optional().describe("Dossier parent ; absent ou null = racine."),
  }),
  run: async (i, ctx) => {
    const parentId = i.parent_id ?? null;
    const existing = await findFolderByName(i.name, parentId);
    if (existing) return { summary: `Dossier « ${existing.name} » déjà présent`, data: { id: existing.id, name: existing.name, created: false, link: `/mediatheque/dossier/${existing.id}` } };
    const f = await createFolder({ name: i.name, parentId }, ctx.actor);
    return { summary: `Dossier « ${f.name} » créé`, data: { id: f.id, name: f.name, created: true, link: `/mediatheque/dossier/${f.id}` }, refresh: ["folders"] };
  },
});

export const updateFolderTool = defineTool({
  name: "update_folder",
  label: "Modification d'un dossier",
  description: "Renomme un dossier et/ou le déplace dans un autre dossier (parent_id null = à la racine).",
  input: z.object({
    id: Uuid,
    name: z.string().min(1).max(120).optional(),
    parent_id: Uuid.nullable().optional().describe("Nouveau parent ; null = racine ; absent = inchangé."),
  }),
  run: async (i, ctx) => {
    if (i.name === undefined && i.parent_id === undefined) throw new Error("Indique un nouveau nom ou un nouveau parent.");
    const before = await getFolder(i.id);
    if (!before) throw new Error("Dossier introuvable.");
    const f = await updateFolder(i.id, { name: i.name, parentId: i.parent_id }, ctx.actor);
    const parts = [i.name !== undefined && i.name !== before.name ? `renommé « ${f.name} »` : null, i.parent_id !== undefined ? "déplacé" : null].filter(Boolean);
    return { summary: `Dossier « ${before.name} » ${parts.join(" et ") || "mis à jour"}`, data: { id: f.id, name: f.name, parent_id: f.parentId }, refresh: ["folders"] };
  },
});

export const moveAssets = defineTool({
  name: "move_assets",
  label: "Rangement des médias",
  description: "Déplace des médias dans un dossier (folder_id null = à la racine). À utiliser pour ranger un import, constituer une sélection, préparer une livraison.",
  input: z.object({ ids: Ids(200), folder_id: Uuid.nullable().describe("Dossier de destination ; null = racine.") }),
  run: async (i, ctx) => {
    const folder = i.folder_id ? await getFolder(i.folder_id) : null;
    if (i.folder_id && !folder) throw new Error("Dossier de destination introuvable (list_folders pour les identifiants).");
    const r = await bulkAssets(i.ids, { action: "move", folderId: i.folder_id }, ctx.actor);
    const where = folder ? `dans « ${folder.name} »` : "à la racine";
    return { summary: `${plural(r.count, "média déplacé", "médias déplacés")} ${where}`, data: { moved: r.count, folder: folder ? { id: folder.id, name: folder.name, link: `/mediatheque/dossier/${folder.id}` } : null }, refresh: ["assets", "folders"], assetIds: i.ids.slice(0, 12) };
  },
});

export const tagAssets = defineTool({
  name: "tag_assets",
  label: "Mots-clés",
  description: "Ajoute et/ou retire des mots-clés sur des médias (minuscules, au singulier, en français, sans « # »). Suis le vocabulaire du skill tri-shooting (ex. « selection » pour les retenus).",
  input: z.object({
    ids: Ids(200),
    add: z.array(z.string().min(1).max(40)).max(20).optional().describe("Mots-clés à ajouter."),
    remove: z.array(z.string().min(1).max(40)).max(20).optional().describe("Mots-clés à retirer."),
  }),
  run: async (i, ctx) => {
    if (!i.add?.length && !i.remove?.length) throw new Error("Indique des mots-clés à ajouter (add) ou à retirer (remove).");
    const add = normalizeTags(i.add ?? []);
    const remove = normalizeTags(i.remove ?? []);
    let count = 0;
    if (add.length) count = Math.max(count, (await bulkAssets(i.ids, { action: "tag", tags: add }, ctx.actor)).count);
    if (remove.length) count = Math.max(count, (await bulkAssets(i.ids, { action: "untag", tags: remove }, ctx.actor)).count);
    const change = [...add.map((t) => `+${t}`), ...remove.map((t) => `−${t}`)].slice(0, 6).join(", ");
    return { summary: `${plural(count, "média tagué", "médias tagués")} (${change})`, data: { updated: count, added: add, removed: remove }, refresh: ["assets"], assetIds: i.ids.slice(0, 12) };
  },
});

export const renameAsset = defineTool({
  name: "rename_asset",
  label: "Renommage",
  description: "Renomme un média (garde l'extension du fichier).",
  input: z.object({ id: Uuid, name: z.string().min(1).max(200) }),
  run: async (i, ctx) => {
    const before = await requireAsset(i.id);
    const ext = /\.[a-z0-9]{2,5}$/i.exec(before.name)?.[0] ?? "";
    const name = ext && !i.name.toLowerCase().endsWith(ext.toLowerCase()) ? `${i.name}${ext}` : i.name;
    const a = await updateAsset(i.id, { name }, ctx.actor);
    return { summary: `« ${before.name} » renommé « ${a.name} »`, data: { id: a.id, name: a.name }, refresh: ["assets"], assetIds: [a.id] };
  },
});

export const starAssets = defineTool({
  name: "star_assets",
  label: "Favoris",
  description: "Met des médias en favori (plans « signature ») ou les retire des favoris.",
  input: z.object({ ids: Ids(200), starred: z.boolean() }),
  run: async (i, ctx) => {
    const r = await bulkAssets(i.ids, { action: "star", starred: i.starred }, ctx.actor);
    return { summary: i.starred ? `${plural(r.count, "média")} en favori` : `${plural(r.count, "média")} retiré${r.count > 1 ? "s" : ""} des favoris`, data: { updated: r.count }, refresh: ["assets"], assetIds: i.ids.slice(0, 12) };
  },
});

export const analyzeAssetsTool = defineTool({
  name: "analyze_assets",
  label: "Analyse IA des médias",
  description:
    "Lance l'analyse IA (vision) de médias : titre, description, mots-clés, univers, personnes, qualité, texte alternatif, idée de légende, dossier suggéré ; les mots-clés sont ajoutés aux médias. " +
    "Les médias déjà analysés sont ignorés sauf force: true ; l'audio est ignoré. 100 médias au plus par appel. À utiliser pour trier un import ou avant de chercher par contenu.",
  input: z.object({ ids: Ids(100), force: z.boolean().optional().describe("Réanalyser même les médias déjà analysés.") }),
  run: async (i, ctx) => {
    ctx.progress(`Analyse IA de ${plural(i.ids.length, "média")}…`);
    const r = await analyzeAssets(i.ids, ctx.actor, { force: i.force });
    const folders = await folderIndex();
    const extra = [r.skipped.length ? `${r.skipped.length} ignoré${r.skipped.length > 1 ? "s" : ""}` : null, r.errors.length ? plural(r.errors.length, "erreur") : null].filter(Boolean).join(", ");
    return {
      summary: `${plural(r.analyzed.length, "média analysé", "médias analysés")}${extra ? ` (${extra})` : ""}`,
      data: {
        analyzed: r.analyzed.map((a) => ({ ...compactAsset(a, folders), univers: a.ai?.univers, people: a.ai?.people, issues: a.ai?.quality?.issues, suggested_folder: a.ai?.suggestedFolder ?? undefined })),
        skipped: r.skipped,
        errors: r.errors,
      },
      refresh: r.analyzed.length ? ["assets"] : [],
      assetIds: r.analyzed.slice(0, 12).map((a) => a.id),
    };
  },
});

export const trashAssets = defineTool({
  name: "trash_assets",
  label: "Mise à la corbeille",
  description:
    "Met des médias à la corbeille (restaurables). NE S'EXÉCUTE PAS DIRECTEMENT : l'Atelier affiche une carte de confirmation à l'utilisateur. Appelle-le une seule fois avec la liste exacte, puis dis à l'utilisateur de confirmer sur la carte ; ne le relance pas.",
  input: z.object({ ids: Ids(200) }),
  confirm: {
    prepare: async (i) => {
      const assets = (await requireAssets(i.ids)).filter((a) => !a.trashedAt);
      return { summary: `Mettre ${countKinds(assets)} à la corbeille${assets.length <= 3 ? ` : ${quoteNames(assets.map((a) => a.name))}` : ""}`, input: { ids: assets.map((a) => a.id) }, assetIds: assets.slice(0, 12).map((a) => a.id) };
    },
    execute: async (stored, actor) => {
      const ids = (stored.ids as string[]) ?? [];
      const r = await bulkAssets(ids, { action: "trash" }, actor);
      return { summary: `${plural(r.count, "média mis", "médias mis")} à la corbeille`, data: { trashed: r.count, link: "/corbeille" }, refresh: ["assets", "folders", "stats", "cleanup"], assetIds: ids.slice(0, 12) };
    },
  },
});

export const restoreAssets = defineTool({
  name: "restore_assets",
  label: "Restauration",
  description: "Restaure des médias de la corbeille (ils retrouvent leur dossier s'il existe encore, sinon la racine). Trouve-les avec search_assets { in_trash: true }.",
  input: z.object({ ids: Ids(200) }),
  run: async (i, ctx) => {
    const r = await bulkAssets(i.ids, { action: "restore" }, ctx.actor);
    return { summary: `${plural(r.count, "média restauré", "médias restaurés")}`, data: { restored: r.count }, refresh: ["assets", "folders", "stats", "cleanup"], assetIds: i.ids.slice(0, 12) };
  },
});

export const LIBRARY_TOOLS = [searchAssets, getAssetsTool, viewImages, listFoldersTool, createFolderTool, updateFolderTool, moveAssets, tagAssets, renameAsset, starAssets, analyzeAssetsTool, trashAssets, restoreAssets];

import "server-only";
import { env } from "@/lib/server/env";
import { getAssets } from "@/lib/server/repo/assets";
import { getFolderPath } from "@/lib/server/repo/folders";
import { getMontage } from "@/lib/server/services/montages";
import { getPost } from "@/lib/server/services/posts";
import { getClient } from "@/lib/server/services/clients";
import { getSkill } from "@/lib/server/services/skills";
import type { AgentScreenContext } from "@/lib/shared/types";

/**
 * Bloc <ecran> ajouté en tête de chaque message de l'utilisateur : ce que la personne voit,
 * avec les identifiants résolus en noms côté serveur. Il est ajouté au message (jamais au
 * système), donc ne casse aucun cache.
 */

const PAGE_LABEL: Record<string, string> = {
  "tableau-de-bord": "tableau de bord",
  mediatheque: "médiathèque",
  dossier: "médiathèque (dossier)",
  recents: "médiathèque (récents)",
  favoris: "médiathèque (favoris)",
  recherche: "médiathèque (recherche)",
  corbeille: "corbeille",
  menage: "ménage",
  montage: "montage",
  programmation: "programmation",
  retouche: "retouche",
  skills: "skills",
  reglages: "réglages",
  agent: "agent (plein écran)",
  clients: "clients",
  client: "fiche client",
};

async function attempt<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export function nowInParis(date = new Date()): string {
  const tz = env.zernio.timezone;
  const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: tz }).format(date);
  const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(date);
  // Décalage horaire courant (+01:00 l'hiver, +02:00 l'été), pour écrire des dates ISO justes.
  const offsetPart = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  const offset = offsetPart.replace("GMT", "") || "+00:00";
  return `${day}, ${time} (${tz}, UTC${offset})`;
}

export async function buildScreenBlock(ctx: (AgentScreenContext & { path?: string }) | null | undefined, actor: string | null, conversationClientId: string | null = null): Promise<string> {
  const lines: string[] = [`Date : ${nowInParis()}`, `Personne : ${actor ?? "inconnue (accès local sans connexion)"}`];
  if (ctx && ctx.clientId !== undefined) {
    const shown = ctx.clientId ? await attempt(() => getClient(ctx.clientId!)) : null;
    const label = ctx.clientId ? (shown ? `« ${shown.name} » (id ${shown.id})` : `id ${ctx.clientId}`) : "Tous les clients";
    const differs = (ctx.clientId ?? null) !== conversationClientId;
    lines.push(`Client affiché par l'interface : ${label}${differs ? " — différent du client de la conversation" : ""}`);
  }
  if (!ctx) {
    lines.push("Contexte de l'écran : non partagé par la personne.");
    return `<ecran>\n${lines.join("\n")}\n</ecran>`;
  }
  const page = ctx.page?.trim() || "inconnue";
  lines.push(`Page : ${PAGE_LABEL[page] ?? page}${ctx.path ? ` (${ctx.path})` : ""}`);

  if (ctx.folderId) {
    const path = await attempt(() => getFolderPath(ctx.folderId!));
    if (path?.length) lines.push(`Dossier ouvert : « ${path[path.length - 1].name} » (id ${ctx.folderId})${path.length > 1 ? ` — chemin : ${path.map((f) => f.name).join(" / ")}` : ""}`);
    else lines.push(`Dossier ouvert : introuvable (id ${ctx.folderId})`);
  }

  const selected = [...new Set(ctx.selectedAssetIds ?? [])];
  if (selected.length) {
    const assets = (await attempt(() => getAssets(selected.slice(0, 200)))) ?? [];
    const shown = assets.slice(0, 30).map((a) => `« ${a.name} » (${a.kind}, id ${a.id})`);
    lines.push(`Sélection : ${selected.length} média${selected.length > 1 ? "s" : ""}${shown.length ? ` — ${shown.join(" ; ")}` : ""}${selected.length > shown.length ? ` ; et ${selected.length - shown.length} autre(s) (ids : ${selected.slice(shown.length, 200).join(", ")})` : ""}`);
  }

  if (ctx.montageId) {
    const m = await attempt(() => getMontage(ctx.montageId!));
    lines.push(m ? `Montage ouvert : « ${m.title} » (id ${m.id}, ${m.status})` : `Montage ouvert : id ${ctx.montageId}`);
  }
  if (ctx.postId) {
    const p = await attempt(() => getPost(ctx.postId!));
    lines.push(p ? `Publication ouverte : id ${p.id} (${p.status}${p.scheduledFor ? `, prévue ${p.scheduledFor}` : ""}) — « ${p.caption.slice(0, 80)} »` : `Publication ouverte : id ${ctx.postId}`);
  }
  if (ctx.skillSlug) {
    const s = await attempt(() => getSkill(ctx.skillSlug!));
    lines.push(s ? `Skill ouvert : « ${s.name} » (${s.slug}, version ${s.version})` : `Skill ouvert : ${ctx.skillSlug}`);
  }
  return `<ecran>\n${lines.join("\n")}\n</ecran>`;
}

import "server-only";
import { z } from "zod";
import { countKinds, defineTool, parisDateTime, plural, Uuid } from "@/lib/server/agent/tool-kit";
import { requireAssets } from "@/lib/server/agent/tools/common";
import { env } from "@/lib/server/env";
import { cancelPost, createPost, getPost, listPosts, listSocialAccounts } from "@/lib/server/services/posts";
import { PLATFORM_LABEL, POST_STATUS_LABEL } from "@/lib/shared/labels";
import type { PostOptions, PostTarget, ScheduledPost, SocialAccount } from "@/lib/shared/types";

/** Outils de programmation (Zernio) : comptes, calendrier, brouillons, programmation, annulation. */

const tz = env.zernio.timezone;
const platformName = (p: string) => PLATFORM_LABEL[p] ?? p;
const accountLabel = (a: { platform: string; username?: string | null }) => `${platformName(a.platform)}${a.username ? ` (@${a.username.replace(/^@/, "")})` : ""}`;
const targetsLabel = (t: PostTarget[]) => t.map(accountLabel).join(", ");
const excerpt = (s: string, n = 60) => {
  const line = s.replace(/\s+/g, " ").trim();
  return line.length > n ? `${line.slice(0, n - 1)}…` : line;
};

const IsoDate = z
  .string()
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)) && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s), "date ISO 8601 attendue, avec l'heure et le décalage (ex. 2026-11-03T18:00:00+01:00)");

async function resolveTargets(accountIds: string[]): Promise<PostTarget[]> {
  const accounts = await listSocialAccounts();
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const missing = accountIds.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new Error(
      `Compte${missing.length > 1 ? "s" : ""} inconnu${missing.length > 1 ? "s" : ""} : ${missing.join(", ")}. Comptes connectés : ${accounts.map((a) => `${a.id} = ${accountLabel(a)}`).join(" ; ") || "aucun"}.`,
    );
  }
  return [...new Set(accountIds)].map((id) => {
    const a = byId.get(id)!;
    return { platform: a.platform, accountId: a.id, username: a.username };
  });
}

function compactPost(p: ScheduledPost) {
  return {
    id: p.id,
    status: p.status,
    status_label: POST_STATUS_LABEL[p.status],
    scheduled_for: p.scheduledFor,
    when: p.scheduledFor ? parisDateTime(p.scheduledFor, p.timezone || tz) : null,
    targets: targetsLabel(p.targets),
    caption: excerpt(p.caption, 140),
    assets: p.assetIds.length,
    asset_ids: p.assetIds,
    error: p.error ?? undefined,
    planned_for: typeof p.options?.plannedFor === "string" ? p.options.plannedFor : undefined,
  };
}

export const listSocialAccountsTool = defineTool({
  name: "list_social_accounts",
  label: "Lecture des comptes",
  description: "Liste les comptes de réseaux sociaux connectés à l'Atelier via Zernio (id, réseau, nom d'utilisateur). À appeler avant de programmer.",
  input: z.object({}),
  run: async () => {
    const accounts = await listSocialAccounts();
    return {
      summary: plural(accounts.length, "compte connecté", "comptes connectés"),
      data: { accounts: accounts.map((a: SocialAccount) => ({ id: a.id, platform: a.platform, username: a.username, name: a.displayName, label: accountLabel(a) })) },
    };
  },
});

export const listPostsTool = defineTool({
  name: "list_posts",
  label: "Lecture du calendrier",
  description: "Liste les publications (programmées, publiées, brouillons) sur une période. Par défaut : des 7 derniers jours aux 30 prochains. À appeler pour vérifier le calendrier avant de programmer (rythme, créneaux déjà pris).",
  input: z.object({
    from: IsoDate.optional().describe("Début de la période (ISO 8601)."),
    to: IsoDate.optional().describe("Fin de la période (ISO 8601)."),
    status: z.array(z.enum(["draft", "scheduled", "publishing", "published", "failed", "cancelled"])).max(6).optional(),
  }),
  run: async (i) => {
    const now = Date.now();
    const from = i.from ?? new Date(now - 7 * 86_400_000).toISOString();
    const to = i.to ?? new Date(now + 30 * 86_400_000).toISOString();
    const posts = await listPosts({ from, to, includeDrafts: true, status: i.status });
    return { summary: plural(posts.length, "publication"), data: { from, to, timezone: tz, posts: posts.map(compactPost) } };
  },
});

export const createDraftPost = defineTool({
  name: "create_draft_post",
  label: "Brouillon de publication",
  description:
    "Crée un brouillon de publication dans l'Atelier (rien n'est envoyé aux réseaux, aucune confirmation nécessaire). scheduled_for est une date prévue, gardée sur le brouillon pour plus tard. Lis voix-june avant d'écrire la légende.",
  input: z.object({
    caption: z.string().min(1).max(2200).describe("Légende complète, dans la voix June."),
    asset_ids: z.array(Uuid).min(1).max(20).describe("Médias dans l'ordre (carrousel)."),
    account_ids: z.array(z.string().min(1).max(80)).max(10).optional().describe("Comptes visés (list_social_accounts), facultatif pour un brouillon."),
    scheduled_for: IsoDate.optional().describe("Date prévue (ISO 8601), gardée sur le brouillon."),
    first_comment: z.string().max(2200).optional(),
  }),
  run: async (i, ctx) => {
    await requireAssets(i.asset_ids);
    const targets = i.account_ids?.length ? await resolveTargets(i.account_ids) : [];
    const options: PostOptions = i.scheduled_for ? { plannedFor: new Date(i.scheduled_for).toISOString() } : {};
    const post = await createPost({ caption: i.caption, assetIds: i.asset_ids, targets, scheduledFor: null, firstComment: i.first_comment ?? null, options }, ctx.actor);
    return { summary: `Brouillon créé${targets.length ? ` pour ${targetsLabel(targets)}` : ""}`, data: { ...compactPost(post), link: "/programmation" }, refresh: ["posts"], assetIds: i.asset_ids.slice(0, 12) };
  },
});

export const schedulePost = defineTool({
  name: "schedule_post",
  label: "Programmation",
  description:
    "Programme une publication sur des comptes connectés via Zernio, à une date précise ou au prochain créneau (\"next-slot\"). NE S'EXÉCUTE PAS DIRECTEMENT : l'Atelier affiche une carte de confirmation. " +
    "Avant : lis les skills programmation et voix-june, vérifie le calendrier (list_posts) et prépare la légende finale. Appelle l'outil une seule fois puis dis à l'utilisateur de confirmer sur la carte.",
  input: z.object({
    caption: z.string().min(1).max(2200).describe("Légende finale, dans la voix June."),
    asset_ids: z.array(Uuid).min(1).max(20).describe("Médias dans l'ordre (carrousel ou vidéo)."),
    account_ids: z.array(z.string().min(1).max(80)).min(1).max(10).describe("Comptes (list_social_accounts)."),
    scheduled_for: z.union([z.literal("next-slot"), IsoDate]).describe('Date ISO 8601 avec décalage (heure de Paris), ou "next-slot" pour le prochain créneau de la file.'),
    first_comment: z.string().max(2200).optional().describe("Premier commentaire (ex. hashtags selon le skill programmation)."),
    instagram_type: z.enum(["feed", "reel", "story"]).optional().describe("Instagram : publication classique, Reel ou story."),
  }),
  confirm: {
    prepare: async (i) => {
      const assets = await requireAssets(i.asset_ids);
      const targets = await resolveTargets(i.account_ids);
      let scheduledFor: string;
      if (i.scheduled_for === "next-slot") scheduledFor = "next-slot";
      else {
        const t = Date.parse(i.scheduled_for);
        if (t < Date.now() + 60_000) throw new Error(`La date ${parisDateTime(i.scheduled_for, tz)} est déjà passée : choisis une date future.`);
        scheduledFor = new Date(t).toISOString();
      }
      const when = scheduledFor === "next-slot" ? "au prochain créneau" : `le ${parisDateTime(scheduledFor, tz)}`;
      const options: PostOptions = i.instagram_type ? { instagramType: i.instagram_type } : {};
      return {
        summary: `Programmer sur ${targetsLabel(targets)} ${when} : ${countKinds(assets)}, « ${excerpt(i.caption, 48)} »`,
        input: { caption: i.caption, assetIds: assets.map((a) => a.id), targets, scheduledFor, firstComment: i.first_comment ?? null, options },
        assetIds: assets.map((a) => a.id).slice(0, 12),
      };
    },
    execute: async (stored, actor) => {
      const post = await createPost(
        {
          caption: String(stored.caption ?? ""),
          assetIds: (stored.assetIds as string[]) ?? [],
          targets: (stored.targets as PostTarget[]) ?? [],
          scheduledFor: (stored.scheduledFor as string | null) ?? null,
          firstComment: (stored.firstComment as string | null) ?? null,
          options: (stored.options as PostOptions) ?? {},
        },
        actor,
      );
      const when = post.scheduledFor ? `le ${parisDateTime(post.scheduledFor, post.timezone || tz)}` : "au prochain créneau";
      return { summary: `Publication programmée ${when} sur ${targetsLabel(post.targets)}`, data: { ...compactPost(post), link: "/programmation" }, refresh: ["posts", "stats"], assetIds: post.assetIds.slice(0, 12) };
    },
  },
});

export const cancelPostTool = defineTool({
  name: "cancel_post",
  label: "Annulation d'une publication",
  description: "Annule une publication programmée (retirée de Zernio, gardée en brouillon). NE S'EXÉCUTE PAS DIRECTEMENT : l'Atelier affiche une carte de confirmation.",
  input: z.object({ id: Uuid.describe("Publication (list_posts).") }),
  confirm: {
    prepare: async (i) => {
      const post = await getPost(i.id);
      if (!post) throw new Error("Publication introuvable (list_posts).");
      if (post.status === "published") throw new Error("Cette publication est déjà publiée : elle ne peut plus être annulée.");
      if (post.status === "cancelled" || post.status === "draft") throw new Error("Cette publication n'est pas programmée.");
      const when = post.scheduledFor ? ` du ${parisDateTime(post.scheduledFor, post.timezone || tz)}` : "";
      return { summary: `Annuler la publication${when} sur ${targetsLabel(post.targets)} : « ${excerpt(post.caption, 48)} »`, input: { id: post.id }, assetIds: post.assetIds.slice(0, 12) };
    },
    execute: async (stored, actor) => {
      const post = await cancelPost(String(stored.id), actor);
      return { summary: "Publication annulée (gardée en brouillon)", data: { ...compactPost(post), link: "/programmation" }, refresh: ["posts", "stats"] };
    },
  },
});

export const POST_TOOLS = [listSocialAccountsTool, listPostsTool, createDraftPost, schedulePost, cancelPostTool];

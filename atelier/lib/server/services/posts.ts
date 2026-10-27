import "server-only";
import { randomUUID } from "node:crypto";
import { arr, getDb, iso, isoOrNull, jsonOrNull, num, type Db, type Row } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { badRequest, HttpError, notConfigured, notFound } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import { getAssets, getStorageKeys } from "@/lib/server/repo/assets";
import { getSkill } from "@/lib/server/services/skills";
import { getStore } from "@/lib/server/storage";
import { getZernio, NOT_CONFIGURED_MESSAGE, ZernioError, type ZernioClient } from "@/lib/server/zernio/client";
import { rehostAssets, type MediaCache } from "@/lib/server/zernio/media";
import {
  checkPost,
  facebookTypeFor,
  instagramTypeFor,
  platformLabel,
  rulesFromSkillData,
  tiktokCommercial,
  type MediaFacts,
  type PostCheck,
  type PostIssue,
  type ScheduleRules,
} from "@/lib/server/zernio/rules";
import type { ZAccount, ZCreatePostRequest, ZMediaItem, ZPlatformEntry, ZPlatformResult, ZPlatformTarget, ZPost, ZPostStatus, ZWebhookEvent, ZWriteResult } from "@/lib/server/zernio/types";
import type { Asset, PostOptions, PostStatus, PostTarget, ScheduledPost, SocialAccount } from "@/lib/shared/types";

/**
 * Programmation des publications (Instagram, Facebook, TikTok) via Zernio.
 *
 * atelier.posts est le miroir local : les brouillons n'existent que chez nous ; une publication
 * programmée existe aussi chez Zernio (zernio_post_id). Les statuts reviennent par webhook
 * (/api/webhooks/zernio) et par syncPosts() (filet de sécurité appelé par l'écran toutes les 60 s).
 * Réglages de June (horaires, hashtags, délai minimal) : skill « programmation ».
 */

/**
 * CONTRAT (fondation) — implémenté par le module Programmation (Zernio).
 */
export interface CreatePostInput {
  caption: string;
  assetIds: string[];
  targets: PostTarget[];
  /** ISO 8601 ; null = brouillon ; "next-slot" = prochain créneau de la file Zernio. */
  scheduledFor: string | null | "next-slot";
  firstComment?: string | null;
  options?: PostOptions;
}

/** Compte Zernio tel qu'affiché dans le compositeur. */
export type SocialAccountInfo = SocialAccount & { needsReconnection: boolean; platformLabel: string };

export interface PostValidation {
  valid: boolean;
  errors: PostIssue[];
  warnings: PostIssue[];
}

interface PostResult {
  urls?: Record<string, string>;
  media?: MediaCache;
  idempotencyKey?: string;
  zernioStatus?: ZPostStatus;
  platforms?: { platform: string; accountId: string | null; status: string; url: string | null; error: string | null; publishedAt: string | null }[];
  warnings?: string[];
  syncedAt?: string;
  [key: string]: unknown;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------------------------
// Lignes

function toPost(r: Row): ScheduledPost {
  return {
    id: r.id as string,
    zernioPostId: (r.zernio_post_id as string | null) ?? null,
    status: r.status as PostStatus,
    caption: (r.caption as string) ?? "",
    firstComment: (r.first_comment as string | null) ?? null,
    assetIds: arr(r.asset_ids),
    targets: jsonOrNull<PostTarget[]>(r.targets) ?? [],
    scheduledFor: isoOrNull(r.scheduled_for),
    timezone: (r.timezone as string) ?? env.zernio.timezone,
    options: jsonOrNull<PostOptions>(r.options) ?? {},
    error: (r.error as string | null) ?? null,
    result: jsonOrNull<ScheduledPost["result"]>(r.result),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    createdBy: (r.created_by as string | null) ?? null,
  };
}

interface RowPatch {
  status?: PostStatus;
  caption?: string;
  firstComment?: string | null;
  assetIds?: string[];
  targets?: PostTarget[];
  scheduledFor?: string | null;
  options?: PostOptions;
  error?: string | null;
  result?: PostResult | null;
  zernioPostId?: string | null;
}

async function saveRow(id: string, p: RowPatch, db?: Db): Promise<ScheduledPost> {
  const d = db ?? (await getDb());
  const sets: string[] = [];
  const params: unknown[] = [];
  const set = (col: string, v: unknown, cast = "") => {
    params.push(v);
    sets.push(`${col} = $${params.length}${cast}`);
  };
  if (p.status !== undefined) set("status", p.status);
  if (p.caption !== undefined) set("caption", p.caption);
  if (p.firstComment !== undefined) set("first_comment", p.firstComment);
  if (p.assetIds !== undefined) set("asset_ids", p.assetIds, "::uuid[]");
  if (p.targets !== undefined) set("targets", JSON.stringify(p.targets), "::jsonb");
  if (p.scheduledFor !== undefined) set("scheduled_for", p.scheduledFor, "::timestamptz");
  if (p.options !== undefined) set("options", JSON.stringify(p.options), "::jsonb");
  if (p.error !== undefined) set("error", p.error);
  if (p.result !== undefined) set("result", p.result ? JSON.stringify(p.result) : null, "::jsonb");
  if (p.zernioPostId !== undefined) set("zernio_post_id", p.zernioPostId);
  params.push(id);
  const r = await d.one(`update atelier.posts set ${sets.join(", ")}${sets.length ? ", " : ""}updated_at = now() where id = $${params.length} returning *`, params);
  if (!r) throw notFound("Publication");
  return toPost(r);
}

// ---------------------------------------------------------------------------------------------
// Réglages, formats

let rulesCache: { at: number; rules: ScheduleRules } | null = null;

/** Réglages du skill « programmation » (data.json), avec valeurs par défaut prudentes. */
export async function scheduleRules(): Promise<ScheduleRules> {
  if (rulesCache && Date.now() - rulesCache.at < 30_000) return rulesCache.rules;
  let data: Record<string, unknown> | null = null;
  try {
    const s = await getSkill("programmation");
    data = s && s.enabled ? s.data : null;
  } catch (err) {
    console.warn("[atelier] skill programmation illisible", err instanceof Error ? err.message : err);
  }
  const rules = rulesFromSkillData(data);
  rulesCache = { at: Date.now(), rules };
  return rules;
}

const parisDateTime = (tz: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: tz, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

function whenLabel(isoDate: string | null, tz: string): string {
  return isoDate ? parisDateTime(tz).format(new Date(isoDate)) : "sans date";
}

function captionExcerpt(c: string): string {
  const t = c.replace(/\s+/g, " ").trim();
  return t ? `« ${t.length > 60 ? `${t.slice(0, 59)}…` : t} »` : "sans légende";
}

function targetsLabel(targets: PostTarget[]): string {
  const names = [...new Set(targets.map((t) => platformLabel(t.platform)))];
  return names.length ? names.join(", ") : "aucun compte";
}

// ---------------------------------------------------------------------------------------------
// Comptes

let accountsCache: { at: number; accounts: ZAccount[] } | null = null;

async function zernioAccounts(force = false): Promise<ZAccount[]> {
  if (!force && accountsCache && Date.now() - accountsCache.at < 60_000) return accountsCache.accounts;
  const accounts = await getZernio().listAccounts();
  accountsCache = { at: Date.now(), accounts };
  return accounts;
}

function profileIdOf(a: ZAccount): string | null {
  return typeof a.profileId === "string" ? a.profileId : a.profileId?._id ?? null;
}

function toSocialAccount(a: ZAccount): SocialAccountInfo {
  return {
    id: a._id,
    platform: a.platform,
    username: a.username ?? a.displayName ?? a._id,
    displayName: a.displayName ?? null,
    avatarUrl: a.profilePicture ?? null,
    profileId: profileIdOf(a),
    needsReconnection: Boolean(a.needsReconnection),
    platformLabel: platformLabel(a.platform),
  };
}

export async function zernioConfigured(): Promise<boolean> {
  return Boolean(env.zernio.apiKey);
}

export async function listSocialAccounts(opts: { force?: boolean } = {}): Promise<SocialAccountInfo[]> {
  if (!(await zernioConfigured())) return [];
  const accounts = await zernioAccounts(opts.force);
  return accounts.filter((a) => a.isActive !== false && a.enabled !== false).map(toSocialAccount);
}

/** Infos TikTok du compte (niveaux de confidentialité, réglages autorisés, plafond de durée). */
export async function tiktokCreatorInfo(accountId: string, mediaType: "video" | "photo" = "video") {
  return getZernio().tiktokCreatorInfo(accountId, mediaType);
}

/** Prochain créneau libre de la file Zernio (aperçu, pour l'afficher dans le compositeur). */
export async function nextQueueSlot(accountId?: string | null): Promise<{ nextSlot: string; timezone: string; queueName: string | null } | null> {
  const accounts = await listSocialAccounts();
  const acc = (accountId && accounts.find((a) => a.id === accountId)) || accounts[0];
  if (!acc?.profileId) return null;
  try {
    const s = await getZernio().nextSlot(acc.profileId);
    return s?.nextSlot ? { nextSlot: s.nextSlot, timezone: s.timezone, queueName: s.queueName ?? null } : null;
  } catch (err) {
    if (err instanceof ZernioError && (err.status === 404 || err.status === 400)) return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------------------------
// Lecture

/** Publications dont la date tombe dans [from, to] (ISO), plus les brouillons sans date si includeDrafts. */
export async function listPosts(range: { from?: string; to?: string; includeDrafts?: boolean; status?: ScheduledPost["status"][] }): Promise<ScheduledPost[]> {
  const db = await getDb();
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const dated: string[] = ["scheduled_for is not null"];
  if (range.from) dated.push(`scheduled_for >= ${p(range.from)}::timestamptz`);
  if (range.to) dated.push(`scheduled_for <= ${p(range.to)}::timestamptz`);
  let where = `(${dated.join(" and ")})`;
  if (range.includeDrafts) where = `(${where} or scheduled_for is null)`;
  if (range.status?.length) where += ` and status = any(${p(range.status)}::text[])`;
  const rows = await db.query(`select * from atelier.posts where ${where} order by scheduled_for asc nulls first, created_at desc limit 1000`, params);
  return rows.map(toPost);
}

export async function getPost(id: string): Promise<ScheduledPost | null> {
  if (!UUID.test(id)) return null;
  const db = await getDb();
  const r = await db.one(`select * from atelier.posts where id = $1`, [id]);
  return r ? toPost(r) : null;
}

/** Médias des publications, indexés par identifiant (vignettes du calendrier). */
export async function postAssets(posts: ScheduledPost[]): Promise<Record<string, Asset>> {
  const ids = [...new Set(posts.flatMap((p) => p.assetIds))];
  const assets = await getAssets(ids);
  return Object.fromEntries(assets.map((a) => [a.id, a]));
}

async function requirePost(id: string): Promise<ScheduledPost> {
  const p = await getPost(id);
  if (!p) throw notFound("Publication");
  return p;
}

// ---------------------------------------------------------------------------------------------
// Vérification

function cleanInput(input: CreatePostInput): CreatePostInput {
  const seen = new Set<string>();
  const targets = input.targets.filter((t) => {
    if (!t.accountId || seen.has(t.accountId)) return false;
    seen.add(t.accountId);
    return true;
  });
  return {
    caption: input.caption ?? "",
    assetIds: [...new Set(input.assetIds)],
    targets: targets.map((t) => ({ platform: t.platform.toLowerCase(), accountId: t.accountId, username: t.username ?? null })),
    scheduledFor: input.scheduledFor,
    firstComment: input.firstComment?.trim() ? input.firstComment : null,
    options: input.options ?? {},
  };
}

function factsOf(a: Asset): MediaFacts {
  return { id: a.id, name: a.name, kind: a.kind, mime: a.mime, durationS: a.durationS };
}

async function loadAssets(ids: string[]): Promise<Asset[]> {
  const assets = await getAssets(ids);
  if (assets.length !== ids.length) throw badRequest("Un des médias est introuvable (supprimé définitivement ?). Retirez-le de la publication.");
  return assets;
}

function parisDay(isoDate: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(isoDate));
}

/** Vérifie une publication (règles des plateformes, du skill, comptes Zernio, date). */
async function checkInput(input: CreatePostInput, opts: { scheduling: boolean; excludePostId?: string }): Promise<PostCheck & { assets: Asset[]; rules: ScheduleRules }> {
  const rules = await scheduleRules();
  const assets = await loadAssets(input.assetIds);
  const options = input.options ?? {};
  const check = checkPost(
    { caption: input.caption, firstComment: input.firstComment ?? null, targets: input.targets, media: assets.map(factsOf), options, scheduling: opts.scheduling },
    rules,
  );
  if (!opts.scheduling) return { ...check, assets, rules };

  if (assets.some((a) => a.trashedAt)) check.errors.push({ field: "media", message: "Un des médias est dans la corbeille : restaurez-le ou retirez-le." });

  // Date
  const when = input.scheduledFor;
  if (when && when !== "next-slot") {
    const t = Date.parse(when);
    if (Number.isNaN(t)) check.errors.push({ field: "date", message: "Date de publication invalide." });
    else if (t < Date.now() - 60_000) check.errors.push({ field: "date", message: "Cette date est passée : choisissez une date à venir." });
    else if (t < Date.now() + rules.minLeadMinutes * 60_000) {
      check.warnings.push({ field: "date", message: `Publication dans ${rules.minLeadMinutes} minutes environ (délai minimal).` });
    }
  }

  // Comptes Zernio
  if (await zernioConfigured()) {
    try {
      const accounts = await zernioAccounts();
      for (const t of input.targets) {
        const a = accounts.find((x) => x._id === t.accountId);
        if (!a) check.errors.push({ field: "targets", platform: t.platform, message: `Compte ${platformLabel(t.platform)} introuvable dans Zernio : actualisez la liste des comptes.` });
        else if (a.needsReconnection) check.errors.push({ field: "targets", platform: t.platform, message: `Le compte ${platformLabel(t.platform)} @${a.username ?? ""} est à reconnecter dans Zernio.` });
        else if (a.rateLimitedUntil && Date.parse(a.rateLimitedUntil) > Date.now()) {
          check.warnings.push({ field: "targets", platform: t.platform, message: `Zernio a mis en pause le compte @${a.username ?? ""} jusqu'à ${whenLabel(a.rateLimitedUntil, rules.timezone)}.` });
        }
      }
    } catch (err) {
      check.warnings.push({ field: "targets", message: `Comptes Zernio non vérifiés : ${err instanceof Error ? err.message : "erreur"}` });
    }
  }

  // TikTok : déclaration obligatoire (consentement donné au clic sur « Programmer »).
  if (input.targets.some((t) => t.platform === "tiktok") && options.tiktokConsent !== true) {
    check.errors.push({ field: "tiktok", platform: "tiktok", message: "TikTok : confirmez la déclaration de publication (musique, contenu de marque)." });
  }

  // Skill : pas deux Reels le même jour.
  const igType = instagramTypeFor(options, assets);
  if (rules.maxReelsPerDay && igType === "reel" && input.targets.some((t) => t.platform === "instagram") && when && when !== "next-slot" && !Number.isNaN(Date.parse(when))) {
    const db = await getDb();
    const day = parisDay(when, rules.timezone);
    const r = await db.one<{ n: unknown }>(
      `select count(*) as n from atelier.posts
        where status in ('scheduled', 'publishing', 'published') and scheduled_for is not null
          and to_char(scheduled_for at time zone $1, 'YYYY-MM-DD') = $2
          and options->>'instagramType' = 'reel' and targets @> '[{"platform":"instagram"}]'::jsonb
          and ($3::uuid is null or id <> $3::uuid)`,
      [rules.timezone, day, opts.excludePostId ?? null],
    );
    if (num(r?.n) >= rules.maxReelsPerDay) check.warnings.push({ field: "date", platform: "instagram", message: "Un Reel est déjà programmé ce jour-là : le skill conseille un seul Reel par jour." });
  }
  return { ...check, assets, rules };
}

function throwIfInvalid(errors: PostIssue[]) {
  if (errors.length === 0) return;
  const more = errors.length > 1 ? ` (et ${errors.length - 1} autre${errors.length > 2 ? "s" : ""} point${errors.length > 2 ? "s" : ""} à corriger)` : "";
  throw new HttpError(400, "invalid_post", `${errors[0].message}${more}`);
}

/** Vérification à blanc (compositeur) : règles locales, puis validation Zernio si configuré. */
export async function validatePost(raw: CreatePostInput, opts: { postId?: string } = {}): Promise<PostValidation> {
  const input = cleanInput(raw);
  const scheduling = input.scheduledFor !== null;
  const check = await checkInput(input, { scheduling, excludePostId: opts.postId });
  if (scheduling && !(await zernioConfigured())) check.errors.push({ field: "options", message: NOT_CONFIGURED_MESSAGE });
  if (scheduling && check.errors.length === 0 && (await zernioConfigured()) && input.targets.length) {
    try {
      const post = opts.postId ? await getPost(opts.postId) : null;
      const cache = ((post?.result as PostResult | null)?.media ?? {}) as MediaCache;
      const mediaItems: ZMediaItem[] = [];
      for (const a of check.assets) {
        const keys = await getStorageKeys(a.id);
        const url = cache[a.id]?.url ?? (keys ? await getStore().presignGet(keys.original, { ttlS: 900 }) : "");
        mediaItems.push({ type: a.kind === "video" ? "video" : "image", url, mimeType: a.mime });
      }
      const fake: ScheduledPost = { ...draftShape(input), id: opts.postId ?? randomUUID() };
      const req = buildRequest(fake, check.assets, mediaItems);
      const res = await getZernio().validatePost(req);
      for (const e of res.errors ?? []) check.errors.push({ field: "options", platform: e.platform, message: `${platformLabel(e.platform)} (Zernio) : ${e.error}` });
      for (const w of res.warnings ?? []) check.warnings.push({ field: "options", platform: w.platform, message: `${platformLabel(w.platform)} (Zernio) : ${w.warning}` });
    } catch (err) {
      check.warnings.push({ field: "options", message: `Vérification Zernio indisponible : ${err instanceof Error ? err.message : "erreur"}` });
    }
  }
  return { valid: check.errors.length === 0, errors: check.errors, warnings: check.warnings };
}

function draftShape(input: CreatePostInput): Omit<ScheduledPost, "id"> {
  const now = new Date().toISOString();
  return {
    zernioPostId: null,
    status: "draft",
    caption: input.caption,
    firstComment: input.firstComment ?? null,
    assetIds: input.assetIds,
    targets: input.targets,
    scheduledFor: input.scheduledFor && input.scheduledFor !== "next-slot" ? input.scheduledFor : null,
    timezone: env.zernio.timezone,
    options: input.options ?? {},
    error: null,
    result: null,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
  };
}

/** Options enregistrées : le type Instagram effectif est figé (une vidéo seule = Reel). */
function normalizeOptions(options: PostOptions, assets: Asset[], targets: PostTarget[]): PostOptions {
  const out: PostOptions = { ...options };
  if (targets.some((t) => t.platform === "instagram")) out.instagramType = instagramTypeFor(options, assets);
  if (out.instagramType === "reel" && out.shareToFeed === undefined) out.shareToFeed = true;
  return out;
}

// ---------------------------------------------------------------------------------------------
// Envoi à Zernio

function buildRequest(post: ScheduledPost, assets: Asset[], mediaItems: ZMediaItem[]): ZCreatePostRequest {
  const o = post.options ?? {};
  const photos = assets.filter((a) => a.kind === "photo").length;
  const isVideo = assets.some((a) => a.kind === "video");
  const firstComment = post.firstComment?.trim() || undefined;
  const platforms: ZPlatformEntry[] = post.targets.map((t) => {
    if (t.platform === "instagram") {
      const type = instagramTypeFor(o, assets);
      const data: NonNullable<ZPlatformEntry["platformSpecificData"]> & Record<string, unknown> = {};
      if (type === "story") data.contentType = "story";
      if (type === "reel") {
        data.shareToFeed = o.shareToFeed !== false;
        if (typeof o.coverTimeS === "number") data.thumbOffset = Math.max(0, Math.round(o.coverTimeS * 1000));
      }
      if (type !== "story" && firstComment) data.firstComment = firstComment;
      return { platform: "instagram", accountId: t.accountId, platformSpecificData: data };
    }
    if (t.platform === "facebook") {
      const type = facebookTypeFor(o);
      const data: Record<string, unknown> = {};
      if (type !== "feed") data.contentType = type;
      if (type !== "story" && firstComment) data.firstComment = firstComment;
      return { platform: "facebook", accountId: t.accountId, platformSpecificData: data };
    }
    if (t.platform === "tiktok") {
      const c = tiktokCommercial(o);
      const data: Record<string, unknown> = {
        privacyLevel: o.tiktokPrivacy,
        allowComment: o.tiktokAllowComment === true,
        contentPreviewConfirmed: o.tiktokConsent === true,
        expressConsentGiven: o.tiktokConsent === true,
        mediaType: isVideo ? "video" : "photo",
        commercialContentType: !c ? "none" : c.branded ? "brand_content" : "brand_organic",
      };
      if (isVideo) {
        data.allowDuet = o.tiktokAllowDuet === true;
        data.allowStitch = o.tiktokAllowStitch === true;
        if (typeof o.coverTimeS === "number") data.videoCoverTimestampMs = Math.max(0, Math.round(o.coverTimeS * 1000));
      } else if (photos > 0 && post.caption) {
        // Photos : le titre est coupé à 90 caractères, la légende complète va dans description.
        data.description = post.caption.slice(0, 4000);
      }
      return { platform: "tiktok", accountId: t.accountId, platformSpecificData: data };
    }
    return { platform: t.platform, accountId: t.accountId };
  });
  return {
    content: post.caption,
    mediaItems,
    platforms,
    timezone: post.timezone || env.zernio.timezone,
    metadata: { atelierPostId: post.id },
  };
}

/** Statut local d'après Zernio. « partial » (publié en partie) devient publié + message d'erreur. */
function localStatus(z: ZPostStatus | undefined, fallback: PostStatus): PostStatus {
  switch (z) {
    case "draft":
      return "draft";
    case "pending_approval":
    case "scheduled":
      return "scheduled";
    case "publishing":
      return "publishing";
    case "published":
    case "partial":
      return "published";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return fallback;
  }
}

function accountIdOf(v: ZPlatformTarget): string | null {
  const a = v.accountId;
  return typeof a === "string" ? a : a?._id ?? null;
}

/** Fusionne l'état Zernio d'une publication dans notre ligne (statut, liens, erreurs). */
function mergeZernioState(cur: ScheduledPost, z: ZPost, platformResults?: ZPlatformResult[], warnings?: string[]): RowPatch {
  const prev = (cur.result ?? {}) as PostResult;
  const platforms = (z.platforms ?? []).map((p) => ({
    platform: p.platform,
    accountId: accountIdOf(p),
    status: String(p.status ?? "pending"),
    url: p.platformPostUrl ?? null,
    error: p.errorMessage ?? null,
    publishedAt: p.publishedAt ?? null,
  }));
  for (const r of platformResults ?? []) {
    const hit = platforms.find((p) => p.platform === r.platform);
    if (hit && r.error && !hit.error) hit.error = r.error;
  }
  const urls: Record<string, string> = { ...(prev.urls ?? {}) };
  for (const p of platforms) if (p.url) urls[p.platform] = p.url;
  const status = localStatus(z.status, cur.status);
  const failed = platforms.filter((p) => p.status === "failed" || (p.error && p.status !== "published"));
  let error: string | null = null;
  if (z.status === "failed" || z.status === "partial") {
    const parts = failed.map((p) => `${platformLabel(p.platform)} : ${p.error ?? "échec"}`);
    error = `${z.status === "partial" ? "Publié en partie. " : ""}${parts.join(" · ") || "Zernio signale un échec de publication."}`;
  }
  return {
    status,
    error,
    zernioPostId: z._id,
    scheduledFor: z.scheduledFor ?? cur.scheduledFor,
    result: { ...prev, urls, platforms, zernioStatus: z.status, warnings: warnings ?? prev.warnings, syncedAt: new Date().toISOString() },
  };
}

async function deleteOnZernio(z: ZernioClient, zernioPostId: string) {
  try {
    await z.deletePost(zernioPostId);
  } catch (err) {
    if (err instanceof ZernioError && err.zernio.status === 404) return;
    if (err instanceof ZernioError && err.zernioCode === "invalid_resource_state") {
      throw badRequest("Zernio indique que la publication est déjà partie : Instagram et TikTok ne permettent pas de la retirer depuis l'Atelier.");
    }
    throw err;
  }
}

type When = { mode: "date"; iso: string } | { mode: "queue" };

function resolveWhen(value: string, rules: ScheduleRules): When {
  if (value === "next-slot") return { mode: "queue" };
  const t = Date.parse(value);
  if (Number.isNaN(t)) throw badRequest("Date de publication invalide.");
  // Une date passée publierait immédiatement, dans la requête : on la repousse au délai minimal.
  const min = Date.now() + rules.minLeadMinutes * 60_000;
  return { mode: "date", iso: new Date(Math.max(t, min)).toISOString() };
}

/** Recopie les médias, crée ou met à jour la publication chez Zernio, et enregistre le résultat. */
async function pushToZernio(post: ScheduledPost, assets: Asset[], when: When): Promise<ScheduledPost> {
  const z = getZernio();
  const igReel = post.targets.some((t) => t.platform === "instagram") && instagramTypeFor(post.options, assets) === "reel";
  const prev = (post.result ?? {}) as PostResult;
  const { items, cache } = await rehostAssets(z, assets, prev.media ?? {}, { withPoster: igReel && typeof post.options.coverTimeS !== "number" });
  // Le cache est gardé même si la suite échoue : un nouvel essai ne renverra pas les fichiers.
  await saveRow(post.id, { result: { ...prev, media: cache } });

  const req = buildRequest(post, assets, items);
  let slotIso: string | null = null;
  if (when.mode === "queue") {
    const accounts = await zernioAccounts();
    const acc = accounts.find((a) => a._id === post.targets[0]?.accountId);
    const profileId = acc ? profileIdOf(acc) : null;
    if (!profileId) throw badRequest("Profil Zernio introuvable pour ce compte : choisissez une date.");
    try {
      slotIso = (await z.nextSlot(profileId)).nextSlot ?? null;
    } catch (err) {
      if (err instanceof ZernioError && (err.zernio.status === 404 || err.zernio.status === 400)) {
        throw badRequest("Aucune file de publication n'est configurée dans Zernio pour ce profil : choisissez une date.");
      }
      throw err;
    }
    // Zernio réserve le créneau lui-même (verrou de file) : ne pas recopier next-slot dans scheduledFor.
    req.queuedFromProfile = profileId;
  } else {
    req.scheduledFor = when.iso;
  }

  let res: ZWriteResult | null = null;
  if (post.zernioPostId) {
    try {
      res = await z.updatePost(post.zernioPostId, { ...req, isDraft: false });
    } catch (err) {
      // Supprimée entre-temps chez Zernio : on la recrée.
      if (!(err instanceof ZernioError && err.zernio.status === 404)) throw err;
    }
  }
  if (!res) {
    const key = randomUUID();
    await saveRow(post.id, { result: { ...prev, media: cache, idempotencyKey: key } });
    res = await z.createPost(req, key);
  }
  const zpost = res.body.post;
  const merged = mergeZernioState({ ...post, result: { ...prev, media: cache } }, zpost, res.body.platformResults, res.body.warnings);
  if (res.kind === "incomplete" && zpost.status === "scheduled") {
    // 207 + « scheduled » : erreurs passagères, Zernio réessaie tout seul. Pas un échec.
    merged.error = null;
  }
  if (!merged.scheduledFor) merged.scheduledFor = when.mode === "date" ? when.iso : slotIso;
  if (merged.status === "draft") merged.status = "scheduled";
  return saveRow(post.id, merged);
}

// ---------------------------------------------------------------------------------------------
// Écriture

/** Crée la publication : brouillon local, ou envoi à Zernio (médias recopiés chez Zernio) si une date est donnée. */
export async function createPost(raw: CreatePostInput, actor: string | null): Promise<ScheduledPost> {
  const input = cleanInput(raw);
  const scheduling = input.scheduledFor !== null;
  if (scheduling && !(await zernioConfigured())) throw notConfigured(NOT_CONFIGURED_MESSAGE);
  const check = await checkInput(input, { scheduling });
  throwIfInvalid(check.errors);
  const options = normalizeOptions(input.options ?? {}, check.assets, input.targets);
  const db = await getDb();
  const r = await db.one(
    `insert into atelier.posts (status, caption, first_comment, asset_ids, targets, scheduled_for, timezone, options, created_by)
     values ('draft', $1, $2, $3::uuid[], $4::jsonb, null, $5, $6::jsonb, $7) returning *`,
    [input.caption, input.firstComment ?? null, input.assetIds, JSON.stringify(input.targets), env.zernio.timezone, JSON.stringify(options), actor],
  );
  const draft = toPost(r!);
  if (!scheduling) {
    await logActivity({ actor, verb: "a créé un brouillon", objectType: "post", objectId: draft.id, summary: captionExcerpt(draft.caption) });
    return draft;
  }
  try {
    const out = await pushToZernio(draft, check.assets, resolveWhen(input.scheduledFor as string, check.rules));
    await logActivity({
      actor,
      verb: "a programmé",
      objectType: "post",
      objectId: out.id,
      summary: `${targetsLabel(out.targets)} · ${whenLabel(out.scheduledFor, check.rules.timezone)} · ${captionExcerpt(out.caption)}`,
    });
    return out;
  } catch (err) {
    // Rien n'a été programmé : on ne laisse pas de brouillon fantôme (le compositeur garde la saisie).
    const left = await getPost(draft.id);
    if (left && !left.zernioPostId) await db.query(`delete from atelier.posts where id = $1`, [draft.id]);
    throw err;
  }
}

export async function updatePost(id: string, rawPatch: Partial<CreatePostInput>, actor: string | null): Promise<ScheduledPost> {
  const cur = await requirePost(id);
  if (cur.status === "published" || cur.status === "publishing") {
    throw badRequest("Cette publication est déjà publiée (ou en cours) : elle ne peut plus être modifiée. Dupliquez-la pour la republier.");
  }
  const merged = cleanInput({
    caption: rawPatch.caption ?? cur.caption,
    assetIds: rawPatch.assetIds ?? cur.assetIds,
    targets: rawPatch.targets ?? cur.targets,
    firstComment: rawPatch.firstComment !== undefined ? rawPatch.firstComment : cur.firstComment,
    options: rawPatch.options ? { ...cur.options, ...rawPatch.options } : cur.options,
    // Sans date fournie : une publication programmée le reste (renvoyée à Zernio), un brouillon reste brouillon.
    scheduledFor: rawPatch.scheduledFor !== undefined ? rawPatch.scheduledFor : cur.status === "scheduled" ? (cur.scheduledFor ?? "next-slot") : null,
  });
  const scheduling = merged.scheduledFor !== null;

  if (!scheduling) {
    const check = await checkInput(merged, { scheduling: false });
    throwIfInvalid(check.errors);
    const wasOnZernio = Boolean(cur.zernioPostId);
    if (cur.zernioPostId) {
      if (!(await zernioConfigured())) throw notConfigured(NOT_CONFIGURED_MESSAGE);
      await deleteOnZernio(getZernio(), cur.zernioPostId);
    }
    const prev = (cur.result ?? {}) as PostResult;
    const out = await saveRow(id, {
      status: "draft",
      caption: merged.caption,
      firstComment: merged.firstComment ?? null,
      assetIds: merged.assetIds,
      targets: merged.targets,
      options: normalizeOptions(merged.options ?? {}, check.assets, merged.targets),
      scheduledFor: rawPatch.scheduledFor === null ? null : cur.scheduledFor,
      zernioPostId: null,
      error: null,
      result: wasOnZernio ? { urls: prev.urls } : cur.result,
    });
    await logActivity({ actor, verb: wasOnZernio ? "a annulé la programmation de" : "a modifié le brouillon", objectType: "post", objectId: id, summary: captionExcerpt(out.caption) });
    return out;
  }

  if (!(await zernioConfigured())) throw notConfigured(NOT_CONFIGURED_MESSAGE);
  const check = await checkInput(merged, { scheduling: true, excludePostId: id });
  throwIfInvalid(check.errors);
  const next: ScheduledPost = {
    ...cur,
    caption: merged.caption,
    firstComment: merged.firstComment ?? null,
    assetIds: merged.assetIds,
    targets: merged.targets,
    options: normalizeOptions(merged.options ?? {}, check.assets, merged.targets),
  };
  try {
    const pushed = await pushToZernio(next, check.assets, resolveWhen(merged.scheduledFor as string, check.rules));
    // Les champs locaux ne sont enregistrés qu'une fois Zernio à jour.
    const out = await saveRow(id, { caption: next.caption, firstComment: next.firstComment, assetIds: next.assetIds, targets: next.targets, options: next.options });
    const wasScheduled = cur.status === "scheduled";
    await logActivity({
      actor,
      verb: wasScheduled ? "a modifié la publication" : "a programmé",
      objectType: "post",
      objectId: id,
      summary: `${targetsLabel(out.targets)} · ${whenLabel(pushed.scheduledFor, check.rules.timezone)} · ${captionExcerpt(out.caption)}`,
    });
    return out;
  } catch (err) {
    if (err instanceof HttpError) await saveRow(id, { error: err.message }).catch(() => undefined);
    throw err;
  }
}

/** Annule une publication programmée (la retire de Zernio, la garde en brouillon). */
export async function cancelPost(id: string, actor: string | null): Promise<ScheduledPost> {
  const cur = await requirePost(id);
  if (cur.status === "published" || cur.status === "publishing") {
    throw badRequest("Cette publication est déjà partie : Instagram et TikTok ne permettent pas de la retirer depuis l'Atelier.");
  }
  if (!cur.zernioPostId && cur.status === "draft") return cur;
  if (cur.zernioPostId) {
    if (!(await zernioConfigured())) throw notConfigured(NOT_CONFIGURED_MESSAGE);
    await deleteOnZernio(getZernio(), cur.zernioPostId);
  }
  const prev = (cur.result ?? {}) as PostResult;
  // La date reste affichée (brouillon daté) ; les médias recopiés chez Zernio sont oubliés.
  const out = await saveRow(id, { status: "draft", zernioPostId: null, error: null, result: { urls: prev.urls } });
  await logActivity({ actor, verb: "a annulé la programmation de", objectType: "post", objectId: id, summary: captionExcerpt(out.caption) });
  return out;
}

export async function deletePost(id: string, actor: string | null): Promise<void> {
  const cur = await requirePost(id);
  if (cur.zernioPostId && cur.status !== "published") {
    if (!(await zernioConfigured())) throw notConfigured(NOT_CONFIGURED_MESSAGE);
    await deleteOnZernio(getZernio(), cur.zernioPostId);
  }
  const db = await getDb();
  await db.query(`delete from atelier.posts where id = $1`, [id]);
  await logActivity({ actor, verb: "a supprimé la publication", objectType: "post", objectId: id, summary: captionExcerpt(cur.caption) });
}

/** Relance chez Zernio les comptes en échec d'une publication (POST /v1/posts/{id}/retry). */
export async function retryPost(id: string, actor: string | null): Promise<ScheduledPost> {
  const cur = await requirePost(id);
  if (!cur.zernioPostId || cur.status !== "failed") throw badRequest("Seule une publication en échec peut être relancée.");
  const res = await getZernio().retryPost(cur.zernioPostId);
  const out = await saveRow(id, mergeZernioState(cur, res.body.post, res.body.platformResults, res.body.warnings));
  await logActivity({ actor, verb: "a relancé la publication", objectType: "post", objectId: id, summary: captionExcerpt(out.caption) });
  return out;
}

async function noteStatusChange(before: ScheduledPost, after: ScheduledPost) {
  if (before.status === after.status) return;
  const summary = `${targetsLabel(after.targets)} · ${captionExcerpt(after.caption)}`;
  if (after.status === "published") await logActivity({ actor: null, verb: after.error ? "a publié en partie" : "a publié", objectType: "post", objectId: after.id, summary });
  else if (after.status === "failed") await logActivity({ actor: null, verb: "n'a pas pu publier", objectType: "post", objectId: after.id, summary: `${summary} — ${after.error ?? ""}`.slice(0, 300) });
}

/** Resynchronise les statuts avec Zernio (publiées, échecs, liens). */
export async function syncPosts(): Promise<{ updated: number }> {
  if (!(await zernioConfigured())) return { updated: 0 };
  const db = await getDb();
  // Seulement ce qui peut avoir bougé : publications échues (ou presque) et en cours.
  const rows = await db.query(
    `select * from atelier.posts
      where zernio_post_id is not null
        and (status = 'publishing' or (status = 'scheduled' and scheduled_for <= now() + interval '10 minutes'))
      order by scheduled_for asc limit 50`,
  );
  const z = getZernio();
  let updated = 0;
  for (const row of rows) {
    const cur = toPost(row);
    try {
      const zpost = await z.getPost(cur.zernioPostId!);
      const patch = mergeZernioState(cur, zpost);
      const out = await saveRow(cur.id, patch);
      if (out.status !== cur.status || out.error !== cur.error) updated++;
      await noteStatusChange(cur, out);
    } catch (err) {
      if (err instanceof ZernioError && err.zernio.status === 404) {
        const out = await saveRow(cur.id, { status: "failed", error: "Publication introuvable chez Zernio (supprimée depuis Zernio ?). Reprogrammez-la." , zernioPostId: null });
        updated++;
        await noteStatusChange(cur, out);
      } else throw err;
    }
  }
  return { updated };
}

// ---------------------------------------------------------------------------------------------
// Webhooks

async function findByZernio(evt: ZWebhookEvent): Promise<ScheduledPost | null> {
  const db = await getDb();
  const meta = evt.post?.metadata?.atelierPostId;
  if (typeof meta === "string" && UUID.test(meta)) {
    const r = await db.one(`select * from atelier.posts where id = $1`, [meta]);
    if (r) return toPost(r);
  }
  if (evt.post?.id) {
    const r = await db.one(`select * from atelier.posts where zernio_post_id = $1`, [evt.post.id]);
    if (r) return toPost(r);
  }
  return null;
}

const ROLLUP: Record<string, ZPostStatus> = {
  "post.scheduled": "scheduled",
  "post.published": "published",
  "post.partial": "partial",
  "post.failed": "failed",
  "post.cancelled": "cancelled",
};

/** Applique un événement webhook Zernio (déjà authentifié et dédoublonné). */
export async function applyZernioEvent(evt: ZWebhookEvent): Promise<{ postId: string | null; status: PostStatus | null }> {
  if (!evt.post) return { postId: null, status: null };
  const cur = await findByZernio(evt);
  if (!cur) return { postId: null, status: null };
  const prev = (cur.result ?? {}) as PostResult;
  // Événement tardif d'une publication annulée (retirée de Zernio) ou recréée depuis : on l'ignore.
  // Sans identifiant Zernio mais avec une clé d'idempotence, la création est en cours : on l'applique.
  if (cur.zernioPostId && evt.post.id && cur.zernioPostId !== evt.post.id) return { postId: cur.id, status: cur.status };
  if (!cur.zernioPostId && !prev.idempotencyKey) return { postId: cur.id, status: cur.status };
  const platforms = [...(prev.platforms ?? [])];
  const upsert = (p: { platform: string; accountId?: string | null; status?: string; publishedUrl?: string | null; error?: string | null }) => {
    const i = platforms.findIndex((x) => x.platform === p.platform && (!p.accountId || !x.accountId || x.accountId === p.accountId));
    const base = i >= 0 ? platforms[i] : { platform: p.platform, accountId: p.accountId ?? null, status: "pending", url: null, error: null, publishedAt: null };
    const next = { ...base, status: p.status ?? base.status, url: p.publishedUrl ?? base.url, error: p.error ?? (p.status === "published" ? null : base.error) };
    if (i >= 0) platforms[i] = next;
    else platforms.push(next);
  };
  for (const p of evt.post.platforms ?? []) upsert(p);
  if (evt.platform) upsert({ platform: evt.platform.name, accountId: evt.account?.accountId, status: evt.platform.status, publishedUrl: evt.platform.publishedUrl, error: evt.platform.error });

  const urls: Record<string, string> = { ...(prev.urls ?? {}) };
  for (const p of platforms) if (p.url) urls[p.platform] = p.url;

  let status = cur.status;
  let error = cur.error;
  const rollup = ROLLUP[evt.event];
  if (rollup) {
    if (!(rollup === "scheduled" && (cur.status === "published" || cur.status === "failed"))) status = localStatus(rollup, cur.status);
    if (rollup === "failed" || rollup === "partial") {
      const parts = platforms.filter((p) => p.status === "failed").map((p) => `${platformLabel(p.platform)} : ${p.error ?? "échec"}`);
      error = `${rollup === "partial" ? "Publié en partie. " : ""}${parts.join(" · ") || "Zernio signale un échec de publication."}`;
    } else if (rollup === "published") error = null;
  } else if (evt.event === "post.platform.published" && cur.status === "scheduled") {
    status = "publishing";
  }
  const out = await saveRow(cur.id, {
    status,
    error,
    zernioPostId: cur.zernioPostId ?? evt.post.id ?? null,
    result: { ...prev, urls, platforms, zernioStatus: rollup ?? prev.zernioStatus, syncedAt: new Date().toISOString() },
  });
  await noteStatusChange(cur, out);
  return { postId: out.id, status: out.status };
}

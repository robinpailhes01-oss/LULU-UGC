/**
 * Règles de publication (Instagram, Facebook, TikTok) et réglages du skill « programmation ».
 *
 * Module pur, sans dépendance serveur : le compositeur l'importe pour afficher les erreurs en
 * direct, le service posts l'applique avant tout envoi à Zernio (le serveur fait foi).
 * Les limites des plateformes viennent de la documentation Zernio (docs/zernio.md) ; les
 * habitudes de June (horaires, hashtags, rythme) viennent du skill, jamais d'ici.
 */
import type { PostOptions } from "@/lib/shared/types";

export const SOCIAL_PLATFORMS = ["instagram", "facebook", "tiktok"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** Longueur maximale de la légende par plateforme. */
export const CAPTION_LIMIT: Record<string, number> = {
  instagram: 2200,
  tiktok: 2200,
  facebook: 63206,
};

export const INSTAGRAM_FOLD = 125;
export const INSTAGRAM_CAROUSEL_MAX = 10;
export const FACEBOOK_IMAGES_MAX = 10;
export const TIKTOK_PHOTOS_MAX = 35;
export const TIKTOK_VIDEO_S = { min: 3, max: 600 };
export const INSTAGRAM_STORY_VIDEO_MAX_S = 60;
export const FACEBOOK_REEL_MAX_S = 60;

/** Types de fichiers acceptés par l'envoi de médias de Zernio (POST /v1/media/presign). */
export const ZERNIO_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"] as const;
export const ZERNIO_VIDEO_TYPES = ["video/mp4", "video/mpeg", "video/quicktime", "video/avi", "video/x-msvideo", "video/webm", "video/x-m4v"] as const;

export function zernioAcceptsMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return (ZERNIO_IMAGE_TYPES as readonly string[]).includes(m) || (ZERNIO_VIDEO_TYPES as readonly string[]).includes(m);
}

export const TIKTOK_PRIVACY: { value: NonNullable<PostOptions["tiktokPrivacy"]>; label: string }[] = [
  { value: "PUBLIC_TO_EVERYONE", label: "Tout le monde" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Amis" },
  { value: "SELF_ONLY", label: "Moi uniquement" },
];

// ---------------------------------------------------------------------------------------------
// Réglages du skill « programmation » (atelier/skills/programmation/data.json)

export interface ScheduleRules {
  timezone: string;
  slots: { weekday: string[]; weekend: string[] };
  defaultTime: { weekday: string; weekend: string };
  minLeadMinutes: number;
  postsPerWeek: { min: number; max: number } | null;
  maxReelsPerDay: number | null;
  hashtags: { min: number; max: number } | null;
  captionWarnAt: number;
  reelIdealDurationS: { min: number; max: number } | null;
  firstCommentHint: string | null;
}

export const DEFAULT_RULES: ScheduleRules = {
  timezone: "Europe/Paris",
  slots: { weekday: ["12:15", "18:30"], weekend: ["10:00"] },
  defaultTime: { weekday: "18:00", weekend: "18:00" },
  minLeadMinutes: 2,
  postsPerWeek: null,
  maxReelsPerDay: null,
  hashtags: null,
  captionWarnAt: 2000,
  reelIdealDurationS: null,
  firstCommentHint: null,
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function range(v: unknown): { min: number; max: number } | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return typeof o.min === "number" && typeof o.max === "number" && o.min <= o.max ? { min: o.min, max: o.max } : null;
}

function times(v: unknown, fallback: string[]): string[] {
  return Array.isArray(v) ? v.filter((t): t is string => typeof t === "string" && HHMM.test(t)) : fallback;
}

/** Lit les réglages du skill en tolérant un data.json incomplet ou modifié à la main. */
export function rulesFromSkillData(data: Record<string, unknown> | null | undefined): ScheduleRules {
  const d = data ?? {};
  const slots = (d.slots ?? {}) as Record<string, unknown>;
  const def = (d.defaultTime ?? {}) as Record<string, unknown>;
  const pickTime = (v: unknown, f: string) => (typeof v === "string" && HHMM.test(v) ? v : f);
  return {
    timezone: typeof d.timezone === "string" && d.timezone ? d.timezone : DEFAULT_RULES.timezone,
    slots: { weekday: times(slots.weekday, DEFAULT_RULES.slots.weekday), weekend: times(slots.weekend, DEFAULT_RULES.slots.weekend) },
    defaultTime: { weekday: pickTime(def.weekday, DEFAULT_RULES.defaultTime.weekday), weekend: pickTime(def.weekend, DEFAULT_RULES.defaultTime.weekend) },
    minLeadMinutes: typeof d.minLeadMinutes === "number" && d.minLeadMinutes >= 1 ? d.minLeadMinutes : DEFAULT_RULES.minLeadMinutes,
    postsPerWeek: range(d.postsPerWeek),
    maxReelsPerDay: typeof d.maxReelsPerDay === "number" && d.maxReelsPerDay > 0 ? d.maxReelsPerDay : null,
    hashtags: range(d.hashtags),
    captionWarnAt: typeof d.captionWarnAt === "number" && d.captionWarnAt > 0 ? d.captionWarnAt : DEFAULT_RULES.captionWarnAt,
    reelIdealDurationS: range(d.reelIdealDurationS),
    firstCommentHint: typeof d.firstCommentHint === "string" ? d.firstCommentHint : null,
  };
}

// ---------------------------------------------------------------------------------------------
// Vérification d'une publication

export interface MediaFacts {
  id: string;
  name: string;
  kind: "photo" | "video" | "audio";
  mime: string;
  durationS: number | null;
}

export interface PostDraftForCheck {
  caption: string;
  firstComment: string | null;
  targets: { platform: string; accountId: string }[];
  media: MediaFacts[];
  options: PostOptions;
  /** true : la publication part chez Zernio (règles complètes) ; false : simple brouillon. */
  scheduling: boolean;
}

export type IssueField = "media" | "caption" | "targets" | "date" | "tiktok" | "firstComment" | "options";

export interface PostIssue {
  field: IssueField;
  platform?: string;
  message: string;
}

export interface PostCheck {
  errors: PostIssue[];
  warnings: PostIssue[];
}

export function platformLabel(p: string): string {
  return p === "instagram" ? "Instagram" : p === "facebook" ? "Facebook" : p === "tiktok" ? "TikTok" : p;
}

export function countHashtags(text: string): number {
  return (text.match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? []).length;
}

export function fr(n: number): string {
  return n.toLocaleString("fr-FR");
}

/** Type Instagram réellement publié : une vidéo seule part toujours en Reel (règle Instagram). */
export function instagramTypeFor(options: PostOptions, media: Pick<MediaFacts, "kind">[]): "feed" | "reel" | "story" {
  if (options.instagramType === "story") return "story";
  if (media.length === 1 && media[0].kind === "video") return "reel";
  return options.instagramType === "reel" ? "reel" : "feed";
}

export function facebookTypeFor(options: PostOptions): "feed" | "reel" | "story" {
  const t = options.facebookType;
  return t === "reel" || t === "story" ? t : "feed";
}

export interface TikTokCommercial {
  own: boolean;
  branded: boolean;
}

export function tiktokCommercial(options: PostOptions): TikTokCommercial | null {
  const c = options.tiktokCommercial as TikTokCommercial | null | undefined;
  return c && typeof c === "object" ? { own: Boolean(c.own), branded: Boolean(c.branded) } : null;
}

export function checkPost(d: PostDraftForCheck, rules: ScheduleRules = DEFAULT_RULES): PostCheck {
  const errors: PostIssue[] = [];
  const warnings: PostIssue[] = [];
  const err = (field: IssueField, message: string, platform?: string) => errors.push({ field, message, platform });
  const warn = (field: IssueField, message: string, platform?: string) => warnings.push({ field, message, platform });

  const platforms = [...new Set(d.targets.map((t) => t.platform))];
  const photos = d.media.filter((m) => m.kind === "photo");
  const videos = d.media.filter((m) => m.kind === "video");
  const caption = d.caption ?? "";

  if (caption.length > 63206) err("caption", `Légende trop longue (${fr(caption.length)} caractères).`);
  if (!d.scheduling) return { errors, warnings };

  if (d.targets.length === 0) err("targets", "Choisissez au moins un compte.");
  for (const m of d.media) {
    if (m.kind === "audio") err("media", `« ${m.name} » est un fichier audio : seuls les photos et les vidéos se publient.`);
    else if (/hei[cf]/i.test(m.mime)) err("media", `« ${m.name} » est au format HEIC, refusé par Zernio. Ouvrez-la dans Retouche et exportez une copie JPEG, puis utilisez cette copie.`);
    else if (!zernioAcceptsMime(m.mime)) err("media", `« ${m.name} » (${m.mime}) n'est pas un format accepté par Zernio (JPEG, PNG, WebP, GIF, MP4, MOV, WebM).`);
  }

  for (const p of platforms) {
    const label = platformLabel(p);
    const limit = CAPTION_LIMIT[p];
    if (limit && caption.length > limit) err("caption", `Légende trop longue pour ${label} (${fr(caption.length)} / ${fr(limit)}).`, p);
  }
  if (platforms.some((p) => p === "instagram" || p === "tiktok") && caption.length >= rules.captionWarnAt && caption.length <= 2200) {
    warn("caption", `Légende longue : ${fr(caption.length)} caractères sur ${fr(2200)} possibles.`);
  }
  if (rules.hashtags && caption.trim()) {
    const n = countHashtags(`${caption} ${d.firstComment ?? ""}`);
    if (n < rules.hashtags.min || n > rules.hashtags.max) warn("caption", `${n} hashtag${n > 1 ? "s" : ""} : ${rules.hashtags.min} à ${rules.hashtags.max} conseillés.`);
  }

  if (platforms.includes("instagram")) {
    const type = instagramTypeFor(d.options, d.media);
    if (d.media.length === 0) err("media", "Instagram demande au moins une photo ou une vidéo.", "instagram");
    if (type === "story") {
      if (d.media.length > 1) err("media", "Une story Instagram ne contient qu'un seul média.", "instagram");
      if (caption.trim()) warn("caption", "La légende n'apparaît pas dans une story Instagram.", "instagram");
      if (d.firstComment?.trim()) warn("firstComment", "Pas de premier commentaire sur une story.", "instagram");
      const v = videos[0];
      if (v?.durationS && v.durationS > INSTAGRAM_STORY_VIDEO_MAX_S) err("media", `Story Instagram : vidéo de ${INSTAGRAM_STORY_VIDEO_MAX_S} s au maximum.`, "instagram");
    } else if (type === "reel") {
      if (!(d.media.length === 1 && videos.length === 1)) err("media", "Un Reel se publie avec une seule vidéo.", "instagram");
      else {
        if (d.options.instagramType === "feed") warn("media", "Une vidéo seule sera publiée en Reel.", "instagram");
        const s = videos[0].durationS;
        if (s && s < 3) err("media", "Reel : la vidéo doit durer au moins 3 s.", "instagram");
        else if (s && rules.reelIdealDurationS && (s < rules.reelIdealDurationS.min || s > rules.reelIdealDurationS.max)) {
          warn("media", `Reel de ${Math.round(s)} s : ${rules.reelIdealDurationS.min} à ${rules.reelIdealDurationS.max} s conseillés.`, "instagram");
        }
      }
    } else if (d.media.length > INSTAGRAM_CAROUSEL_MAX) err("media", `Carrousel : ${INSTAGRAM_CAROUSEL_MAX} médias au maximum.`, "instagram");
  }

  if (platforms.includes("facebook")) {
    const type = facebookTypeFor(d.options);
    if (photos.length && videos.length) err("media", "Facebook : photos et vidéo ne se mélangent pas dans une publication.", "facebook");
    if (videos.length > 1) err("media", "Facebook : une seule vidéo par publication.", "facebook");
    if (photos.length > FACEBOOK_IMAGES_MAX) err("media", `Facebook : ${FACEBOOK_IMAGES_MAX} photos au maximum.`, "facebook");
    if (type === "reel") {
      if (!(videos.length === 1 && d.media.length === 1)) err("media", "Un Reel Facebook se publie avec une seule vidéo.", "facebook");
      else if ((videos[0].durationS ?? 0) > FACEBOOK_REEL_MAX_S) warn("media", `Reel Facebook : ${FACEBOOK_REEL_MAX_S} s au maximum.`, "facebook");
    }
    if (type === "story" && d.media.length !== 1) err("media", "Une story Facebook contient un seul média.", "facebook");
  }

  if (platforms.includes("tiktok")) {
    if (d.media.length === 0) err("media", "TikTok demande une vidéo ou des photos.", "tiktok");
    if (photos.length && videos.length) err("media", "TikTok : photos et vidéo ne se mélangent pas.", "tiktok");
    if (videos.length > 1) err("media", "TikTok : une seule vidéo par publication.", "tiktok");
    if (photos.length > TIKTOK_PHOTOS_MAX) err("media", `TikTok : ${TIKTOK_PHOTOS_MAX} photos au maximum.`, "tiktok");
    const s = videos[0]?.durationS;
    if (s && (s < TIKTOK_VIDEO_S.min || s > TIKTOK_VIDEO_S.max)) err("media", "TikTok : vidéo de 3 s à 10 min.", "tiktok");
    if (videos.length === 0 && photos.length > 0 && caption.length > 90) warn("caption", "Le titre d'une publication photo TikTok est coupé à 90 caractères.", "tiktok");
    if (!d.options.tiktokPrivacy) err("tiktok", "TikTok : choisissez qui peut voir la publication.", "tiktok");
    const c = tiktokCommercial(d.options);
    if (c && !c.own && !c.branded) err("tiktok", "Indiquez si le contenu fait la promotion de la marque de June, d'un tiers, ou des deux.", "tiktok");
    if (c?.branded && d.options.tiktokPrivacy === "SELF_ONLY") err("tiktok", "Un contenu de marque ne peut pas être privé sur TikTok.", "tiktok");
  }

  return { errors, warnings };
}

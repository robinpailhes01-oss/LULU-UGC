/**
 * Types de l'API REST Zernio (https://zernio.com/api, chemins /v1/…), repris du schéma OpenAPI
 * 1.373.0 et réduits à ce qu'Atelier utilise. Voir docs/zernio.md.
 */

export type ZPostStatus = "draft" | "pending_approval" | "scheduled" | "publishing" | "published" | "partial" | "failed" | "cancelled";
export type ZTargetStatus = "pending" | "processing" | "uploading" | "published" | "failed" | "cancelled";
export type ZErrorCategory =
  | "auth_expired"
  | "user_content"
  | "user_abuse"
  | "account_issue"
  | "platform_rejected"
  | "platform_error"
  | "platform_rate_limit"
  | "quota_exhausted"
  | "system_error"
  | "unknown";

export interface ZErrorBody {
  error: string;
  type?: string;
  code?: string;
  param?: string;
  docUrl?: string;
  platform?: string;
  platformError?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export interface ZProfile {
  _id: string;
  name: string;
  timezone?: string | null;
  isDefault?: boolean;
  accountCount?: number;
}

export interface ZAccount {
  _id: string;
  platform: string;
  profileId: string | { _id: string; name?: string };
  username?: string;
  displayName?: string;
  platformUserId?: string;
  profilePicture?: string | null;
  profileUrl?: string;
  isActive: boolean;
  needsReconnection?: boolean;
  enabled?: boolean;
  rateLimitedUntil?: string | null;
  tiktokAccountType?: "business" | "personal" | "unknown";
}

export interface ZAccountsResponse {
  accounts: ZAccount[];
  hasAnalyticsAccess?: boolean;
}

export interface ZTikTokCreatorInfo {
  creator: { nickname?: string; avatarUrl?: string; isVerified?: boolean; canPostMore?: boolean };
  privacyLevels: { value: string; label: string }[];
  postingLimits?: {
    maxVideoDurationSec?: number;
    interactionSettings?: Partial<Record<"allow_comment" | "allow_duet" | "allow_stitch", { enabled: boolean; required?: boolean; default?: boolean; label?: string } | null>>;
  };
  commercialContentTypes?: { value: string; label: string; requires?: string[] }[];
}

export type ZPresignContentType =
  | "image/jpeg"
  | "image/jpg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "video/mp4"
  | "video/mpeg"
  | "video/quicktime"
  | "video/avi"
  | "video/x-msvideo"
  | "video/webm"
  | "video/x-m4v";

export interface ZPresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

export interface ZMediaItem {
  type?: "image" | "video" | "gif" | "document";
  url: string;
  altText?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
  instagramThumbnail?: string;
}

export interface ZInstagramData {
  contentType?: "story";
  shareToFeed?: boolean;
  firstComment?: string;
  thumbOffset?: number;
  instagramThumbnail?: string;
  collaborators?: string[];
}

export interface ZFacebookData {
  contentType?: "story" | "reel";
  firstComment?: string;
  title?: string;
}

export interface ZTikTokData {
  draft?: boolean;
  privacyLevel?: string;
  allowComment?: boolean;
  allowDuet?: boolean;
  allowStitch?: boolean;
  commercialContentType?: "none" | "brand_organic" | "brand_content";
  contentPreviewConfirmed?: boolean;
  expressConsentGiven?: boolean;
  mediaType?: "video" | "photo";
  videoCoverTimestampMs?: number;
  description?: string;
}

export interface ZPlatformEntry {
  platform: string;
  accountId: string;
  customContent?: string;
  platformSpecificData?: ZInstagramData | ZFacebookData | ZTikTokData;
}

export interface ZCreatePostRequest {
  content?: string;
  mediaItems?: ZMediaItem[];
  platforms?: ZPlatformEntry[];
  scheduledFor?: string;
  timezone?: string;
  publishNow?: boolean;
  isDraft?: boolean;
  queuedFromProfile?: string;
  queueId?: string;
  metadata?: Record<string, unknown>;
}

export type ZUpdatePostRequest = Partial<ZCreatePostRequest>;

export interface ZPlatformTarget {
  platform: string;
  accountId: string | ZAccount;
  status?: ZTargetStatus | string;
  platformPostId?: string;
  platformPostUrl?: string | null;
  publishedAt?: string;
  errorMessage?: string;
  errorCategory?: ZErrorCategory;
  errorSource?: "user" | "platform" | "system";
}

export interface ZPost {
  _id: string;
  content?: string;
  mediaItems?: ZMediaItem[];
  platforms?: ZPlatformTarget[];
  scheduledFor?: string;
  timezone?: string;
  status?: ZPostStatus;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ZPlatformResult {
  platform: string;
  status: string;
  error: string | null;
}

export interface ZPostWriteResponse {
  message?: string;
  post: ZPost;
  warnings?: string[];
  /** Réponse 207 uniquement. */
  error?: string;
  platformResults?: ZPlatformResult[];
}

export type ZWriteResult =
  | { kind: "created"; status: 201; body: ZPostWriteResponse }
  | { kind: "ok"; status: 200; body: ZPostWriteResponse }
  /** 207 : enregistrée, mais la publication immédiate n'a pas complètement réussi. */
  | { kind: "incomplete"; status: 207; body: ZPostWriteResponse };

export interface ZNextSlot {
  profileId: string;
  nextSlot: string;
  timezone: string;
  queueId?: string;
  queueName?: string;
}

export interface ZValidatePostResponse {
  valid: boolean;
  message?: string;
  errors?: { platform: string; error: string }[];
  warnings?: { platform: string; warning: string }[];
}

export interface ZValidateMediaResponse {
  valid: boolean;
  url: string;
  error?: string;
  contentType?: string;
  size?: number | null;
  type?: "image" | "video" | "unknown";
}

/** Événement webhook (post.*). L'identifiant de la publication est post.id (pas _id). */
export interface ZWebhookEvent {
  id: string;
  event: string;
  timestamp?: string;
  test?: boolean;
  post?: {
    id: string;
    status?: string;
    scheduledFor?: string;
    publishedAt?: string;
    metadata?: Record<string, unknown>;
    platforms?: {
      platform: string;
      status?: string;
      accountId?: string;
      platformPostId?: string;
      publishedUrl?: string;
      error?: string | null;
      errorCategory?: string | null;
    }[];
  };
  platform?: { name: string; status?: string; platformPostId?: string; publishedUrl?: string; error?: string | null; deletedAt?: string };
  account?: { accountId: string; platform: string; username?: string };
}

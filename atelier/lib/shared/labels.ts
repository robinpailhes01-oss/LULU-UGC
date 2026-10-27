import type { CleanupKind, MontageStatus, PostStatus } from "@/lib/shared/types";

/** Libellés français des codes internes. */

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Brouillon",
  scheduled: "Programmé",
  publishing: "En cours",
  published: "Publié",
  failed: "Échec",
  cancelled: "Annulé",
};

export const MONTAGE_STATUS_LABEL: Record<MontageStatus, string> = {
  draft: "Brouillon",
  rendering: "Rendu en cours",
  rendered: "Vidéo prête",
  failed: "Échec du rendu",
};

export const CLEANUP_LABEL: Record<CleanupKind, string> = {
  exact_duplicates: "Doublons exacts",
  near_duplicates: "Quasi-doublons",
  blurry: "Photos floues",
  underexposed: "Trop sombres",
  overexposed: "Trop claires",
  low_resolution: "Petites résolutions",
  short_video: "Vidéos très courtes",
};

export const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  threads: "Threads",
  twitter: "X",
  googlebusiness: "Google Business",
  bluesky: "Bluesky",
};

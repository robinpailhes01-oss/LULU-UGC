/**
 * Types du domaine Atelier, partagés entre le serveur, le navigateur et l'agent.
 * Codes internes en anglais (stables), libellés affichés en français (voir lib/shared/labels.ts).
 */

// ---------------------------------------------------------------------------------------------
// Médiathèque

export type AssetKind = "photo" | "video" | "audio";
export type AssetStatus = "uploading" | "ready" | "error";
export type AssetSource = "upload" | "retouch" | "montage" | "import";

export interface AiAnalysis {
  /** Titre court en français (« Petit-déjeuner en terrasse »). */
  title: string;
  /** Une ou deux phrases descriptives. */
  description: string;
  /** Mots-clés en minuscules, au singulier, en français. */
  tags: string[];
  /** Univers du lieu : chambre, piscine, spa, restaurant, extérieur, détail, portrait… */
  univers: string[];
  people: "aucune" | "une" | "plusieurs";
  /** Qualité perçue de 0 à 100 et défauts repérés (flou, surexposé, horizon penché…). */
  quality: { score: number; issues: string[] };
  /** Texte alternatif pour l'accessibilité. */
  alt: string;
  /** Idée de légende Instagram dans la voix June. */
  captionIdea: string | null;
  /** Nom de dossier suggéré (client / lieu), si l'image le laisse deviner. */
  suggestedFolder: string | null;
  model: string;
  analyzedAt: string;
}

export interface Asset {
  id: string;
  folderId: string | null;
  kind: AssetKind;
  name: string;
  mime: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationS: number | null;
  takenAt: string | null;
  camera: string | null;
  gps: { lat: number; lng: number } | null;
  sha256: string | null;
  /** Empreinte perceptuelle 64 bits (hexadécimal, 16 caractères) pour repérer les quasi-doublons. */
  dhash: string | null;
  /** Netteté (variance du laplacien sur une vignette 256 px) : plus c'est haut, plus c'est net. */
  blurScore: number | null;
  /** Luminance moyenne 0–1 et part des pixels brûlés / bouchés (0–1). */
  lumaMean: number | null;
  clipHigh: number | null;
  clipLow: number | null;
  tags: string[];
  ai: AiAnalysis | null;
  starred: boolean;
  status: AssetStatus;
  source: AssetSource;
  /** Média d'origine pour une version retouchée ou un rendu. */
  parentAssetId: string | null;
  /** Réglages de retouche ayant produit cette version. */
  edit: RetouchParams | null;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  /** URLs servies par /api/media (redirection vers le stockage) — toujours utilisables dans <img>/<video>. */
  urls: AssetUrls;
}

export interface AssetUrls {
  original: string;
  thumb: string | null;
  poster: string | null;
  download: string;
}

export interface Folder {
  id: string;
  parentId: string | null;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  /** Nombre de médias directement dans le dossier (hors corbeille). */
  assetCount: number;
}

export type AssetSort = "recent" | "oldest" | "name" | "taken" | "size";

export interface AssetQuery {
  folderId?: string | null; // null = racine, undefined = partout
  q?: string;
  kind?: AssetKind;
  tags?: string[];
  starred?: boolean;
  trashed?: boolean;
  untagged?: boolean;
  source?: AssetSource;
  ids?: string[];
  sort?: AssetSort;
  limit?: number;
  offset?: number;
}

export interface AssetPage {
  items: Asset[];
  total: number;
}

// ---------------------------------------------------------------------------------------------
// Envoi de fichiers

export interface UploadInitRequest {
  name: string;
  mime: string;
  size: number;
  folderId: string | null;
  sha256?: string | null;
  /** Si présent, on crée aussi les URLs d'envoi de la vignette (et de l'affiche pour une vidéo). */
  withThumb?: boolean;
  withPoster?: boolean;
  /** Format des dérivés produits par le navigateur (Safari ne sait pas encoder le WebP : JPEG). */
  thumbMime?: "image/webp" | "image/jpeg";
  posterMime?: "image/webp" | "image/jpeg";
}

export interface UploadInitResponse {
  assetId: string;
  /** Doublon exact déjà présent (même SHA-256), signalé sans bloquer l'envoi. */
  duplicateOf: string | null;
  original:
    | { mode: "single"; url: string; headers: Record<string, string> }
    | { mode: "multipart"; uploadId: string; partSize: number; partCount: number };
  thumb: { url: string; headers: Record<string, string> } | null;
  poster: { url: string; headers: Record<string, string> } | null;
}

/** Mesures calculées dans le navigateur pendant l'envoi (aucun calcul lourd côté serveur). */
export interface ClientMediaFacts {
  width: number | null;
  height: number | null;
  durationS: number | null;
  takenAt: string | null;
  camera: string | null;
  gps: { lat: number; lng: number } | null;
  sha256: string | null;
  dhash: string | null;
  blurScore: number | null;
  lumaMean: number | null;
  clipHigh: number | null;
  clipLow: number | null;
  hasThumb: boolean;
  hasPoster: boolean;
}

export interface UploadCompleteRequest {
  assetId: string;
  multipart?: { uploadId: string; parts: { partNumber: number; etag: string }[] };
  facts: ClientMediaFacts;
}

// ---------------------------------------------------------------------------------------------
// Retouche

export type AspectPreset = "original" | "free" | "1:1" | "4:5" | "9:16" | "16:9" | "3:2";

export interface CropRect {
  /** Coordonnées normalisées 0–1 dans l'image après rotation. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Réglages non destructifs. Toutes les valeurs à 0 = image d'origine.
 * Mathématiques communes à l'aperçu WebGL et à l'export serveur : lib/shared/look.ts.
 */
export interface RetouchParams {
  exposure: number; // EV, -2 … +2
  contrast: number; // -100 … +100
  highlights: number; // -100 … +100
  shadows: number; // -100 … +100
  whites: number; // -100 … +100
  blacks: number; // -100 … +100
  temperature: number; // -100 (froid) … +100 (chaud)
  tint: number; // -100 (vert) … +100 (magenta)
  saturation: number; // -100 … +100
  vibrance: number; // -100 … +100
  fade: number; // 0 … 100 (noirs relevés, rendu film)
  vignette: number; // 0 … 100
  grain: number; // 0 … 100
  sharpen: number; // 0 … 100 (appliqué à l'export)
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  straighten: number; // degrés, -15 … +15
  aspect: AspectPreset;
  crop: CropRect | null;
}

export interface Look {
  id: string;
  name: string;
  /** Réglages de couleur/lumière du look (sans recadrage ni rotation). */
  params: Partial<RetouchParams>;
  builtin: boolean;
  sort: number;
  createdAt: string;
  createdBy: string | null;
}

// ---------------------------------------------------------------------------------------------
// Ménage

export type CleanupKind = "exact_duplicates" | "near_duplicates" | "blurry" | "underexposed" | "overexposed" | "low_resolution" | "short_video";

export interface CleanupGroup {
  id: string;
  kind: CleanupKind;
  assetIds: string[];
  /** Média recommandé à garder (groupes de doublons) ; null pour les problèmes individuels. */
  keepId: string | null;
  reason: string;
}

export interface CleanupReport {
  generatedAt: string;
  groups: CleanupGroup[];
  assets: Record<string, Asset>;
  counts: Record<CleanupKind, number>;
  /** Octets libérés si on suit toutes les suggestions. */
  reclaimableBytes: number;
}

// ---------------------------------------------------------------------------------------------
// Montage (HyperFrames)

export type MontageFormat = "9:16" | "4:5" | "1:1" | "16:9";
export type MontageStatus = "draft" | "rendering" | "rendered" | "failed";
export type MontageTransition = "cut" | "fade" | "slide" | "zoom";

export interface MontageClip {
  id: string;
  assetId: string;
  /** Début et fin dans le média source, en secondes (photo : 0 → durée d'affichage). */
  inS: number;
  outS: number;
  /** Mouvement lent sur les photos (effet Ken Burns). */
  motion?: "none" | "zoom-in" | "zoom-out" | "pan-left" | "pan-right";
  muted?: boolean;
}

export interface MontageText {
  id: string;
  /** Position sur la timeline du montage, en secondes. */
  startS: number;
  endS: number;
  text: string;
  position: "top" | "center" | "bottom";
  style: "hook" | "title" | "caption" | "label";
}

export interface MontageSpec {
  format: MontageFormat;
  fps: 24 | 25 | 30 | 60;
  clips: MontageClip[];
  texts: MontageText[];
  transition: MontageTransition;
  transitionS: number;
  /** Look appliqué à tous les plans (réglages de couleur), via filtre SVG/CSS dans la composition. */
  look: Partial<RetouchParams> | null;
  lookId: string | null;
  musicAssetId: string | null;
  musicVolume: number; // 0 … 1
  endCard: { title: string; subtitle: string | null; durationS: number } | null;
  /**
   * Style de montage (slug d'un skill de type « montage »). Fournit les valeurs par défaut
   * (rythme, typographies, couleurs, animations du texte, structure type) ; les champs
   * explicites de la spec priment sur le style.
   */
  style: string | null;
}

/**
 * Paramètres structurés d'un style de montage (data.json d'un skill « montage »).
 * Tous les champs sont facultatifs : un style peut ne préciser que ce qui le distingue.
 */
export interface MontageStyleData {
  format?: MontageFormat;
  fps?: 24 | 25 | 30 | 60;
  /** Durée visée du montage complet. */
  targetDurationS?: { min: number; max: number };
  /** Durée d'affichage d'une photo. */
  photoDurationS?: number;
  /** Longueur d'un plan vidéo. */
  videoClipS?: { min: number; max: number };
  transition?: { type: MontageTransition; durationS: number };
  pacing?: "lent" | "moyen" | "rapide";
  /** Nom ou identifiant d'un look de retouche appliqué à tous les plans. */
  look?: string | null;
  /** Familles Google Fonts. */
  fonts?: { display: string; text: string };
  colors?: { text: string; accent: string; plate: string; background: string };
  textAnimation?: "rise" | "fade" | "words" | "typewriter" | "none";
  textPlacement?: "top" | "center" | "bottom";
  /** Sous-titres / textes à l'écran. */
  captions?: boolean;
  music?: { mood: string; volume: number; fadeOutS: number } | null;
  endCard?: { title: string; subtitle: string | null; durationS: number } | null;
  /** Déroulé type, plan par plan : rôle (accroche, détail, moment fort…), durée, plan à chercher, texte. */
  structure?: { role: string; durationS?: number; shot: string; text?: string }[];
}

export interface RenderState {
  provider: "local" | "sandbox" | "heygen" | "none";
  jobId: string | null;
  progress: number | null; // 0 … 1
  message: string | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface Montage {
  id: string;
  title: string;
  spec: MontageSpec;
  /** Composition HyperFrames générée depuis spec (ou éditée à la main si customHtml). */
  html: string | null;
  customHtml: boolean;
  status: MontageStatus;
  render: RenderState | null;
  outputAssetId: string | null;
  durationS: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

// ---------------------------------------------------------------------------------------------
// Skills (savoir-faire de l'atelier : styles de montage, voix, méthodes, références)

export type SkillKind = "montage" | "voice" | "brand" | "workflow" | "references" | "retouch" | "other";

export interface Skill {
  /** Identifiant stable (nom du dossier dans atelier/skills/). */
  slug: string;
  kind: SkillKind;
  name: string;
  /** Quand utiliser ce skill (lu par l'agent pour choisir). */
  description: string;
  /** Consignes en Markdown. */
  body: string;
  /** Paramètres structurés (pour un style de montage : MontageStyleData). */
  data: Record<string, unknown> | null;
  /** Fichiers texte annexes (ex. template.html, references.md). */
  files: Record<string, string>;
  /** Médias de la médiathèque servant de références (vidéos et photos modèles). */
  referenceAssetIds: string[];
  /** « repo » : écrit dans le dépôt ; « app » : créé dans l'Atelier. */
  source: "repo" | "app";
  version: number;
  /** Modifié dans l'Atelier depuis la dernière version du dépôt. */
  appEdited: boolean;
  /** Une version plus récente existe dans le dépôt (non appliquée car modifiée dans l'Atelier). */
  repoUpdateAvailable: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface SkillVersion {
  id: string;
  slug: string;
  version: number;
  name: string;
  description: string;
  body: string;
  data: Record<string, unknown> | null;
  files: Record<string, string>;
  referenceAssetIds: string[];
  note: string | null;
  createdAt: string;
  createdBy: string | null;
}

// ---------------------------------------------------------------------------------------------
// Programmation (Zernio)

export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed" | "cancelled";

export interface SocialAccount {
  id: string;
  platform: string; // instagram, facebook, tiktok, …
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileId: string | null;
}

export interface PostTarget {
  platform: string;
  accountId: string;
  username?: string | null;
}

export interface PostOptions {
  /** Instagram : publication classique, Reel ou Story. */
  instagramType?: "feed" | "reel" | "story";
  /** Partager le Reel dans le fil. */
  shareToFeed?: boolean;
  /** Seconde de la vidéo utilisée comme couverture. */
  coverTimeS?: number | null;
  tiktokPrivacy?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";
  [key: string]: unknown;
}

export interface ScheduledPost {
  id: string;
  zernioPostId: string | null;
  status: PostStatus;
  caption: string;
  firstComment: string | null;
  assetIds: string[];
  targets: PostTarget[];
  /** ISO 8601 ; null = brouillon sans date. */
  scheduledFor: string | null;
  timezone: string;
  options: PostOptions;
  error: string | null;
  /** Liens publiés par plateforme, statistiques, etc. */
  result: { urls?: Record<string, string>; [key: string]: unknown } | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

// ---------------------------------------------------------------------------------------------
// Agent

export interface AgentThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface PendingAction {
  id: string;
  threadId: string | null;
  tool: string;
  input: Record<string, unknown>;
  summary: string;
  status: "pending" | "cancelled" | "executed" | "failed";
  result: unknown;
  createdAt: string;
  resolvedAt: string | null;
}

/** Contexte de l'écran envoyé avec chaque message, pour que l'agent sache de quoi on parle. */
export interface AgentScreenContext {
  page: string;
  folderId?: string | null;
  selectedAssetIds?: string[];
  montageId?: string | null;
  postId?: string | null;
  skillSlug?: string | null;
}

/** Événements envoyés au navigateur (une ligne JSON par événement). */
export type AgentStreamEvent =
  | { type: "thread"; threadId: string; title: string }
  | { type: "text"; delta: string }
  | { type: "tool_start"; id: string; name: string; label: string }
  | { type: "tool_end"; id: string; name: string; ok: boolean; summary: string; assetIds?: string[] }
  | { type: "confirm"; action: PendingAction }
  | { type: "refresh"; scopes: RefreshScope[] }
  | { type: "done" }
  | { type: "error"; message: string };

/** Zones de l'interface à recharger après une action (de l'agent ou d'un autre écran). */
export type RefreshScope = "assets" | "folders" | "looks" | "montages" | "posts" | "cleanup" | "stats" | "skills";

/** Message affichable (reconstruit depuis les blocs Claude stockés). */
export interface AgentDisplayMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools: { name: string; label: string; ok: boolean; summary: string; assetIds?: string[] }[];
  actions: PendingAction[];
  createdAt: string;
}

// ---------------------------------------------------------------------------------------------
// Tableau de bord et activité

export interface ActivityItem {
  id: number;
  actor: string | null;
  verb: string;
  objectType: string;
  objectId: string | null;
  summary: string;
  createdAt: string;
}

export interface DashboardStats {
  photos: number;
  videos: number;
  bytes: number;
  untagged: number;
  trashed: number;
  cleanupCandidates: number;
  upcomingPosts: ScheduledPost[];
  montages: Montage[];
  recentAssets: Asset[];
  activity: ActivityItem[];
}

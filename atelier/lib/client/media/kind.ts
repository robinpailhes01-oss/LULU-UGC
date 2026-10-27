import type { AssetKind } from "@/lib/shared/types";

/** Types MIME par extension, quand le navigateur n'en donne pas (HEIC sous Windows/Linux, MOV…). */
const BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  hif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
  dng: "image/x-adobe-dng",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  "3gp": "video/3gpp",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  flac: "audio/flac",
  opus: "audio/opus",
};

export function extension(name: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}

export function guessMime(file: { name: string; type: string }): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  return BY_EXT[extension(file.name)] ?? file.type ?? "";
}

export function kindOf(mime: string): AssetKind | null {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

/** Fichier accepté par la médiathèque (photo, vidéo, son). */
export function isAcceptedFile(file: { name: string; type: string }): boolean {
  return kindOf(guessMime(file)) !== null;
}

export function isHeifName(file: { name: string; type: string }): boolean {
  return /^image\/hei[cf]/i.test(file.type) || /\.(heic|heif|hif)$/i.test(file.name);
}

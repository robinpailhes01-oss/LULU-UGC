"use client";

import { cameraName, validGps } from "@/lib/client/media/exif";

/**
 * Métadonnées des vidéos MP4 / MOV (iPhone, Android, appareils photo), lues directement dans la
 * boîte « moov » sans charger le fichier : date de tournage, lieu, appareil, durée et dimensions
 * (utiles quand le navigateur ne sait pas décoder le codec, ex. HEVC sous Windows).
 */

export interface VideoContainerMeta {
  takenAt: string | null;
  camera: string | null;
  gps: { lat: number; lng: number } | null;
  durationS: number | null;
  width: number | null;
  height: number | null;
}

const EMPTY: VideoContainerMeta = { takenAt: null, camera: null, gps: null, durationS: null, width: null, height: null };
const MAX_MOOV = 64 * 1024 * 1024;
const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "udta", "edts"]);

export async function readVideoMeta(file: Blob): Promise<VideoContainerMeta> {
  try {
    const moov = await findMoov(file);
    if (!moov) return EMPTY;
    const out: VideoContainerMeta = { ...EMPTY };
    const ctx: ParseCtx = { keys: [], mvhdDate: null, appleDate: null, udtaDate: null, make: null, model: null };
    walk(moov, 0, moov.byteLength, out, ctx);
    out.takenAt = ctx.appleDate ?? ctx.udtaDate ?? ctx.mvhdDate;
    out.camera = cameraName(ctx.make, ctx.model);
    return out;
  } catch {
    return EMPTY;
  }
}

async function findMoov(file: Blob): Promise<DataView | null> {
  let offset = 0;
  for (let guard = 0; guard < 128 && offset + 8 <= file.size; guard++) {
    const head = new DataView(await file.slice(offset, offset + 16).arrayBuffer());
    if (head.byteLength < 8) return null;
    let size = head.getUint32(0);
    const type = fourcc(head, 4);
    let headerSize = 8;
    if (size === 1 && head.byteLength >= 16) {
      size = Number(head.getBigUint64(8));
      headerSize = 16;
    } else if (size === 0) size = file.size - offset;
    if (size < headerSize) return null;
    if (guard === 0 && type !== "ftyp" && type !== "moov" && type !== "wide" && type !== "mdat" && type !== "free" && type !== "skip") return null;
    if (type === "moov") {
      if (size > MAX_MOOV) return null;
      return new DataView(await file.slice(offset + headerSize, offset + size).arrayBuffer());
    }
    offset += size;
  }
  return null;
}

interface ParseCtx {
  keys: string[];
  mvhdDate: string | null;
  appleDate: string | null;
  udtaDate: string | null;
  make: string | null;
  model: string | null;
}

function walk(v: DataView, start: number, end: number, out: VideoContainerMeta, ctx: ParseCtx, depth = 0) {
  let o = start;
  while (o + 8 <= end && depth < 12) {
    let size = v.getUint32(o);
    const type = fourcc(v, o + 4);
    let header = 8;
    if (size === 1 && o + 16 <= end) {
      size = Number(v.getBigUint64(o + 8));
      header = 16;
    } else if (size === 0) size = end - o;
    if (size < header || o + size > end) break;
    const body = o + header;
    const bodyEnd = o + size;
    if (CONTAINERS.has(type)) walk(v, body, bodyEnd, out, ctx, depth + 1);
    else if (type === "meta") {
      // Boîte « pleine » (ISO, 4 octets version/drapeaux) ou conteneur QuickTime simple.
      const isFull = v.getUint32(body) === 0 || !isPrintable(v, body + 4);
      walk(v, isFull ? body + 4 : body, bodyEnd, out, ctx, depth + 1);
    } else if (type === "mvhd") parseMvhd(v, body, out, ctx);
    else if (type === "tkhd") parseTkhd(v, body, out);
    else if (type === "keys") parseKeys(v, body, bodyEnd, ctx);
    else if (type === "ilst") parseIlst(v, body, bodyEnd, out, ctx);
    else if (type === "©xyz") {
      const s = udtaString(v, body, bodyEnd);
      if (s && !out.gps) out.gps = iso6709(s);
    } else if (type === "©mak") ctx.make ??= udtaString(v, body, bodyEnd);
    else if (type === "©mod") ctx.model ??= udtaString(v, body, bodyEnd);
    else if (type === "©day") ctx.udtaDate ??= isoDate(udtaString(v, body, bodyEnd));
    o = bodyEnd;
  }
}

function parseMvhd(v: DataView, o: number, out: VideoContainerMeta, ctx: ParseCtx) {
  const version = v.getUint8(o);
  let created: number;
  let timescale: number;
  let duration: number;
  if (version === 1) {
    created = Number(v.getBigUint64(o + 4));
    timescale = v.getUint32(o + 20);
    duration = Number(v.getBigUint64(o + 24));
  } else {
    created = v.getUint32(o + 4);
    timescale = v.getUint32(o + 12);
    duration = v.getUint32(o + 16);
  }
  if (timescale > 0 && duration > 0 && duration < 0xffffffff) out.durationS = Math.round((duration / timescale) * 1000) / 1000;
  if (created > 0) {
    const ms = (created - 2082844800) * 1000;
    const d = new Date(ms);
    if (d.getUTCFullYear() >= 1990 && ms < Date.now() + 2 * 86400_000) ctx.mvhdDate = d.toISOString();
  }
}

function parseTkhd(v: DataView, o: number, out: VideoContainerMeta) {
  const version = v.getUint8(o);
  const matrix = version === 1 ? o + 52 : o + 40;
  const wOff = version === 1 ? o + 88 : o + 76;
  if (wOff + 8 > v.byteLength) return;
  const w = v.getUint32(wOff) / 65536;
  const h = v.getUint32(wOff + 4) / 65536;
  if (!(w > 0 && h > 0) || out.width) return;
  const a = v.getInt32(matrix) / 65536;
  const b = v.getInt32(matrix + 4) / 65536;
  const rotated = Math.abs(a) < 0.5 && Math.abs(b) > 0.5;
  out.width = Math.round(rotated ? h : w);
  out.height = Math.round(rotated ? w : h);
}

function parseKeys(v: DataView, o: number, end: number, ctx: ParseCtx) {
  const count = v.getUint32(o + 4);
  let p = o + 8;
  for (let i = 0; i < count && p + 8 <= end; i++) {
    const size = v.getUint32(p);
    if (size < 8) break;
    ctx.keys.push(text(v, p + 8, Math.min(p + size, end)));
    p += size;
  }
}

function parseIlst(v: DataView, o: number, end: number, out: VideoContainerMeta, ctx: ParseCtx) {
  let p = o;
  while (p + 8 <= end) {
    const size = v.getUint32(p);
    if (size < 8 || p + size > end) break;
    const index = v.getUint32(p + 4);
    const key = ctx.keys[index - 1] ?? "";
    // Sous-boîte « data » : taille, « data », type (4), langue (4), valeur.
    const d = p + 8;
    if (d + 16 <= p + size && fourcc(v, d + 4) === "data") {
      const dataSize = v.getUint32(d);
      const value = text(v, d + 16, Math.min(d + dataSize, p + size));
      if (key === "com.apple.quicktime.creationdate") ctx.appleDate = isoDate(value);
      else if (key === "com.apple.quicktime.location.ISO6709") out.gps = iso6709(value) ?? out.gps;
      else if (key === "com.apple.quicktime.make") ctx.make = value || ctx.make;
      else if (key === "com.apple.quicktime.model") ctx.model = value || ctx.model;
    }
    p += size;
  }
}

/** Chaîne d'une boîte udta « ©xxx » : longueur (2), langue (2), texte. */
function udtaString(v: DataView, o: number, end: number): string | null {
  if (o + 4 > end) return null;
  const len = v.getUint16(o);
  const s = text(v, o + 4, Math.min(o + 4 + len, end));
  return s || null;
}

/** « +45.0600+006.0700+100.000/ » → { lat, lng }. */
export function iso6709(s: string): { lat: number; lng: number } | null {
  const m = /^([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)/.exec(s.trim());
  return m ? validGps(Number(m[1]), Number(m[2])) : null;
}

/** « 2025-07-14T18:42:10+0200 » → ISO 8601 UTC. */
function isoDate(s: string | null): string | null {
  if (!s) return null;
  const norm = s.trim().replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const d = new Date(norm);
  const t = d.getTime();
  if (!Number.isFinite(t) || d.getFullYear() < 1990 || t > Date.now() + 2 * 86400_000) return null;
  return d.toISOString();
}

function fourcc(v: DataView, o: number): string {
  return String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
}

function isPrintable(v: DataView, o: number): boolean {
  if (o + 4 > v.byteLength) return false;
  for (let i = 0; i < 4; i++) {
    const c = v.getUint8(o + i);
    if (c < 0x20 || c > 0x7e) return c === 0xa9 && i === 0;
  }
  return true;
}

function text(v: DataView, start: number, end: number): string {
  if (end <= start) return "";
  return new TextDecoder("utf-8").decode(new Uint8Array(v.buffer, v.byteOffset + start, end - start)).replace(/\0+$/g, "").trim();
}

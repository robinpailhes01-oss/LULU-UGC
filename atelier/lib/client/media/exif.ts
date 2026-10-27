"use client";

/**
 * Métadonnées EXIF des photos (JPEG, HEIC, PNG, TIFF, AVIF) via exifr, chargé à la demande :
 * date de prise de vue, appareil, coordonnées GPS.
 */

export interface PhotoMeta {
  takenAt: string | null;
  camera: string | null;
  gps: { lat: number; lng: number } | null;
}

type Raw = Record<string, unknown>;

const OPTIONS = {
  tiff: true,
  exif: true,
  gps: true,
  ifd1: false,
  interop: false,
  xmp: false,
  iptc: false,
  icc: false,
  jfif: false,
  ihdr: false,
  makerNote: false,
  userComment: false,
  reviveValues: false,
  translateKeys: true,
  translateValues: false,
  mergeOutput: true,
};

const useful = (raw: Raw | undefined) => Boolean(raw && (raw.DateTimeOriginal || raw.CreateDate || raw.Make || raw.Model || raw.GPSLatitude || raw.latitude));

export async function readPhotoMeta(file: Blob, name = ""): Promise<PhotoMeta> {
  const empty: PhotoMeta = { takenAt: null, camera: null, gps: null };
  try {
    const exifr = (await import("exifr")).default;
    let raw = (await exifr.parse(file, OPTIONS).catch(() => undefined)) as Raw | undefined;
    // Certains HEIC (selon l'encodeur) ne sont pas compris par exifr : on cherche alors le bloc
    // « Exif\0\0 » + en-tête TIFF directement dans le fichier et on le fait lire à exifr.
    if (!useful(raw) && (/^image\/(hei[cf]|avif)/i.test(file.type) || /\.(heic|heif|hif|avif)$/i.test(name))) {
      const tiff = await findTiffBlock(file);
      if (tiff) raw = (await exifr.parse(tiff, OPTIONS).catch(() => undefined)) as Raw | undefined;
    }
    if (!raw) return empty;
    return {
      takenAt: exifDate(raw.DateTimeOriginal ?? raw.CreateDate ?? raw.DateTimeDigitized, raw.OffsetTimeOriginal ?? raw.OffsetTimeDigitized ?? raw.OffsetTime),
      camera: cameraName(raw.Make, raw.Model),
      gps: gpsFrom(raw),
    };
  } catch {
    return empty;
  }
}

async function findTiffBlock(file: Blob): Promise<Uint8Array | null> {
  const limit = Math.min(file.size, 32 * 1024 * 1024);
  const buf = new Uint8Array(await file.slice(0, limit).arrayBuffer());
  // « Exif\0\0 » suivi de « MM\0* » (gros-boutiste) ou « II*\0 » (petit-boutiste)
  for (let i = 0; i + 10 < buf.length; i++) {
    if (buf[i] !== 0x45 || buf[i + 1] !== 0x78 || buf[i + 2] !== 0x69 || buf[i + 3] !== 0x66 || buf[i + 4] !== 0 || buf[i + 5] !== 0) continue;
    const a = buf[i + 6];
    const b = buf[i + 7];
    const c = buf[i + 8];
    const d = buf[i + 9];
    if ((a === 0x4d && b === 0x4d && c === 0 && d === 0x2a) || (a === 0x49 && b === 0x49 && c === 0x2a && d === 0)) return buf.subarray(i + 6);
  }
  return null;
}

/** « 2025:07:14 18:42:10 » (+ décalage « +02:00 ») → ISO 8601. Sans décalage : heure locale du navigateur. */
export function exifDate(value: unknown, offset: unknown): string | null {
  if (value instanceof Date) return validIso(value);
  if (typeof value !== "string") return null;
  const m = /^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s = "00"] = m;
  if (y === "0000") return null;
  const off = typeof offset === "string" && /^[+-]\d{2}:?\d{2}$/.test(offset.trim()) ? offset.trim() : null;
  const date = off
    ? new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${off.length === 5 ? `${off.slice(0, 3)}:${off.slice(3)}` : off}`)
    : new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  return validIso(date);
}

function validIso(d: Date): string | null {
  const t = d.getTime();
  // Écarte les dates absurdes (appareil jamais réglé, 1970, futur lointain).
  if (!Number.isFinite(t) || d.getFullYear() < 1990 || t > Date.now() + 2 * 86400_000) return null;
  return d.toISOString();
}

export function cameraName(make: unknown, model: unknown): string | null {
  const mk = typeof make === "string" ? make.replace(/\0/g, "").trim() : "";
  const md = typeof model === "string" ? model.replace(/\0/g, "").trim() : "";
  if (!mk && !md) return null;
  // « Canon » + « Canon EOS R6 » → « Canon EOS R6 » ; « Apple » + « iPhone 15 Pro » → « Apple iPhone 15 Pro ».
  const brand = mk.split(/\s+/)[0] ?? "";
  const name = md && brand && md.toLowerCase().startsWith(brand.toLowerCase()) ? md : [mk.replace(/\s+(corporation|corp\.?|co\.?,? ltd\.?|inc\.?)$/i, ""), md].filter(Boolean).join(" ");
  return name.slice(0, 120) || null;
}

function gpsFrom(raw: Raw): { lat: number; lng: number } | null {
  const lat = typeof raw.latitude === "number" ? raw.latitude : dms(raw.GPSLatitude, raw.GPSLatitudeRef);
  const lng = typeof raw.longitude === "number" ? raw.longitude : dms(raw.GPSLongitude, raw.GPSLongitudeRef);
  return validGps(lat, lng);
}

export function validGps(lat: number | null, lng: number | null): { lat: number; lng: number } | null {
  if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

function dms(v: unknown, ref: unknown): number | null {
  let deg: number | null = null;
  if (typeof v === "number") deg = v;
  else if (Array.isArray(v) && v.length > 0) {
    const [d = 0, m = 0, s = 0] = v.map(Number);
    deg = d + m / 60 + s / 3600;
  }
  if (deg === null || !Number.isFinite(deg)) return null;
  const r = typeof ref === "string" ? ref.trim().toUpperCase() : "";
  return r === "S" || r === "W" ? -Math.abs(deg) : deg;
}

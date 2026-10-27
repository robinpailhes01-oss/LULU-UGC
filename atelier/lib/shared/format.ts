/** Formats d'affichage en français, partagés client et serveur. */

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 o";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const v = bytes / 1024 ** i;
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: v < 10 && i > 0 ? 1 : 0 })} ${units[i]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "";
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFmt.format(new Date(iso)) : "";
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTimeFmt.format(new Date(iso)) : "";
}

export function formatTime(iso: string | null | undefined): string {
  return iso ? timeFmt.format(new Date(iso)) : "";
}

/** « à l'instant », « il y a 5 min », « hier », sinon la date. */
export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const diff = (now - new Date(iso).getTime()) / 1000;
  if (diff < 0) {
    const ahead = -diff;
    if (ahead < 3600) return `dans ${Math.max(1, Math.round(ahead / 60))} min`;
    if (ahead < 86400) return `dans ${Math.round(ahead / 3600)} h`;
    return formatDateTime(iso);
  }
  if (diff < 45) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.round(diff / 3600)} h`;
  if (diff < 172800) return "hier";
  if (diff < 7 * 86400) return `il y a ${Math.round(diff / 86400)} jours`;
  return formatDate(iso);
}

export function plural(n: number, one: string, many?: string): string {
  return `${n.toLocaleString("fr-FR")} ${n > 1 ? many ?? `${one}s` : one}`;
}

export function dimensions(w: number | null, h: number | null): string {
  return w && h ? `${w} × ${h}` : "";
}

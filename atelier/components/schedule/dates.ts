/**
 * Dates du calendrier, toujours à l'heure de Paris (Europe/Paris), quel que soit le fuseau du
 * navigateur. Un jour est une chaîne « AAAA-MM-JJ » ; l'arithmétique des jours se fait en UTC
 * pour échapper aux changements d'heure.
 */

export const TZ = "Europe/Paris";

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parts(ts: number) {
  const o: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(new Date(ts))) o[p.type] = p.value;
  return { y: Number(o.year), mo: Number(o.month), d: Number(o.day), h: Number(o.hour) % 24, mi: Number(o.minute), s: Number(o.second) };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Jour et heure à Paris d'un instant ISO. */
export function zoned(iso: string): { day: string; time: string; hour: number; minute: number } {
  const p = parts(Date.parse(iso));
  return { day: `${p.y}-${pad(p.mo)}-${pad(p.d)}`, time: `${pad(p.h)}:${pad(p.mi)}`, hour: p.h, minute: p.mi };
}

function offsetMs(ts: number): number {
  const p = parts(ts);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000;
}

/** Instant ISO (UTC) d'une date et d'une heure de Paris. */
export function zonedToIso(day: string, time: string): string {
  const [y, mo, d] = day.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let ts = guess - offsetMs(guess);
  ts = guess - offsetMs(ts);
  return new Date(ts).toISOString();
}

export function todayDay(): string {
  return zoned(new Date().toISOString()).day;
}

function utc(day: string): Date {
  const [y, mo, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d));
}

function fromUtc(dt: Date): string {
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(day: string, n: number): string {
  const dt = utc(day);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUtc(dt);
}

export function addMonths(day: string, n: number): string {
  const dt = utc(day);
  return fromUtc(new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + n, 1)));
}

/** 0 = lundi … 6 = dimanche. */
export function weekdayMon0(day: string): number {
  return (utc(day).getUTCDay() + 6) % 7;
}

export function isWeekend(day: string): boolean {
  return weekdayMon0(day) >= 5;
}

export function startOfWeek(day: string): string {
  return addDays(day, -weekdayMon0(day));
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** Jours affichés dans la grille du mois (semaines complètes, lundi en premier). */
export function monthGrid(day: string): string[] {
  const first = startOfMonth(day);
  const start = startOfWeek(first);
  const next = addMonths(first, 1);
  const days: string[] = [];
  for (let d = start; d < next || weekdayMon0(d) !== 0; d = addDays(d, 1)) days.push(d);
  return days;
}

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...o });
const monthFmt = fmt({ month: "long", year: "numeric" });
const weekdayShort = fmt({ weekday: "short" });
const longDay = fmt({ weekday: "long", day: "numeric", month: "long" });
const shortDay = fmt({ day: "numeric", month: "short" });
const shortDayYear = fmt({ day: "numeric", month: "short", year: "numeric" });
const weekdayDay = fmt({ weekday: "short", day: "numeric" });

export const WEEKDAYS_SHORT = Array.from({ length: 7 }, (_, i) => weekdayShort.format(utc(addDays("2026-01-05", i)))); // lun. … dim.

export function monthLabel(day: string): string {
  return monthFmt.format(utc(startOfMonth(day)));
}

export function monthName(day: string): string {
  return fmt({ month: "long" }).format(utc(startOfMonth(day)));
}

export function weekLabel(day: string): string {
  const s = startOfWeek(day);
  const e = addDays(s, 6);
  return `${shortDay.format(utc(s))} – ${shortDayYear.format(utc(e))}`;
}

export function longDayLabel(day: string): string {
  const s = longDay.format(utc(day));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function weekdayDayLabel(day: string): string {
  return weekdayDay.format(utc(day));
}

export function dayNumber(day: string): number {
  return Number(day.slice(8, 10));
}

/** « mercredi 28 octobre à 18:30 » (heure de Paris). */
export function whenLabel(iso: string): string {
  const z = zoned(iso);
  return `${longDay.format(utc(z.day))} à ${z.time}`;
}

/** Instant de début d'un jour de Paris et de fin d'un autre (bornes de requête). */
export function dayRangeIso(fromDay: string, toDay: string): { from: string; to: string } {
  return { from: zonedToIso(fromDay, "00:00"), to: new Date(Date.parse(zonedToIso(addDays(toDay, 1), "00:00")) - 1).toISOString() };
}

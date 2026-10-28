import "server-only";
import { resolveClientFilter, type ClientFilter } from "@/lib/server/client-scope";
import { getDb, iso, isoOrNull, json, num, numOrNull, type Row } from "@/lib/server/db";
import { logActivity } from "@/lib/server/repo/activity";
import { toAsset } from "@/lib/server/repo/assets";
import type { Asset, CleanupGroup, CleanupKind, CleanupReport } from "@/lib/shared/types";

/**
 * Ménage : analyse toute la médiathèque (hors corbeille) à partir des mesures enregistrées à
 * l'envoi (sha256, dHash, netteté, exposition, résolution, durée) et propose des groupes à
 * nettoyer. Aucune IA n'est nécessaire : tout se calcule en mémoire après une seule requête SQL.
 *
 * Seuils (calibrés sur des images générées et sur les mesures de research/media.md) :
 * - Quasi-doublons : distance de Hamming des dHash 64 bits ≤ 7 (copies réelles : 2 à 7 bits ;
 *   recadrage léger / recompression JPEG q60 : 7 ; miroir : 24 ; images différentes : ~41),
 *   ≤ 9 pour deux photos prises le même jour (rafales). Rapport largeur/hauteur à 6 % près.
 *   Une version retouchée n'est jamais le quasi-doublon de son original (ni de ses sœurs).
 * - Flou : la variance du laplacien varie comme le carré du contraste, donc chute sur les images
 *   sombres (×0,35 de luminance → score divisé par ~8, alors que l'image est aussi nette). On
 *   normalise : score × (luminance médiane de la bibliothèque / luminance de la photo)², facteur
 *   borné entre 1 et 64 (on ne pénalise jamais une image claire). Une photo est floue si ce score
 *   normalisé est sous 35 % de la médiane de la bibliothèque ET sous le plancher de 250
 *   (mesures à 256 px : photos nettes ≈ 350–700, flou gaussien σ4 ≈ 70–230).
 *   Sous 8 photos mesurées, pas de médiane fiable : seul un plancher plus strict (100) s'applique.
 * - Sombre : luminance moyenne < 0,12 ou plus de 35 % de pixels bouchés.
 * - Clair : luminance moyenne > 0,90 ou plus de 30 % de pixels brûlés.
 * - Petite résolution : photo < 1080 px de grand côté, vidéo < 720 px.
 * - Vidéo très courte : moins de 2 s.
 *
 * Jamais suggéré : un média ignoré (« Tout garder », « Ignorer »), un favori (sauf dans un groupe
 * de doublons où une autre copie est gardée).
 */

export const CLEANUP_THRESHOLDS = {
  nearDistance: 7,
  nearDistanceSameDay: 9,
  aspectTolerance: 0.06,
  blurMedianRatio: 0.35,
  blurFloor: 250,
  blurFloorSmallLibrary: 100,
  blurMinSample: 8,
  /** Luminance de référence quand la bibliothèque est trop petite pour une médiane. */
  blurRefLuma: 0.45,
  blurMaxFactor: 64,
  darkLuma: 0.12,
  darkClip: 0.35,
  brightLuma: 0.9,
  brightClip: 0.3,
  photoMinSide: 1080,
  videoMinSide: 720,
  shortVideoS: 2,
} as const;

const IGNORED_KEY = "cleanup_ignored";

const KINDS: CleanupKind[] = ["exact_duplicates", "near_duplicates", "blurry", "underexposed", "overexposed", "low_resolution", "short_video"];

/** Ligne allégée utilisée pour l'analyse (la ligne SQL complète est gardée pour le rapport). */
interface Item {
  id: string;
  row: Row;
  kind: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationS: number | null;
  sha256: string | null;
  hi: number;
  lo: number;
  hasHash: boolean;
  blur: number | null;
  luma: number | null;
  clipHigh: number | null;
  clipLow: number | null;
  quality: number | null;
  starred: boolean;
  source: string;
  parentId: string | null;
  createdAt: number;
  day: string | null;
}

// ---------------------------------------------------------------------------------------------
// Assets ignorés

export async function getIgnoredIds(): Promise<string[]> {
  const db = await getDb();
  const r = await db.one<{ value: unknown }>(`select value from atelier.settings where key = $1`, [IGNORED_KEY]);
  if (!r) return [];
  const v = json<{ ids?: unknown }>(r.value);
  return Array.isArray(v?.ids) ? v.ids.filter((x): x is string => typeof x === "string") : [];
}

/** Mémorise des médias à garder : ils ne seront plus jamais proposés au ménage. */
export async function ignoreAssets(ids: string[], actor: string | null): Promise<{ count: number }> {
  const db = await getDb();
  const unique = [...new Set(ids)];
  const total = await db.tx(async (t) => {
    const cur = await t.one<{ value: unknown }>(`select value from atelier.settings where key = $1 for update`, [IGNORED_KEY]);
    const prev = cur ? (json<{ ids?: string[] }>(cur.value).ids ?? []) : [];
    const next = [...new Set([...prev, ...unique])].slice(-50000);
    await t.query(
      `insert into atelier.settings (key, value, updated_at) values ($1, $2::jsonb, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [IGNORED_KEY, JSON.stringify({ ids: next })],
    );
    return next.length;
  });
  invalidateCleanupCache();
  if (unique.length > 0) {
    await logActivity({ actor, verb: "a choisi de garder", objectType: "asset", objectId: unique.length === 1 ? unique[0] : null, summary: `${unique.length} média${unique.length > 1 ? "s" : ""} proposé${unique.length > 1 ? "s" : ""} au ménage`, meta: { ids: unique } });
  }
  return { count: total };
}

/** Retire des médias de la liste des ignorés (annulation), ou vide toute la liste si ids est absent. */
export async function unignoreAssets(ids: string[] | null, actor: string | null): Promise<{ count: number }> {
  const db = await getDb();
  const total = await db.tx(async (t) => {
    if (!ids) {
      await t.query(`delete from atelier.settings where key = $1`, [IGNORED_KEY]);
      return 0;
    }
    const cur = await t.one<{ value: unknown }>(`select value from atelier.settings where key = $1 for update`, [IGNORED_KEY]);
    const drop = new Set(ids);
    const next = (cur ? (json<{ ids?: string[] }>(cur.value).ids ?? []) : []).filter((id) => !drop.has(id));
    await t.query(
      `insert into atelier.settings (key, value, updated_at) values ($1, $2::jsonb, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [IGNORED_KEY, JSON.stringify({ ids: next })],
    );
    return next.length;
  });
  invalidateCleanupCache();
  if (!ids) await logActivity({ actor, verb: "a réinitialisé", objectType: "system", summary: "les médias gardés du ménage" });
  return { count: total };
}

// ---------------------------------------------------------------------------------------------
// Outils

function popcount32(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return Math.imul(x, 0x01010101) >>> 24;
}

function hamming(a: Item, b: Item): number {
  return popcount32((a.hi ^ b.hi) >>> 0) + popcount32((a.lo ^ b.lo) >>> 0);
}

class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    let p = this.parent.get(x) ?? x;
    if (p === x) return x;
    p = this.find(p);
    this.parent.set(x, p);
    return p;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

function longSide(i: Item): number | null {
  return i.width && i.height ? Math.max(i.width, i.height) : null;
}

/** Netteté corrigée de l'exposition (le laplacien varie comme le carré du contraste). */
export function normalizedBlur(blur: number | null, luma: number | null, refLuma: number = CLEANUP_THRESHOLDS.blurRefLuma): number | null {
  if (blur === null) return null;
  if (luma === null) return blur;
  const factor = Math.min(CLEANUP_THRESHOLDS.blurMaxFactor, Math.max(1, (refLuma / Math.max(luma, 0.02)) ** 2));
  return blur * factor;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function toItem(r: Row): Item {
  const dhash = typeof r.dhash === "string" && /^[0-9a-f]{16}$/i.test(r.dhash) ? (r.dhash as string) : null;
  const ai = r.ai ? json<{ quality?: { score?: unknown } }>(r.ai) : null;
  const q = ai?.quality?.score;
  const taken = isoOrNull(r.taken_at);
  return {
    id: r.id as string,
    row: r,
    kind: r.kind as string,
    sizeBytes: num(r.size_bytes),
    width: numOrNull(r.width),
    height: numOrNull(r.height),
    durationS: numOrNull(r.duration_s),
    sha256: (r.sha256 as string | null) ?? null,
    hi: dhash ? parseInt(dhash.slice(0, 8), 16) >>> 0 : 0,
    lo: dhash ? parseInt(dhash.slice(8), 16) >>> 0 : 0,
    hasHash: Boolean(dhash),
    blur: numOrNull(r.blur_score),
    luma: numOrNull(r.luma_mean),
    clipHigh: numOrNull(r.clip_high),
    clipLow: numOrNull(r.clip_low),
    quality: typeof q === "number" ? q : null,
    starred: Boolean(r.starred),
    source: r.source as string,
    parentId: (r.parent_asset_id as string | null) ?? null,
    createdAt: new Date(iso(r.created_at)).getTime(),
    day: taken ? taken.slice(0, 10) : null,
  };
}

/** Une version retouchée et son original (ou deux versions d'un même original) ne sont pas des doublons à supprimer. */
function sameLineage(a: Item, b: Item): boolean {
  return a.parentId === b.id || b.parentId === a.id || (a.parentId !== null && a.parentId === b.parentId);
}

function similarAspect(a: Item, b: Item): boolean {
  if (!a.width || !a.height || !b.width || !b.height) return true;
  const ra = a.width / a.height;
  const rb = b.width / b.height;
  return Math.abs(ra / rb - 1) <= CLEANUP_THRESHOLDS.aspectTolerance;
}

const fmtScore = (n: number) => Math.round(n).toLocaleString("fr-FR");
const NB = "\u00a0"; // espace insécable (« 8 % », « 1080 px »)
const pct = (x: number) => `${Math.round(x * 100)}${NB}%`;

// ---------------------------------------------------------------------------------------------
// Rapport

/** Rapport de ménage d'un client (undefined = client courant, null = toute la médiathèque). */
export async function buildCleanupReport(client?: ClientFilter): Promise<CleanupReport> {
  const db = await getDb();
  const filter = await resolveClientFilter(client);
  const [rows, ignoredList] = await Promise.all([
    db.query(`select * from atelier.assets where status = 'ready' and trashed_at is null and ($1::uuid is null or client_id = $1::uuid) order by created_at asc, id`, [filter]),
    getIgnoredIds(),
  ]);
  const ignored = new Set(ignoredList);
  const items = rows.map(toItem).filter((i) => !ignored.has(i.id));
  const byId = new Map(items.map((i) => [i.id, i]));
  const groups: CleanupGroup[] = [];
  const lumas = items.filter((i) => i.kind === "photo" && i.luma !== null).map((i) => i.luma!);
  const refLuma = lumas.length >= CLEANUP_THRESHOLDS.blurMinSample ? median(lumas)! : CLEANUP_THRESHOLDS.blurRefLuma;
  const sharpness = new Map(items.map((i) => [i.id, normalizedBlur(i.blur, i.luma, refLuma)]));
  /** Médias proposés à la suppression dans un groupe de doublons (exclus des problèmes individuels). */
  const dupRemoved = new Set<string>();

  // 1) Doublons exacts : même SHA-256. On garde un favori, puis l'envoi d'origine, puis le plus ancien.
  const bySha = new Map<string, Item[]>();
  for (const i of items) {
    if (!i.sha256) continue;
    const list = bySha.get(i.sha256);
    if (list) list.push(i);
    else bySha.set(i.sha256, [i]);
  }
  for (const [sha, list] of bySha) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => Number(b.starred) - Number(a.starred) || Number(b.source === "upload") - Number(a.source === "upload") || a.createdAt - b.createdAt);
    const keep = sorted[0];
    for (const i of sorted.slice(1)) dupRemoved.add(i.id);
    groups.push({
      id: `exact:${sha.slice(0, 16)}`,
      kind: "exact_duplicates",
      assetIds: sorted.map((i) => i.id),
      keepId: keep.id,
      reason: `${sorted.length} copies identiques du même fichier`,
    });
  }

  // 2) Quasi-doublons (photos). Indexation multiple : 8 bandes de 8 bits du dHash. Deux empreintes
  //    à ≤ 7 bits d'écart ont forcément au moins une bande identique (principe des tiroirs) : on
  //    ne compare que les paires qui partagent une bande, ce qui évite le O(n²) sur 10 000 photos.
  //    En complément, comparaison complète au sein d'un même jour de prise de vue (≤ 9 bits).
  const photos = items.filter((i) => i.kind === "photo" && i.hasHash && !dupRemoved.has(i.id));
  const uf = new UnionFind();
  const linked = new Set<string>();
  const tryPair = (a: Item, b: Item, max: number) => {
    if (a.id === b.id || sameLineage(a, b) || !similarAspect(a, b)) return;
    if (hamming(a, b) <= max) {
      uf.union(a.id, b.id);
      linked.add(a.id);
      linked.add(b.id);
    }
  };
  const BUCKET_CAP = 400; // bandes sans information (aplats) : on évite l'explosion quadratique
  for (let band = 0; band < 8; band++) {
    const buckets = new Map<number, Item[]>();
    for (const p of photos) {
      const word = band < 4 ? p.hi : p.lo;
      const key = (word >>> ((band % 4) * 8)) & 0xff;
      const b = buckets.get(key);
      if (b) b.push(p);
      else buckets.set(key, [p]);
    }
    for (const bucket of buckets.values()) {
      if (bucket.length < 2) continue;
      // Sous-découpage par une seconde bande si le tiroir est très plein.
      const sub =
        bucket.length > BUCKET_CAP
          ? [...groupBy(bucket, (p) => (((band + 1) % 8 < 4 ? p.hi : p.lo) >>> ((((band + 1) % 8) % 4) * 8)) & 0xff).values()]
          : [bucket];
      for (const s of sub) {
        for (let x = 0; x < s.length; x++) for (let y = x + 1; y < s.length; y++) tryPair(s[x], s[y], CLEANUP_THRESHOLDS.nearDistance);
      }
    }
  }
  for (const sameDay of groupBy(
    photos.filter((p) => p.day),
    (p) => p.day!,
  ).values()) {
    if (sameDay.length < 2 || sameDay.length > 3000) continue;
    for (let x = 0; x < sameDay.length; x++) for (let y = x + 1; y < sameDay.length; y++) tryPair(sameDay[x], sameDay[y], CLEANUP_THRESHOLDS.nearDistanceSameDay);
  }
  const clusters = groupBy(
    [...linked].map((id) => byId.get(id)!),
    (i) => uf.find(i.id),
  );
  for (const cluster of clusters.values()) {
    if (cluster.length < 2) continue;
    const sorted = [...cluster].sort((a, b) => compareBest(a, b, sharpness));
    const keep = sorted[0];
    let maxDist = 0;
    for (const i of sorted.slice(1)) {
      dupRemoved.add(i.id);
      maxDist = Math.max(maxDist, hamming(keep, i));
    }
    groups.push({
      id: `near:${keep.id}`,
      kind: "near_duplicates",
      assetIds: sorted.map((i) => i.id),
      keepId: keep.id,
      reason: `${sorted.length} photos presque identiques (écart ${maxDist <= 3 ? "minime" : "faible"}) : on garde la meilleure`,
    });
  }

  // 3) Problèmes individuels (jamais les favoris, ni ce qui part déjà avec un doublon).
  const singles = items.filter((i) => !i.starred && !dupRemoved.has(i.id));
  const norm = items.filter((i) => i.kind === "photo").map((i) => sharpness.get(i.id) ?? null).filter((x): x is number => x !== null);
  const med = norm.length >= CLEANUP_THRESHOLDS.blurMinSample ? median(norm) : null;
  const blurLimit = med !== null ? Math.min(med * CLEANUP_THRESHOLDS.blurMedianRatio, CLEANUP_THRESHOLDS.blurFloor) : CLEANUP_THRESHOLDS.blurFloorSmallLibrary;
  const single = (kind: CleanupKind, i: Item, reason: string) => groups.push({ id: `${kind}:${i.id}`, kind, assetIds: [i.id], keepId: null, reason });

  for (const i of singles) {
    if (i.kind === "photo") {
      const dark = (i.luma !== null && i.luma < CLEANUP_THRESHOLDS.darkLuma) || (i.clipLow !== null && i.clipLow > CLEANUP_THRESHOLDS.darkClip);
      const bright = (i.luma !== null && i.luma > CLEANUP_THRESHOLDS.brightLuma) || (i.clipHigh !== null && i.clipHigh > CLEANUP_THRESHOLDS.brightClip);
      // La netteté d'une image ratée en exposition n'est pas fiable (contraste écrasé) : on ne signale que l'exposition.
      const nb = sharpness.get(i.id) ?? null;
      if (!dark && !bright && nb !== null && nb < blurLimit) {
        single("blurry", i, `Netteté faible (${fmtScore(nb)}${med !== null ? ` ; vos photos sont en général à ${fmtScore(med)}` : ""})`);
      }
      if (dark) {
        single("underexposed", i, i.luma !== null && i.luma < CLEANUP_THRESHOLDS.darkLuma ? `Image très sombre (luminosité ${pct(i.luma)})` : `Beaucoup de noirs bouchés (${pct(i.clipLow ?? 0)} de l'image)`);
      }
      if (bright) {
        single("overexposed", i, i.luma !== null && i.luma > CLEANUP_THRESHOLDS.brightLuma ? `Image très claire (luminosité ${pct(i.luma)})` : `Blancs brûlés (${pct(i.clipHigh ?? 0)} de l'image)`);
      }
      const ls = longSide(i);
      if (ls !== null && ls < CLEANUP_THRESHOLDS.photoMinSide) single("low_resolution", i, `Petite image (${i.width}${NB}×${NB}${i.height}${NB}px, moins de ${CLEANUP_THRESHOLDS.photoMinSide}${NB}px)`);
    } else if (i.kind === "video") {
      const ls = longSide(i);
      if (ls !== null && ls < CLEANUP_THRESHOLDS.videoMinSide) single("low_resolution", i, `Vidéo en basse définition (${i.width}${NB}×${NB}${i.height}${NB}px)`);
      if (i.durationS !== null && i.durationS < CLEANUP_THRESHOLDS.shortVideoS) single("short_video", i, `Vidéo très courte (${i.durationS.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}${NB}s)`);
    }
  }

  // 4) Synthèse : compte des médias proposés par type, octets récupérables (médias uniques).
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<CleanupKind, number>;
  const suggested = new Set<string>();
  const involved = new Set<string>();
  for (const g of groups) {
    for (const id of g.assetIds) {
      involved.add(id);
      if (id === g.keepId) continue;
      counts[g.kind] += 1;
      suggested.add(id);
    }
  }
  let reclaimableBytes = 0;
  for (const id of suggested) reclaimableBytes += byId.get(id)?.sizeBytes ?? 0;

  const order = (g: CleanupGroup) => KINDS.indexOf(g.kind);
  groups.sort((a, b) => order(a) - order(b));
  const assets: Record<string, Asset> = {};
  for (const id of involved) assets[id] = toAsset(byId.get(id)!.row);
  return { generatedAt: new Date().toISOString(), groups, assets, counts, reclaimableBytes };
}

/**
 * Meilleure photo d'un groupe de quasi-doublons : favori, puis note de qualité de l'IA (si l'écart
 * compte), puis netteté (seulement si elle est nettement meilleure : une copie réduite paraît
 * toujours un peu plus nette à 256 px), puis résolution, puis poids du fichier, puis la plus ancienne.
 */
function compareBest(a: Item, b: Item, sharpness: Map<string, number | null>): number {
  if (a.starred !== b.starred) return a.starred ? -1 : 1;
  if (a.quality !== null && b.quality !== null && Math.abs(a.quality - b.quality) >= 5) return b.quality - a.quality;
  const sa = sharpness.get(a.id) ?? null;
  const sb = sharpness.get(b.id) ?? null;
  if (sa !== null && sb !== null && Math.max(sa, sb) > 1.35 * Math.min(sa, sb)) return sb - sa;
  const ra = (a.width ?? 0) * (a.height ?? 0);
  const rb = (b.width ?? 0) * (b.height ?? 0);
  if (ra !== rb) return rb - ra;
  if (a.sizeBytes !== b.sizeBytes) return b.sizeBytes - a.sizeBytes;
  return a.createdAt - b.createdAt;
}

function groupBy<T, K>(xs: T[], key: (x: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const x of xs) {
    const k = key(x);
    const l = m.get(k);
    if (l) l.push(x);
    else m.set(k, [x]);
  }
  return m;
}

/** Nombre de médias distincts proposés au ménage. */
export function suggestionCount(report: CleanupReport): number {
  const s = new Set<string>();
  for (const g of report.groups) for (const id of g.assetIds) if (id !== g.keepId) s.add(id);
  return s.size;
}

// ---------------------------------------------------------------------------------------------
// Cache (tableau de bord) : 60 s, invalidé dès que la médiathèque change.

type CacheEntry = { report?: CleanupReport; at?: number; fingerprint?: string };
// Un rapport en cache par client (clé « all » pour toute la médiathèque).
const caches: Map<string, CacheEntry> = ((globalThis as unknown as { __atelierCleanupByClient?: Map<string, CacheEntry> }).__atelierCleanupByClient ??= new Map());

export function invalidateCleanupCache() {
  caches.clear();
}

async function libraryFingerprint(): Promise<string> {
  const db = await getDb();
  const r = await db.one(`select count(*) as n, max(updated_at) as u from atelier.assets where status = 'ready'`);
  return `${num(r?.n)}:${r?.u ? iso(r.u) : ""}`;
}

/** Rapport mis en cache 60 s (ou tant que la médiathèque n'a pas changé). `fresh` force le recalcul. */
export async function getCleanupReport(opts: { fresh?: boolean; maxAgeMs?: number; client?: ClientFilter } = {}): Promise<CleanupReport> {
  const filter = await resolveClientFilter(opts.client);
  const cache = caches.get(filter ?? "all") ?? {};
  const fingerprint = await libraryFingerprint();
  const maxAge = opts.maxAgeMs ?? 60_000;
  if (!opts.fresh && cache.report && cache.at && Date.now() - cache.at < maxAge && cache.fingerprint === fingerprint) return cache.report;
  const report = await buildCleanupReport(filter);
  caches.set(filter ?? "all", { report, at: Date.now(), fingerprint });
  return report;
}

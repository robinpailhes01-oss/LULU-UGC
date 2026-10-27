/**
 * Différence ligne à ligne (plus longue sous-séquence commune), pour comparer deux versions
 * d'un skill. Pas de dépendance : les textes comparés font quelques centaines de lignes.
 */

export type DiffOp = "same" | "add" | "del";

export interface DiffLine {
  op: DiffOp;
  text: string;
  /** Numéro de ligne (1…) dans l'ancien texte (same, del) et dans le nouveau (same, add). */
  oldNo: number | null;
  newNo: number | null;
}

/** Au-delà, on renonce à l'alignement fin (tout supprimé puis tout ajouté) pour rester instantané. */
const MAX_CELLS = 4_000_000;

export function splitLines(text: string): string[] {
  if (text === "") return [];
  return text.replace(/\r\n?/g, "\n").split("\n");
}

/** Diff de deux listes de lignes. */
export function diffLines(a: string[], b: string[]): DiffLine[] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const out: DiffLine[] = [];
  for (let i = 0; i < start; i++) out.push({ op: "same", text: a[i], oldNo: i + 1, newNo: i + 1 });

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;

  if (n > 0 || m > 0) {
    if (n === 0 || m === 0 || n * m > MAX_CELLS) {
      midA.forEach((t, i) => out.push({ op: "del", text: t, oldNo: start + i + 1, newNo: null }));
      midB.forEach((t, j) => out.push({ op: "add", text: t, oldNo: null, newNo: start + j + 1 }));
    } else {
      // lcs[i][j] = longueur de la plus longue sous-séquence commune de midA[i..] et midB[j..]
      const w = m + 1;
      const lcs = new Uint32Array((n + 1) * w);
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          lcs[i * w + j] = midA[i] === midB[j] ? lcs[(i + 1) * w + j + 1] + 1 : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
        }
      }
      let i = 0;
      let j = 0;
      while (i < n || j < m) {
        if (i < n && j < m && midA[i] === midB[j]) {
          out.push({ op: "same", text: midA[i], oldNo: start + i + 1, newNo: start + j + 1 });
          i++;
          j++;
        } else if (j < m && (i >= n || lcs[i * w + j + 1] >= lcs[(i + 1) * w + j])) {
          out.push({ op: "add", text: midB[j], oldNo: null, newNo: start + j + 1 });
          j++;
        } else {
          out.push({ op: "del", text: midA[i], oldNo: start + i + 1, newNo: null });
          i++;
        }
      }
      // Présenter les suppressions avant les ajouts dans chaque bloc modifié (plus lisible).
      reorderHunks(out, start);
    }
  }

  const tailOffsetA = endA;
  const tailOffsetB = endB;
  for (let k = 0; k < a.length - endA; k++) out.push({ op: "same", text: a[tailOffsetA + k], oldNo: tailOffsetA + k + 1, newNo: tailOffsetB + k + 1 });
  return out;
}

function reorderHunks(lines: DiffLine[], from: number) {
  let k = from;
  while (k < lines.length) {
    if (lines[k].op === "same") {
      k++;
      continue;
    }
    let end = k;
    while (end < lines.length && lines[end].op !== "same") end++;
    const block = lines.slice(k, end);
    const sorted = [...block.filter((l) => l.op === "del"), ...block.filter((l) => l.op === "add")];
    lines.splice(k, block.length, ...sorted);
    k = end;
  }
}

export function diffText(a: string, b: string): DiffLine[] {
  return diffLines(splitLines(a), splitLines(b));
}

export function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.op === "add") added++;
    else if (l.op === "del") removed++;
  }
  return { added, removed };
}

export type DiffChunk = { kind: "lines"; lines: DiffLine[] } | { kind: "skip"; lines: DiffLine[] };

/**
 * Regroupe un diff en blocs affichables : les modifications avec `context` lignes autour, et
 * des blocs repliés « n lignes identiques » entre eux.
 */
export function chunkDiff(lines: DiffLine[], context = 3): DiffChunk[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((l, i) => {
    if (l.op === "same") return;
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) keep[k] = true;
  });
  const chunks: DiffChunk[] = [];
  let cur: DiffChunk | null = null;
  lines.forEach((l, i) => {
    const kind = keep[i] ? "lines" : "skip";
    if (!cur || cur.kind !== kind) {
      cur = { kind, lines: [] } as DiffChunk;
      chunks.push(cur);
    }
    cur.lines.push(l);
  });
  return chunks;
}

// ---------------------------------------------------------------------------------------------
// JSON stable pour comparer des paramètres

/**
 * Ordre de lecture des clés (celui des fichiers data.json) : la base renvoie le JSON avec des clés
 * réordonnées, on les remet dans un ordre logique et identique des deux côtés avant de comparer.
 */
const KEY_ORDER = [
  "format",
  "fps",
  "targetDurationS",
  "photoDurationS",
  "videoClipS",
  "transition",
  "pacing",
  "look",
  "fonts",
  "colors",
  "textAnimation",
  "textPlacement",
  "captions",
  "music",
  "endCard",
  "structure",
  "min",
  "max",
  "type",
  "role",
  "durationS",
  "shot",
  "display",
  "text",
  "accent",
  "plate",
  "background",
  "mood",
  "volume",
  "fadeOutS",
  "title",
  "subtitle",
];
const RANK = new Map(KEY_ORDER.map((k, i) => [k, i]));

export function orderKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(orderKeys);
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const keys = Object.keys(o).sort((x, y) => {
      const rx = RANK.get(x) ?? Number.MAX_SAFE_INTEGER;
      const ry = RANK.get(y) ?? Number.MAX_SAFE_INTEGER;
      return rx !== ry ? rx - ry : x.localeCompare(y);
    });
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = orderKeys(o[k]);
    return out;
  }
  return value;
}

/** JSON indenté, clés dans l'ordre de lecture ; les petits objets et tableaux de valeurs tiennent sur une ligne. */
export function prettyJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  return format(orderKeys(value), 0);
}

function isFlat(v: unknown): boolean {
  if (Array.isArray(v)) return v.every((x) => x === null || typeof x !== "object");
  if (v && typeof v === "object") return Object.values(v as Record<string, unknown>).every((x) => x === null || typeof x !== "object");
  return true;
}

function format(v: unknown, depth: number): string {
  const pad = "  ".repeat(depth + 1);
  const end = "  ".repeat(depth);
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    const inline = `[${v.map((x) => JSON.stringify(x)).join(", ")}]`;
    if (isFlat(v) && inline.length <= 80) return inline;
    return `[\n${v.map((x) => pad + format(x, depth + 1)).join(",\n")}\n${end}]`;
  }
  if (v && typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    if (depth > 0 && isFlat(v)) {
      const inline = `{ ${entries.map(([k, x]) => `${JSON.stringify(k)}: ${JSON.stringify(x)}`).join(", ")} }`;
      if (inline.length + depth * 2 <= 140) return inline;
    }
    return `{\n${entries.map(([k, x]) => `${pad}${JSON.stringify(k)}: ${format(x, depth + 1)}`).join(",\n")}\n${end}}`;
  }
  return JSON.stringify(v);
}

/** Égalité profonde indépendante de l'ordre des clés. */
export function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(orderKeys(a ?? null)) === JSON.stringify(orderKeys(b ?? null));
}

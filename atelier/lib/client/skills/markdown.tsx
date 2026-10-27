import { Fragment, type ReactNode } from "react";

/**
 * Petit moteur Markdown → éléments React, pour l'aperçu des consignes d'un skill.
 * Jamais de HTML brut : tout le texte passe par React (échappé), les liens sont filtrés
 * (http, https, mailto, tel, liens relatifs) et s'ouvrent avec rel="noopener noreferrer".
 *
 * Pris en charge : titres, paragraphes, listes (imbriquées, numérotées), gras, italique, barré,
 * code en ligne, blocs de code, citations, liens (et adresses nues), tableaux simples, filets.
 */

// ---------------------------------------------------------------------------------------------
// Blocs

type Block =
  | { t: "heading"; level: number; text: string }
  | { t: "para"; text: string }
  | { t: "code"; lang: string; text: string }
  | { t: "quote"; blocks: Block[] }
  | { t: "list"; ordered: boolean; start: number; items: Block[][] }
  | { t: "table"; align: ("left" | "center" | "right" | null)[]; head: string[]; rows: string[][] }
  | { t: "hr" };

const RE_FENCE = /^\s{0,3}(`{3,}|~{3,})\s*([\w+-]*)/;
const RE_HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_HR = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const RE_QUOTE = /^\s{0,3}>\s?(.*)$/;
const RE_LIST = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
const RE_TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

const indentOf = (line: string) => line.length - line.replace(/^\s+/, "").length;
const isBlank = (line: string) => line.trim() === "";

function startsBlock(line: string): boolean {
  return RE_FENCE.test(line) || RE_HEADING.test(line) || RE_HR.test(line) || RE_QUOTE.test(line) || RE_LIST.test(line);
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (s[i] === "|") {
      cells.push(cur.trim());
      cur = "";
    } else cur += s[i];
  }
  cells.push(cur.trim());
  return cells;
}

export function parseBlocks(src: string, depth = 0): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }

    const fence = RE_FENCE.exec(line);
    if (fence) {
      const marker = fence[1];
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) body.push(lines[i++]);
      i++; // clôture
      blocks.push({ t: "code", lang: fence[2] ?? "", text: body.join("\n") });
      continue;
    }

    const heading = RE_HEADING.exec(line);
    if (heading) {
      blocks.push({ t: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (RE_HR.test(line)) {
      blocks.push({ t: "hr" });
      i++;
      continue;
    }

    if (RE_QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && !isBlank(lines[i])) {
        const q = RE_QUOTE.exec(lines[i]);
        if (q) inner.push(q[1]);
        else if (startsBlock(lines[i])) break;
        else inner.push(lines[i]); // continuation paresseuse
        i++;
      }
      blocks.push({ t: "quote", blocks: depth < 8 ? parseBlocks(inner.join("\n"), depth + 1) : [{ t: "para", text: inner.join(" ") }] });
      continue;
    }

    const li = RE_LIST.exec(line);
    if (li) {
      const res = parseList(lines, i, depth);
      blocks.push(res.block);
      i = res.next;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1])) {
      const head = splitRow(line);
      const align = splitRow(lines[i + 1]).map((c) => (c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : c.startsWith(":") ? "left" : null));
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes("|")) rows.push(splitRow(lines[i++]));
      blocks.push({ t: "table", align, head, rows });
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && !isBlank(lines[i]) && (para.length === 0 || !startsBlock(lines[i]))) {
      if (para.length > 0 && lines[i].includes("|") && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1])) break;
      para.push(lines[i++]);
    }
    blocks.push({ t: "para", text: joinParagraph(para) });
  }
  return blocks;
}

/** Lignes d'un paragraphe : retour à la ligne doux (espace), sauf « deux espaces » ou « \ » en fin de ligne. */
function joinParagraph(lines: string[]): string {
  return lines
    .map((l, k) => {
      const trimmed = l.trim();
      if (k === lines.length - 1) return trimmed;
      if (/ {2,}$/.test(l) || trimmed.endsWith("\\")) return `${trimmed.replace(/\\$/, "")} `;
      return `${trimmed} `;
    })
    .join("");
}

function parseList(lines: string[], from: number, depth: number): { block: Block; next: number } {
  const first = RE_LIST.exec(lines[from])!;
  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const start = ordered ? parseInt(first[2], 10) : 1;
  const items: string[][] = [];
  let cur: string[] = [];
  let contentCol = baseIndent + first[2].length + Math.min(first[3].length, 4);
  let i = from;
  let prevBlank = false;

  const sameKindMarker = (m: RegExpExecArray) => m[1].length <= baseIndent + 1 && /\d/.test(m[2]) === ordered;

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      // Une ligne vide ne termine la liste que si la suite n'en fait plus partie.
      let k = i + 1;
      while (k < lines.length && isBlank(lines[k])) k++;
      if (k >= lines.length) break;
      const nxt = lines[k];
      const m = RE_LIST.exec(nxt);
      if ((m && sameKindMarker(m)) || indentOf(nxt) >= contentCol) {
        cur.push("");
        i++;
        prevBlank = true;
        continue;
      }
      break;
    }
    const m = RE_LIST.exec(line);
    if (m && sameKindMarker(m)) {
      if (i !== from) items.push(cur);
      cur = [m[4]];
      contentCol = m[1].length + m[2].length + Math.min(m[3].length, 4);
      i++;
      prevBlank = false;
      continue;
    }
    const ind = indentOf(line);
    if (ind > baseIndent) {
      cur.push(line.slice(Math.min(ind, contentCol)));
      i++;
      prevBlank = false;
      continue;
    }
    // Continuation paresseuse d'un paragraphe (ligne non indentée juste après du texte).
    if (!prevBlank && !startsBlock(line) && !(m && !sameKindMarker(m))) {
      cur.push(line.trim());
      i++;
      continue;
    }
    break;
  }
  items.push(cur);
  const parsed = items.map((it) => (depth < 8 ? parseBlocks(it.join("\n"), depth + 1) : [{ t: "para", text: it.join(" ") } as Block]));
  return { block: { t: "list", ordered, start, items: parsed }, next: i };
}

// ---------------------------------------------------------------------------------------------
// En ligne

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#|\.{1,2}\/)/i;

export function safeHref(url: string): string | null {
  const u = url.trim().replace(/^<|>$/g, "");
  if (!u || /[\u0000-\u001f]/.test(u)) return null;
  return SAFE_URL.test(u) ? u : null;
}

const ESCAPABLE = /[\\`*_{}[\]()#+\-.!|~>]/;
const RE_BARE_URL = /^https?:\/\/[^\s<>"]+/;

function trimUrlTail(u: string): string {
  let out = u;
  while (/[.,;:!?'"»)\]]$/.test(out)) {
    if (out.endsWith(")") && (out.match(/\(/g)?.length ?? 0) >= (out.match(/\)/g)?.length ?? 0)) break;
    out = out.slice(0, -1);
  }
  return out;
}

function findClosingBracket(s: string, from: number): number {
  let depth = 0;
  for (let k = from; k < s.length; k++) {
    if (s[k] === "\\") {
      k++;
      continue;
    }
    if (s[k] === "[") depth++;
    else if (s[k] === "]") {
      depth--;
      if (depth === 0) return k;
    }
  }
  return -1;
}

function findClosingParen(s: string, from: number): number {
  let depth = 0;
  for (let k = from; k < s.length; k++) {
    if (s[k] === "(") depth++;
    else if (s[k] === ")") {
      depth--;
      if (depth === 0) return k;
    }
  }
  return -1;
}

const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c);
const isWordChar = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}]/u.test(c);

/** Position du délimiteur fermant (`**`, `*`, `__`, `_`, `~~`) ou -1. */
function findCloser(s: string, from: number, delim: string): number {
  const ch = delim[0];
  for (let k = from; k <= s.length - delim.length; k++) {
    if (s[k] === "\\") {
      k++;
      continue;
    }
    if (s[k] === "`") {
      // ne pas chercher à l'intérieur d'un code en ligne
      const end = s.indexOf("`", k + 1);
      if (end > 0) {
        k = end;
        continue;
      }
    }
    if (!s.startsWith(delim, k)) continue;
    if (isSpace(s[k - 1])) continue;
    if (delim.length === 1 && (s[k + 1] === ch || s[k - 1] === ch)) continue;
    if (ch === "_" && isWordChar(s[k + delim.length])) continue;
    if (k === from) continue;
    return k;
  }
  return -1;
}

export function renderInline(s: string, depth = 0): ReactNode[] {
  let keySeq = 0;
  const out: ReactNode[] = [];
  let buf = "";
  const flush = () => {
    if (!buf) return;
    const parts = buf.split(" ");
    parts.forEach((p, k) => {
      if (k > 0) out.push(<br key={`br${keySeq++}`} />);
      if (p) out.push(p);
    });
    buf = "";
  };
  const push = (node: ReactNode) => {
    flush();
    out.push(node);
  };

  let i = 0;
  while (i < s.length) {
    const c = s[i];

    if (c === "\\" && i + 1 < s.length && ESCAPABLE.test(s[i + 1])) {
      buf += s[i + 1];
      i += 2;
      continue;
    }

    if (c === "`") {
      let n = 1;
      while (s[i + n] === "`") n++;
      const fence = "`".repeat(n);
      const end = s.indexOf(fence, i + n);
      if (end > 0) {
        push(
          <code key={`c${keySeq++}`} className="rounded bg-sunken px-1 py-px font-mono text-[0.88em] text-ink">
            {s.slice(i + n, end).trim() || s.slice(i + n, end)}
          </code>,
        );
        i = end + n;
        continue;
      }
      buf += fence;
      i += n;
      continue;
    }

    if ((c === "[" || (c === "!" && s[i + 1] === "[")) && depth < 6) {
      const open = c === "!" ? i + 1 : i;
      const close = findClosingBracket(s, open);
      if (close > 0 && s[close + 1] === "(") {
        const pEnd = findClosingParen(s, close + 1);
        if (pEnd > 0) {
          const label = s.slice(open + 1, close);
          const target = s.slice(close + 2, pEnd).trim().split(/\s+"/)[0];
          const href = safeHref(target);
          const children = renderInline(label || target, depth + 1);
          push(
            href ? (
              <a key={`a${keySeq++}`} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-chestnut underline decoration-chestnut/40 underline-offset-2 hover:decoration-chestnut">
                {children}
              </a>
            ) : (
              <Fragment key={`a${keySeq++}`}>{children}</Fragment>
            ),
          );
          i = pEnd + 1;
          continue;
        }
      }
    }

    if (c === "<") {
      const m = /^<(https?:\/\/[^\s>]+|mailto:[^\s>]+)>/.exec(s.slice(i));
      if (m) {
        const href = safeHref(m[1]);
        push(
          <a key={`a${keySeq++}`} href={href ?? undefined} target="_blank" rel="noopener noreferrer" className="font-medium text-chestnut underline decoration-chestnut/40 underline-offset-2">
            {m[1]}
          </a>,
        );
        i += m[0].length;
        continue;
      }
    }

    if (c === "h" && (i === 0 || !isWordChar(s[i - 1])) && (s.startsWith("http://", i) || s.startsWith("https://", i))) {
      const m = RE_BARE_URL.exec(s.slice(i));
      if (m) {
        const url = trimUrlTail(m[0]);
        push(
          <a key={`a${keySeq++}`} href={url} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-chestnut underline decoration-chestnut/40 underline-offset-2">
            {url}
          </a>,
        );
        i += url.length;
        continue;
      }
    }

    if ((c === "*" || c === "_") && depth < 6) {
      let n = 1;
      while (s[i + n] === c && n < 3) n++;
      const leftOk = !isSpace(s[i + n]) && (c === "*" || !isWordChar(s[i - 1]));
      if (leftOk) {
        const delim = c.repeat(n);
        const end = findCloser(s, i + n, delim);
        if (end > 0) {
          const inner = renderInline(s.slice(i + n, end), depth + 1);
          const key = `e${keySeq++}`;
          push(
            n === 3 ? (
              <strong key={key} className="font-semibold text-ink">
                <em>{inner}</em>
              </strong>
            ) : n === 2 ? (
              <strong key={key} className="font-semibold text-ink">
                {inner}
              </strong>
            ) : (
              <em key={key}>{inner}</em>
            ),
          );
          i = end + n;
          continue;
        }
      }
      buf += c.repeat(n);
      i += n;
      continue;
    }

    if (c === "~" && s[i + 1] === "~" && depth < 6) {
      const end = findCloser(s, i + 2, "~~");
      if (end > 0) {
        push(<del key={`d${keySeq++}`}>{renderInline(s.slice(i + 2, end), depth + 1)}</del>);
        i = end + 2;
        continue;
      }
    }

    buf += c;
    i++;
  }
  flush();
  return out;
}

// ---------------------------------------------------------------------------------------------
// Rendu

const H_CLASS: Record<number, string> = {
  1: "mb-3 mt-1 font-display text-[1.45rem] font-[400] leading-tight tracking-[-0.01em] text-ink",
  2: "mb-2 mt-6 text-[1.02rem] font-semibold text-ink",
  3: "mb-1.5 mt-5 text-[0.95rem] font-semibold text-ink",
  4: "mb-1 mt-4 text-[0.9rem] font-semibold text-muted",
  5: "mb-1 mt-3 text-[0.85rem] font-semibold uppercase tracking-wide text-muted",
  6: "mb-1 mt-3 text-[0.8rem] font-semibold uppercase tracking-wide text-faint",
};

function renderBlocks(blocks: Block[], tight = false): ReactNode[] {
  return blocks.map((b, k) => {
    const key = `b${k}`;
    switch (b.t) {
      case "heading": {
        const Tag = `h${Math.min(6, b.level + 1)}` as "h2";
        return (
          <Tag key={key} className={H_CLASS[b.level]}>
            {renderInline(b.text)}
          </Tag>
        );
      }
      case "para":
        return tight ? (
          <Fragment key={key}>{renderInline(b.text)}</Fragment>
        ) : (
          <p key={key} className="my-2 leading-relaxed">
            {renderInline(b.text)}
          </p>
        );
      case "code":
        return (
          <pre key={key} className="my-3 overflow-x-auto rounded-lg border border-line bg-sunken/70 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-ink">
            <code>{b.text}</code>
          </pre>
        );
      case "quote":
        return (
          <blockquote key={key} className="my-3 border-l-[3px] border-honey/70 pl-3.5 text-muted [&>p]:my-1">
            {renderBlocks(b.blocks)}
          </blockquote>
        );
      case "hr":
        return <hr key={key} className="my-5 border-line" />;
      case "list": {
        const ListTag = b.ordered ? "ol" : "ul";
        return (
          <ListTag key={key} start={b.ordered && b.start !== 1 ? b.start : undefined} className={b.ordered ? "my-2 list-decimal space-y-1 pl-6 marker:text-muted" : "my-2 list-disc space-y-1 pl-5 marker:text-honey"}>
            {b.items.map((item, j) => {
              const single = item.length === 1 && item[0].t === "para";
              const startsWithPara = item.length > 1 && item[0].t === "para" && item.slice(1).every((x) => x.t === "list");
              return (
                <li key={j} className="pl-0.5 leading-relaxed">
                  {single ? renderBlocks(item, true) : startsWithPara ? [<Fragment key="p">{renderInline((item[0] as { text: string }).text)}</Fragment>, ...renderBlocks(item.slice(1))] : renderBlocks(item)}
                </li>
              );
            })}
          </ListTag>
        );
      }
      case "table":
        return (
          <div key={key} className="my-3 overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {b.head.map((h, j) => (
                    <th key={j} style={{ textAlign: b.align[j] ?? "left" }} className="border-b border-line-strong px-2.5 py-1.5 font-semibold text-ink">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, j) => (
                  <tr key={j} className="even:bg-sunken/40">
                    {b.head.map((_, c) => (
                      <td key={c} style={{ textAlign: b.align[c] ?? "left" }} className="border-b border-line px-2.5 py-1.5 align-top">
                        {renderInline(r[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  });
}

/** Aperçu Markdown sûr (aucun HTML injecté). */
export function Markdown({ source, className }: { source: string; className?: string }) {
  return <div className={className ?? "text-[14px] text-ink"}>{renderBlocks(parseBlocks(source))}</div>;
}

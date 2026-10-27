"use client";

import Link from "next/link";
import { Fragment } from "react";
import { cx } from "@/components/ui/cx";

/**
 * Rendu Markdown minimal et sûr pour les réponses de l'agent : paragraphes, listes à puces et
 * numérotées, **gras**, *italique*, `code`, [liens](…). Tout est construit en éléments React :
 * aucun HTML du modèle n'est injecté. Liens internes (« /… ») via next/link, liens externes
 * http(s) dans un nouvel onglet ; tout autre schéma est affiché comme du texte.
 */

type Block = { type: "p"; lines: string[] } | { type: "ul"; items: string[] } | { type: "ol"; items: string[]; start: number } | { type: "quote"; lines: string[] };

function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  let cur: Block | null = null;
  const push = () => {
    if (cur) blocks.push(cur);
    cur = null;
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      push();
      continue;
    }
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*(\d{1,3})[.)]\s+(.*)$/.exec(line);
    const quote = /^\s*>\s?(.*)$/.exec(line);
    const heading = /^\s*#{1,6}\s+(.*)$/.exec(line);
    if (ul) {
      if (!cur || cur.type !== "ul") {
        push();
        cur = { type: "ul", items: [] };
      }
      cur.items.push(ul[1]);
    } else if (ol) {
      if (!cur || cur.type !== "ol") {
        push();
        cur = { type: "ol", items: [], start: Number(ol[1]) || 1 };
      }
      cur.items.push(ol[2]);
    } else if (quote) {
      if (!cur || cur.type !== "quote") {
        push();
        cur = { type: "quote", lines: [] };
      }
      cur.lines.push(quote[1]);
    } else if (heading) {
      push();
      blocks.push({ type: "p", lines: [`**${heading[1]}**`] });
    } else if (cur && (cur.type === "ul" || cur.type === "ol") && /^\s{2,}\S/.test(raw)) {
      // Suite d'un élément de liste sur la ligne suivante (indentée).
      cur.items[cur.items.length - 1] += ` ${line.trim()}`;
    } else {
      if (!cur || cur.type !== "p") {
        push();
        cur = { type: "p", lines: [] };
      }
      cur.lines.push(line.trim());
    }
  }
  push();
  return blocks;
}

const INLINE = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\n]+?\*|(?<![\p{L}\d])_[^_\n]+?_(?![\p{L}\d]))/u;

function safeHref(href: string): { kind: "internal" | "external"; href: string } | null {
  if (/^\/(?!\/)/.test(href)) return { kind: "internal", href };
  if (/^https?:\/\//i.test(href)) return { kind: "external", href };
  return null;
}

/** Espaces insécables de la typographie française (guillemets, deux-points, ponctuation haute). */
export function frenchSpaces(text: string): string {
  return text.replace(/«\s+/g, "«\u00a0").replace(/\s+»/g, "\u00a0»").replace(/\s+([:;?!])(?=\s|$)/g, "\u00a0$1");
}

function renderInline(text: string, key = "i", onNavigate?: () => void): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = frenchSpaces(text);
  let n = 0;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m || m.index === undefined) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const tok = m[0];
    const k = `${key}-${n++}`;
    if (tok.startsWith("**") || tok.startsWith("__")) out.push(<strong key={k} className="font-semibold text-ink">{renderInline(tok.slice(2, -2), k, onNavigate)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k} className="rounded bg-sunken px-1 py-px font-mono text-[12.5px]">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("[")) {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!;
      const target = safeHref(lm[2]);
      const label = renderInline(lm[1], k, onNavigate);
      if (!target) out.push(<Fragment key={k}>{label}</Fragment>);
      else if (target.kind === "internal")
        out.push(
          <Link key={k} href={target.href} onClick={onNavigate} className="font-medium text-chestnut underline decoration-chestnut/30 underline-offset-2 hover:decoration-chestnut">
            {label}
          </Link>,
        );
      else
        out.push(
          <a key={k} href={target.href} target="_blank" rel="noopener noreferrer" className="font-medium text-chestnut underline decoration-chestnut/30 underline-offset-2 hover:decoration-chestnut">
            {label}
          </a>,
        );
    } else out.push(<em key={k}>{renderInline(tok.slice(1, -1), k, onNavigate)}</em>);
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

export function Markdown({ text, className, onNavigate }: { text: string; className?: string; onNavigate?: () => void }) {
  const blocks = parseBlocks(text);
  return (
    <div className={cx("space-y-2 text-[14px] leading-[1.6] text-ink", className)}>
      {blocks.map((b, i) => {
        if (b.type === "p")
          return (
            <p key={i}>
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 ? <br /> : null}
                  {renderInline(l, `${i}-${j}`, onNavigate)}
                </Fragment>
              ))}
            </p>
          );
        if (b.type === "quote")
          return (
            <blockquote key={i} className="border-l-2 border-honey/60 pl-3 text-muted">
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 ? <br /> : null}
                  {renderInline(l, `${i}-${j}`, onNavigate)}
                </Fragment>
              ))}
            </blockquote>
          );
        const Tag = b.type === "ul" ? "ul" : "ol";
        return (
          <Tag key={i} start={b.type === "ol" ? b.start : undefined} className={cx("space-y-1 pl-5", b.type === "ul" ? "list-disc marker:text-faint" : "list-decimal marker:text-muted")}>
            {b.items.map((it, j) => (
              <li key={j} className="pl-0.5">
                {renderInline(it, `${i}-${j}`, onNavigate)}
              </li>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}

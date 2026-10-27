"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { cx } from "@/components/ui/cx";

const INDENT = "  ";

/** Insère du texte à la place de la sélection en gardant l'historique d'annulation du navigateur. */
function insertText(el: HTMLTextAreaElement, text: string, onChange: (v: string) => void) {
  el.focus();
  let ok = false;
  try {
    ok = document.execCommand("insertText", false, text);
  } catch {
    ok = false;
  }
  if (!ok) {
    el.setRangeText(text, el.selectionStart, el.selectionEnd, "end");
    onChange(el.value);
  }
}

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let cur = el?.parentElement ?? null;
  while (cur) {
    const oy = getComputedStyle(cur).overflowY;
    if ((oy === "auto" || oy === "scroll") && cur.scrollHeight > cur.clientHeight) return cur;
    cur = cur.parentElement;
  }
  return null;
}

export interface CodeTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> {
  value: string;
  onChange: (v: string) => void;
  /** Hauteur minimale en pixels ; le champ grandit avec son contenu. */
  minHeight?: number;
  invalid?: boolean;
  /** false : police normale, Tab passe au champ suivant, Entrée n'ajoute pas de ligne (champ d'une ligne qui s'enroule). */
  code?: boolean;
}

/**
 * Zone de texte à chasse fixe pour le Markdown et les fichiers annexes : grandit avec le contenu,
 * Tab insère deux espaces (Maj+Tab retire l'indentation). Échap puis Tab : quitter le champ.
 */
export const CodeTextarea = forwardRef<HTMLTextAreaElement, CodeTextareaProps>(function CodeTextarea({ value, onChange, minHeight = 160, invalid, className, onKeyDown, code = true, ...rest }, ref) {
  const inner = useRef<HTMLTextAreaElement>(null);
  const escaped = useRef(false);
  useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);

  const grow = useCallback(() => {
    const el = inner.current;
    if (!el) return;
    const parent = findScrollParent(el);
    const keep = parent?.scrollTop ?? 0;
    const winKeep = window.scrollY;
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeight, el.scrollHeight + 2)}px`;
    if (parent) parent.scrollTop = keep;
    if (window.scrollY !== winKeep) window.scrollTo({ top: winKeep });
  }, [minHeight]);

  useLayoutEffect(grow, [value, grow]);
  useEffect(() => {
    const onResize = () => grow();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [grow]);

  return (
    <textarea
      ref={inner}
      value={value}
      spellCheck={rest.spellCheck ?? true}
      rows={code ? undefined : 1}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (!code) {
          if (e.key === "Enter" && !e.shiftKey) e.preventDefault();
          return;
        }
        if (e.key === "Escape") {
          escaped.current = true;
          return;
        }
        if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (escaped.current) {
            escaped.current = false;
            return; // laisser le focus sortir du champ
          }
          e.preventDefault();
          const el = e.currentTarget;
          const { selectionStart: s, selectionEnd: end, value: v } = el;
          const lineStart = v.lastIndexOf("\n", s - 1) + 1;
          const multi = v.slice(s, end).includes("\n");
          if (!e.shiftKey && !multi) {
            insertText(el, INDENT, onChange);
            return;
          }
          // Indenter / désindenter toutes les lignes sélectionnées.
          const blockEnd = v.indexOf("\n", end - (end > s && v[end - 1] === "\n" ? 1 : 0));
          const stop = blockEnd === -1 ? v.length : blockEnd;
          const block = v.slice(lineStart, stop);
          const lines = block.split("\n");
          const next = e.shiftKey ? lines.map((l) => (l.startsWith(INDENT) ? l.slice(2) : l.replace(/^ /, ""))) : lines.map((l) => INDENT + l);
          const replaced = next.join("\n");
          if (replaced === block) return;
          el.setSelectionRange(lineStart, stop);
          insertText(el, replaced, onChange);
          el.setSelectionRange(lineStart, lineStart + replaced.length);
          return;
        }
        escaped.current = false;
      }}
      className={cx(
        "block w-full resize-none overflow-hidden rounded-lg border bg-surface text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus-visible:outline-none",
        code ? "px-3.5 py-3 font-mono text-[13px] leading-[1.65]" : "px-2.5 py-[7px] text-[13.5px] leading-snug",
        invalid ? "border-terracotta focus:ring-terracotta/20" : "border-line focus:border-chestnut focus:ring-chestnut/20",
        className,
      )}
      style={{ minHeight, tabSize: 2 }}
      {...rest}
    />
  );
});

"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { cx } from "@/components/ui/cx";

export function normalizeTag(t: string): string {
  return t.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, " ").slice(0, 40);
}

/**
 * Saisie de mots-clés avec autocomplétion (liste des mots-clés déjà utilisés).
 * Entrée ou virgule ajoute ; Retour arrière sur un champ vide retire le dernier.
 */
export function TagInput({
  value,
  onAdd,
  onRemove,
  suggestions,
  placeholder = "Ajouter un mot-clé",
  autoFocus,
  chipTone,
  showChips = true,
  className,
}: {
  value: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  suggestions: { tag: string; count: number }[];
  placeholder?: string;
  autoFocus?: boolean;
  chipTone?: (tag: string) => "normal" | "removed" | "added";
  showChips?: boolean;
  className?: string;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [navigated, setNavigated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const q = normalizeTag(text);
    const taken = new Set(value);
    return suggestions.filter((s) => !taken.has(s.tag) && (!q || s.tag.includes(q))).slice(0, 8);
  }, [text, suggestions, value]);

  const commit = (raw: string) => {
    const t = normalizeTag(raw);
    if (!t) return;
    if (!value.includes(t)) onAdd(t);
    setText("");
    setActive(0);
  };

  return (
    <div className={cx("relative", className)}>
      {showChips && value.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Mots-clés">
          {value.map((t) => {
            const tone = chipTone?.(t) ?? "normal";
            return (
              <li
                key={t}
                className={cx(
                  "inline-flex h-7 items-center gap-1 rounded-full pl-2.5 pr-1 text-[12.5px]",
                  tone === "removed" ? "bg-terracotta-soft text-terracotta line-through" : tone === "added" ? "bg-olive-soft text-olive" : "bg-sunken text-ink",
                )}
              >
                {t}
                <button type="button" onClick={() => onRemove(t)} aria-label={`Retirer le mot-clé ${t}`} className="rounded-full p-0.5 text-muted hover:bg-hover hover:text-ink">
                  <X className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="relative">
        <Plus className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
        <input
          ref={inputRef}
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) {
              v.split(",").slice(0, -1).forEach(commit);
              setText(v.split(",").pop() ?? "");
            } else setText(v);
            setOpen(true);
            setActive(0);
            setNavigated(false);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (open && navigated && matches[active]) commit(matches[active].tag);
              else commit(text);
              setNavigated(false);
            } else if (e.key === "ArrowDown" && matches.length) {
              e.preventDefault();
              setOpen(true);
              setNavigated(true);
              setActive((a) => (navigated ? (a + 1) % matches.length : 0));
            } else if (e.key === "ArrowUp" && matches.length) {
              e.preventDefault();
              setNavigated(true);
              setActive((a) => (a - 1 + matches.length) % matches.length);
            } else if (e.key === "Backspace" && !text && value.length) {
              onRemove(value[value.length - 1]);
            } else if (e.key === "Escape" && open && matches.length) {
              e.stopPropagation();
              e.preventDefault();
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && navigated && matches[active] ? `${listId}-${active}` : undefined}
          maxLength={40}
          className="h-8 w-full rounded-lg border border-line bg-surface pl-7 pr-2 text-[13px] placeholder:text-faint focus:border-chestnut focus:outline-none focus:ring-2 focus:ring-chestnut/20"
        />
        {open && matches.length > 0 ? (
          <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-menu mt-1 max-h-56 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-pop">
            {matches.map((m, i) => (
              <li
                key={m.tag}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={navigated && i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(m.tag);
                  inputRef.current?.focus();
                }}
                onMouseEnter={() => {
                  setActive(i);
                  setNavigated(true);
                }}
                className={cx("flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px]", navigated && i === active && "bg-hover")}
              >
                <span>{m.tag}</span>
                <span className="text-2xs tabular-nums text-faint">{m.count}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

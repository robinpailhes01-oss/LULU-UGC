"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { useToast } from "@/components/ui/Toast";
import { CodeTextarea } from "@/components/skills/CodeTextarea";
import { FieldError, NumberField } from "@/components/skills/controls";
import { segmentTone, StructureTimeline } from "@/components/skills/StructureTimeline";
import { issuesAt, LIMITS, ROLE_SUGGESTIONS, type Issue } from "@/lib/client/skills/montage-style";
import type { MontageStyleData } from "@/lib/shared/types";

type Row = NonNullable<MontageStyleData["structure"]>[number];

let keySeq = 0;
const newKey = () => `row-${++keySeq}`;

const inputClass =
  "h-9 w-full min-w-0 rounded-lg border border-line bg-surface px-2.5 text-[13.5px] text-ink placeholder:text-faint focus:border-chestnut focus:outline-none focus:ring-2 focus:ring-chestnut/20 focus-visible:outline-none aria-[invalid=true]:border-terracotta";

/**
 * Déroulé type d'un style, plan par plan (rôle, durée, plan à chercher, texte à l'écran), avec
 * une frise proportionnelle comparée à la durée visée. Réordonner : boutons ou Alt + ↑/↓.
 */
export function StructureEditor({
  rows,
  onChange,
  issues,
  target,
  revealAll,
}: {
  rows: Row[];
  onChange: (rows: Row[]) => void;
  issues: Issue[];
  target?: { min: number; max: number };
  revealAll: boolean;
}) {
  const toast = useToast();
  const listId = useId();
  const [keys, setKeys] = useState<string[]>(() => rows.map(newKey));
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<number | null>(null);
  const focusAfter = useRef<{ key: string; field: string } | null>(null);
  const refs = useRef(new Map<string, HTMLElement>());

  // Données remplacées de l'extérieur (JSON, retour arrière) : nouvelles clés.
  useEffect(() => {
    if (keys.length !== rows.length) setKeys(rows.map(newKey));
  }, [rows, keys.length]);

  useEffect(() => {
    const f = focusAfter.current;
    if (!f) return;
    focusAfter.current = null;
    const el = refs.current.get(`${f.key}:${f.field}`);
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  });

  const commit = (next: Row[], nextKeys: string[]) => {
    setKeys(nextKeys);
    onChange(next);
  };

  const setRow = (i: number, patch: Partial<Row>) => {
    const next = rows.map((r, k) => {
      if (k !== i) return r;
      const merged: Row = { ...r, ...patch };
      if (merged.durationS === undefined) delete merged.durationS;
      if (merged.text === undefined || merged.text === "") delete merged.text;
      return merged;
    });
    onChange(next);
  };

  const move = (i: number, dir: -1 | 1, field = dir < 0 ? "up" : "down") => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    const nk = [...keys];
    [next[i], next[j]] = [next[j], next[i]];
    [nk[i], nk[j]] = [nk[j], nk[i]];
    focusAfter.current = { key: nk[j], field: j === 0 && field === "up" ? "down" : j === rows.length - 1 && field === "down" ? "up" : field };
    setActive(j);
    commit(next, nk);
  };

  const add = () => {
    const k = newKey();
    setFresh((s) => new Set(s).add(k));
    focusAfter.current = { key: k, field: "role" };
    commit([...rows, { role: "", shot: "" }], [...keys, k]);
  };

  const remove = (i: number) => {
    const removed = rows[i];
    const removedKey = keys[i];
    const before = rows;
    const beforeKeys = keys;
    commit(
      rows.filter((_, k) => k !== i),
      keys.filter((_, k) => k !== i),
    );
    setActive(null);
    toast(`Plan ${i + 1}${removed.role ? ` « ${removed.role} »` : ""} retiré`, {
      action: {
        label: "Annuler",
        onClick: () => {
          focusAfter.current = { key: removedKey, field: "role" };
          commit(before, beforeKeys);
        },
      },
    });
  };

  const reg = (key: string, field: string) => (el: HTMLElement | null) => {
    if (el) refs.current.set(`${key}:${field}`, el);
    else refs.current.delete(`${key}:${field}`);
  };

  return (
    <div className="space-y-3">
      <StructureTimeline
        structure={rows}
        target={target}
        activeIndex={active}
        onSelect={(i) => {
          const el = refs.current.get(`${keys[i]}:role`);
          el?.focus();
          el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }}
      />

      <datalist id={`${listId}-roles`}>
        {ROLE_SUGGESTIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      {rows.length > 0 ? (
        <ol className="space-y-2" aria-label="Plans du déroulé">
          {rows.map((r, i) => {
            const key = keys[i] ?? `tmp-${i}`;
            const p = `structure.${i}`;
            const roleErr = issuesAt(issues, `${p}.role`)[0]?.message;
            const showRoleErr = roleErr && (revealAll || !fresh.has(key));
            const durErr = issuesAt(issues, `${p}.durationS`)[0]?.message;
            const other = issues.filter((x) => x.path === p || x.path === `${p}.shot` || x.path === `${p}.text`);
            return (
              <li
                key={key}
                onFocus={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                    e.preventDefault();
                    const field = (e.target as HTMLElement).dataset.field ?? "role";
                    move(i, e.key === "ArrowUp" ? -1 : 1, field);
                  }
                }}
                className={cx("rounded-xl border bg-canvas/60 p-2.5 transition-colors", active === i ? "border-line-strong" : "border-line")}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <span className={cx("mt-1.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 text-2xs font-bold", segmentTone(i))} aria-hidden>
                    {i + 1}
                  </span>
                  <div className="min-w-[140px] flex-1">
                    <input
                      ref={reg(key, "role")}
                      data-field="role"
                      list={`${listId}-roles`}
                      value={r.role ?? ""}
                      onChange={(e) => setRow(i, { role: e.target.value })}
                      onBlur={() => setFresh((s) => (s.has(key) ? new Set([...s].filter((x) => x !== key)) : s))}
                      placeholder="Rôle : accroche, détails, fin…"
                      aria-label={`Rôle du plan ${i + 1}`}
                      aria-invalid={showRoleErr ? true : undefined}
                      maxLength={60}
                      className={cx(inputClass, "font-semibold")}
                    />
                  </div>
                  <NumberField
                    className="w-[104px] shrink-0"
                    value={r.durationS}
                    onChange={(v) => setRow(i, { durationS: v })}
                    unit="s"
                    placeholder="durée"
                    aria-label={`Durée du plan ${i + 1}, en secondes`}
                    min={LIMITS.duration.min}
                    max={LIMITS.duration.max}
                    step={0.5}
                    error={durErr}
                  />
                  <div className="ml-auto flex shrink-0 items-center">
                    <IconButton ref={reg(key, "up")} data-field="up" label={`Monter le plan ${i + 1}`} size="sm" disabled={i === 0} onClick={() => move(i, -1, "up")}>
                      <ArrowUp className="h-4 w-4" />
                    </IconButton>
                    <IconButton ref={reg(key, "down")} data-field="down" label={`Descendre le plan ${i + 1}`} size="sm" disabled={i === rows.length - 1} onClick={() => move(i, 1, "down")}>
                      <ArrowDown className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={`Retirer le plan ${i + 1}`} size="sm" className="hover:text-terracotta" onClick={() => remove(i)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 pl-0 sm:grid-cols-2 sm:pl-8">
                  <CodeTextarea
                    ref={reg(key, "shot")}
                    data-field="shot"
                    code={false}
                    minHeight={36}
                    value={r.shot ?? ""}
                    onChange={(v) => setRow(i, { shot: v })}
                    placeholder="Plan à chercher (ex. porte qui s'ouvre)"
                    aria-label={`Plan à chercher pour le plan ${i + 1}`}
                    maxLength={300}
                  />
                  <CodeTextarea
                    ref={reg(key, "text")}
                    data-field="text"
                    code={false}
                    minHeight={36}
                    value={r.text ?? ""}
                    onChange={(v) => setRow(i, { text: v })}
                    placeholder="Texte à l'écran (facultatif)"
                    aria-label={`Texte à l'écran pour le plan ${i + 1}`}
                    maxLength={300}
                  />
                </div>
                {showRoleErr ? <FieldError>{roleErr}</FieldError> : null}
                {other.map((x) => (
                  <FieldError key={x.path}>{x.message}</FieldError>
                ))}
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={add}>
          Ajouter un plan
        </Button>
        {rows.length > 1 ? <span className="hidden text-[11.5px] text-faint sm:inline">Alt + ↑ / ↓ pour déplacer le plan sélectionné</span> : null}
      </div>
    </div>
  );
}

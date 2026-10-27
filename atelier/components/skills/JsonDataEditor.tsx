"use client";

import { useEffect, useRef, useState } from "react";
import { CodeTextarea } from "@/components/skills/CodeTextarea";
import { FieldError } from "@/components/skills/controls";
import { prettyJson, sameJson } from "@/lib/client/skills/diff";
import { fieldLabel, type Issue } from "@/lib/client/skills/montage-style";

/** Traduit une erreur de JSON.parse en message français avec ligne et colonne. */
export function jsonErrorMessage(text: string, err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  let line: number | null = null;
  let col: number | null = null;
  const lc = /line (\d+) column (\d+)/i.exec(raw);
  const pos = /position (\d+)/i.exec(raw);
  if (lc) {
    line = Number(lc[1]);
    col = Number(lc[2]);
  } else if (pos) {
    const before = text.slice(0, Number(pos[1]));
    line = before.split("\n").length;
    col = before.length - before.lastIndexOf("\n");
  }
  const where = line ? `Ligne ${line}${col ? `, colonne ${col}` : ""} : ` : "";
  if (/end of (json|data) input|unexpected end/i.test(raw)) return `${where}le texte s'arrête trop tôt (accolade ou crochet fermant manquant ?).`;
  return `${where}syntaxe JSON invalide. Vérifiez les virgules, les guillemets droits "…" et les accolades.`;
}

/**
 * Édition brute des paramètres en JSON, avec erreurs en ligne. Ne transmet que du JSON valide ;
 * `onValidity(false)` tant que le texte ne se lit pas (l'enregistrement est alors bloqué).
 */
export function JsonDataEditor({
  value,
  onChange,
  validate,
  onValidity,
  allowEmpty,
  minHeight = 280,
  label,
}: {
  value: Record<string, unknown> | null;
  onChange: (v: Record<string, unknown> | null) => void;
  validate?: (v: Record<string, unknown> | null) => Issue[];
  onValidity: (ok: boolean) => void;
  /** Texte vide = pas de paramètres (null). */
  allowEmpty?: boolean;
  minHeight?: number;
  label: string;
}) {
  const [text, setText] = useState(() => prettyJson(value));
  const [parseError, setParseError] = useState<string | null>(null);
  const lastEmitted = useRef<unknown>(value);

  // Valeur modifiée ailleurs (formulaire, retour arrière) : on reformate.
  useEffect(() => {
    if (sameJson(value, lastEmitted.current)) return;
    lastEmitted.current = value;
    setText(prettyJson(value));
    setParseError(null);
    onValidity(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // En quittant l'éditeur (onglet Formulaire), le texte invalide est abandonné : plus de blocage.
  const validityRef = useRef(onValidity);
  validityRef.current = onValidity;
  useEffect(() => () => validityRef.current(true), []);

  function handle(t: string) {
    setText(t);
    if (!t.trim()) {
      if (allowEmpty) {
        setParseError(null);
        onValidity(true);
        lastEmitted.current = null;
        onChange(null);
      } else {
        setParseError("Écrivez au moins { } (un objet vide).");
        onValidity(false);
      }
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(t);
    } catch (e) {
      setParseError(jsonErrorMessage(t, e));
      onValidity(false);
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setParseError("Les paramètres doivent être un objet : ils commencent par { et finissent par }.");
      onValidity(false);
      return;
    }
    setParseError(null);
    onValidity(true);
    lastEmitted.current = parsed;
    onChange(parsed as Record<string, unknown>);
  }

  const issues = !parseError && validate ? validate(value) : [];

  return (
    <div className="space-y-2">
      <CodeTextarea value={text} onChange={handle} minHeight={minHeight} spellCheck={false} aria-label={label} invalid={Boolean(parseError)} aria-invalid={parseError ? true : undefined} placeholder={allowEmpty ? '{ "exemple": "valeur" }' : undefined} />
      {parseError ? <FieldError>{parseError}</FieldError> : null}
      {issues.length > 0 ? (
        <div role="status" className="rounded-lg border border-terracotta/30 bg-terracotta-soft/50 px-3 py-2">
          <p className="text-[12px] font-semibold text-terracotta">
            {issues.length === 1 ? "Une valeur est à corriger" : `${issues.length} valeurs sont à corriger`}
          </p>
          <ul className="mt-1 space-y-0.5 text-[12px] text-ink">
            {issues.slice(0, 12).map((i) => (
              <li key={`${i.path}-${i.message}`}>
                <span className="font-semibold">{i.path ? fieldLabel(i.path) : "Paramètres"}</span>
                {i.path ? <code className="mx-1 rounded bg-surface/70 px-1 font-mono text-[11px] text-muted">{i.path}</code> : null}: {i.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

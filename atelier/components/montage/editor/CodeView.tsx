"use client";

import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Code2, Info, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { cx } from "@/components/ui/cx";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/client/api";
import type { LintFinding, LintReport } from "@/lib/client/montage/types";

/**
 * Onglet « Code » : la composition HyperFrames générée (lecture seule), ou le code personnalisé.
 * « Éditer le code » passe le montage en mode code : les réglages ne modifient plus la vidéo,
 * jusqu'à « Revenir à la version générée ». Le code est vérifié par @hyperframes/lint.
 */
export function CodeView({
  montageId,
  html,
  customHtml,
  lint,
  onSave,
  onReset,
  onPreviewDraft,
}: {
  montageId: string;
  html: string | null;
  customHtml: boolean;
  lint: LintReport | null;
  onSave: (html: string) => Promise<void>;
  onReset: () => Promise<void>;
  onPreviewDraft?: (html: string | null) => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(html ?? "");
  const [draftLint, setDraftLint] = useState<LintReport | null>(null);
  const [busy, setBusy] = useState<"save" | "check" | "reset" | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(html ?? "");
  }, [html, editing]);

  const changed = editing && draft !== (html ?? "");
  const shown = editing ? draftLint ?? lint : lint;

  async function check() {
    setBusy("check");
    try {
      setDraftLint(await api.post<LintReport>(`/api/montages/${montageId}/lint`, { html: draft }));
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    try {
      const report = await api.post<LintReport>(`/api/montages/${montageId}/lint`, { html: draft });
      setDraftLint(report);
      await onSave(draft);
      setEditing(false);
      onPreviewDraft?.(null);
      toast(report.ok ? "Code enregistré" : `Code enregistré avec ${report.errorCount} erreur${report.errorCount > 1 ? "s" : ""} à corriger avant le rendu`, { tone: report.ok ? "success" : "info" });
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <Code2 className="h-4 w-4 text-chestnut" aria-hidden />
        <p className="min-w-0 flex-1 text-[12.5px] text-muted">
          {customHtml
            ? "Code personnalisé : les réglages (plans, textes, style) ne modifient plus la vidéo."
            : "Composition HyperFrames générée depuis les réglages et le style. Les médias s'écrivent atelier-media://<id>/original."}
        </p>
        {customHtml && !editing ? (
          <Button size="sm" variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirmReset(true)}>
            Revenir à la version générée
          </Button>
        ) : null}
        {editing ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(html ?? ""); setDraftLint(null); onPreviewDraft?.(null); }}>
              Annuler
            </Button>
            <Button size="sm" variant="ghost" loading={busy === "check"} icon={<ShieldCheck className="h-4 w-4" />} onClick={check}>
              Vérifier
            </Button>
            {onPreviewDraft ? (
              <Button size="sm" variant="ghost" disabled={!changed} onClick={() => onPreviewDraft(draft)}>
                Prévisualiser
              </Button>
            ) : null}
            <Button size="sm" variant="accent" loading={busy === "save"} disabled={!changed} onClick={save}>
              Enregistrer le code
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => setEditing(true)}>
            Éditer le code
          </Button>
        )}
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] lg:grid-cols-[1fr_300px] lg:grid-rows-1">
        <textarea
          aria-label="Code de la composition HyperFrames"
          value={editing ? draft : html ?? ""}
          readOnly={!editing}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          className={cx(
            "h-full min-h-[260px] w-full resize-none border-0 p-4 font-mono text-[12px] leading-[1.55] text-[#f4ead9] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-honey",
            editing ? "bg-[#1d1712]" : "bg-night",
          )}
        />
        <aside className="max-h-[40vh] overflow-y-auto border-t border-line bg-surface lg:max-h-none lg:border-l lg:border-t-0" aria-label="Vérification HyperFrames">
          <div className="sticky top-0 border-b border-line bg-surface px-4 py-2.5">
            <h3 className="label-eyebrow">Vérification</h3>
            {shown ? (
              <p className={cx("mt-1 text-[12.5px] font-semibold", shown.ok ? "text-olive" : "text-terracotta")}>
                {shown.ok ? (shown.warningCount ? `Prêt au rendu · ${shown.warningCount} remarque${shown.warningCount > 1 ? "s" : ""}` : "Prêt au rendu, aucune remarque") : `${shown.errorCount} erreur${shown.errorCount > 1 ? "s" : ""} bloquante${shown.errorCount > 1 ? "s" : ""}`}
              </p>
            ) : (
              <p className="mt-1 text-[12.5px] text-muted">Vérification en cours…</p>
            )}
          </div>
          <ul className="divide-y divide-line">
            {(shown?.findings ?? []).map((f, i) => (
              <FindingRow key={`${f.code}-${i}`} f={f} />
            ))}
          </ul>
        </aside>
      </div>
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Revenir à la version générée ?"
        confirmLabel="Revenir à la version générée"
        danger
        loading={busy === "reset"}
        onConfirm={async () => {
          setBusy("reset");
          try {
            await onReset();
            toast("Composition générée rétablie");
          } catch (err) {
            toast(errorMessage(err), { tone: "error" });
          } finally {
            setBusy(null);
            setConfirmReset(false);
          }
        }}
      >
        Le code personnalisé sera remplacé par la composition générée depuis les réglages et le style.
      </ConfirmDialog>
    </div>
  );
}

function FindingRow({ f }: { f: LintFinding }) {
  const Icon = f.severity === "error" ? AlertCircle : f.severity === "warning" ? AlertTriangle : Info;
  return (
    <li className="px-4 py-2.5">
      <p className="flex items-start gap-2 text-[12.5px]">
        <Icon className={cx("mt-0.5 h-4 w-4 shrink-0", f.severity === "error" ? "text-terracotta" : f.severity === "warning" ? "text-honey" : "text-muted")} aria-hidden />
        <span>
          <span className="sr-only">{f.severity === "error" ? "Erreur" : f.severity === "warning" ? "Avertissement" : "Information"} : </span>
          {f.message}
          {f.elementId ? <span className="text-muted"> (#{f.elementId})</span> : null}
        </span>
      </p>
      {f.fixHint ? <p className="ml-6 mt-1 text-[12px] text-muted">{f.fixHint}</p> : null}
      <p className="ml-6 mt-0.5 font-mono text-[10.5px] text-faint">
        {f.source === "hyperframes" ? "HyperFrames" : "Atelier"} · {f.code}
        {f.line ? ` · ligne ${f.line}` : ""}
      </p>
    </li>
  );
}

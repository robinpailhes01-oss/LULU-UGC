"use client";

import { useId, useState } from "react";
import { FileCode2, FilePlus2, FileText, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { CodeTextarea } from "@/components/skills/CodeTextarea";
import { FieldError, Panel, Segmented } from "@/components/skills/controls";
import { annexNameError, ANNEX_EXTENSIONS, fileKind } from "@/lib/client/skills/draft";
import { Markdown } from "@/lib/client/skills/markdown";

/** Fichiers texte annexes d'un skill (références détaillées, gabarit HyperFrames…). */
export function AnnexFiles({ files, onChange }: { files: Record<string, string>; onChange: (files: Record<string, string>) => void }) {
  const toast = useToast();
  const ids = useId();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const names = Object.keys(files).sort((a, b) => a.localeCompare(b, "fr"));
  const error = annexNameError(name, names);

  function create(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (error) return;
    const n = name.trim();
    const starter = n.endsWith(".md") ? `# ${n.replace(/\.md$/i, "")}\n\n` : n.endsWith(".json") ? "{\n  \n}\n" : "";
    onChange({ ...files, [n]: starter });
    setAdding(false);
    setName("");
    setTried(false);
    setMode("write");
    setOpen(n);
  }

  function remove(n: string) {
    const before = files;
    const next = { ...files };
    delete next[n];
    onChange(next);
    toast(`« ${n} » retiré`, { action: { label: "Annuler", onClick: () => onChange(before) } });
  }

  const content = open ? files[open] ?? "" : "";
  const isMd = Boolean(open?.toLowerCase().endsWith(".md"));

  return (
    <Panel
      title="Fichiers annexes"
      description="Des textes à part : références détaillées, gabarit de montage, listes…"
      icon={<FileText />}
      actions={
        adding ? null : (
          <Button size="sm" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => setAdding(true)}>
            Nouveau fichier
          </Button>
        )
      }
    >
      {names.length === 0 && !adding ? <p className="text-[13px] text-muted">Aucun fichier annexe. Les consignes suffisent souvent ; ajoutez-en un pour une longue liste de références ou un gabarit.</p> : null}

      {names.length > 0 ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {names.map((n) => {
            const text = files[n] ?? "";
            const lines = text ? text.split("\n").length : 0;
            return (
              <li key={n} className="flex items-center gap-2.5 bg-surface px-3 py-2 hover:bg-hover">
                {n.endsWith(".md") || n.endsWith(".txt") ? <FileText className="h-4 w-4 shrink-0 text-chestnut" aria-hidden /> : <FileCode2 className="h-4 w-4 shrink-0 text-chestnut" aria-hidden />}
                <button
                  type="button"
                  onClick={() => {
                    setMode(n.endsWith(".md") ? "preview" : "write");
                    setOpen(n);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate font-mono text-[12.5px] font-semibold text-ink">{n}</span>
                  <span className="block text-[11px] text-faint">
                    {fileKind(n)} · {lines} ligne{lines > 1 ? "s" : ""}
                  </span>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMode("write");
                    setOpen(n);
                  }}
                >
                  Modifier
                </Button>
                <IconButton label={`Retirer le fichier ${n}`} size="sm" className="hover:text-terracotta" onClick={() => remove(n)}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      ) : null}

      {adding ? (
        <form onSubmit={create} className="mt-3 rounded-xl border border-line bg-canvas/60 p-3" noValidate>
          <label htmlFor={`${ids}-n`} className="mb-1 block text-[12px] font-semibold text-ink">
            Nom du fichier
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`${ids}-n`}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setAdding(false);
                }
              }}
              placeholder="ex. references.md"
              spellCheck={false}
              aria-invalid={tried && error ? true : undefined}
              aria-describedby={`${ids}-h`}
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 font-mono text-[13px] text-ink placeholder:text-faint focus:border-chestnut focus:outline-none focus:ring-2 focus:ring-chestnut/20 focus-visible:outline-none aria-[invalid=true]:border-terracotta"
            />
            <Button type="submit" size="md">
              Créer
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setName("");
                setTried(false);
              }}
            >
              Annuler
            </Button>
          </div>
          {tried && error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <p id={`${ids}-h`} className="mt-1 text-[11.5px] text-muted">
              Lettres, chiffres, tirets et points ; extension {ANNEX_EXTENSIONS.join(", ")}.
            </p>
          )}
        </form>
      ) : null}

      <Dialog
        open={open !== null}
        onClose={() => setOpen(null)}
        title={<span className="font-mono">{open}</span>}
        description="Les changements sont enregistrés avec le skill (bouton « Enregistrer »)."
        size="xl"
        footer={
          <>
            <span className="mr-auto text-[12px] text-faint">Tab : indenter</span>
            <Button variant="secondary" onClick={() => setOpen(null)}>
              Terminé
            </Button>
          </>
        }
      >
        {open ? (
          <div className="space-y-3 p-4">
            {isMd ? (
              <Segmented
                label="Mode d'affichage"
                size="sm"
                options={[
                  { id: "write", label: "Écrire" },
                  { id: "preview", label: "Aperçu" },
                ]}
                value={mode}
                onChange={setMode}
              />
            ) : null}
            {isMd && mode === "preview" ? (
              <div className="min-h-[50vh] rounded-lg border border-line bg-surface px-5 py-4">
                {content.trim() ? <Markdown source={content} /> : <p className="text-[13px] italic text-faint">Fichier vide.</p>}
              </div>
            ) : (
              <CodeTextarea value={content} onChange={(v) => onChange({ ...files, [open]: v })} minHeight={420} spellCheck={open.endsWith(".md") || open.endsWith(".txt")} aria-label={`Contenu de ${open}`} />
            )}
          </div>
        ) : null}
      </Dialog>
    </Panel>
  );
}

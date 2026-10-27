"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Folder as FolderIcon, Images, Search } from "lucide-react";
import { TagInput } from "@/components/library/TagInput";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { plural } from "@/lib/shared/format";
import type { Asset, Folder } from "@/lib/shared/types";

// ---------------------------------------------------------------------------------------------
// Déplacer

/** Choix d'un dossier de destination (arborescence complète + racine). */
export function MoveDialog({
  open,
  onClose,
  folders,
  count,
  currentFolderIds,
  onMove,
}: {
  open: boolean;
  onClose: () => void;
  folders: Folder[];
  count: number;
  /** Dossiers actuels des médias sélectionnés (pour signaler « dossier actuel »). */
  currentFolderIds: (string | null)[];
  onMove: (folderId: string | null) => void;
}) {
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const byParent = useMemo(() => {
    const m = new Map<string | null, Folder[]>();
    for (const f of folders) m.set(f.parentId, [...(m.get(f.parentId) ?? []), f]);
    for (const list of m.values()) list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return m;
  }, [folders]);
  const only = currentFolderIds.length > 0 && currentFolderIds.every((id) => id === currentFolderIds[0]) ? currentFolderIds[0] : undefined;

  useEffect(() => {
    if (!open) return;
    setTarget(undefined);
    setFilter("");
    // Déplie les ancêtres du dossier actuel.
    const byId = new Map(folders.map((f) => [f.id, f]));
    const set = new Set<string>();
    let cur = only ? byId.get(only) : undefined;
    while (cur?.parentId) {
      set.add(cur.parentId);
      cur = byId.get(cur.parentId);
    }
    setExpanded(set);
  }, [open, folders, only]);

  const q = filter.trim().toLowerCase();
  const matches = q ? folders.filter((f) => f.name.toLowerCase().includes(q)) : null;
  const pathOf = (f: Folder) => {
    const byId = new Map(folders.map((x) => [x.id, x]));
    const names: string[] = [];
    let cur = f.parentId ? byId.get(f.parentId) : undefined;
    while (cur) {
      names.unshift(cur.name);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return names.join(" › ");
  };

  const renderRow = (folder: Folder, depth: number): React.ReactNode => {
    const kids = byParent.get(folder.id) ?? [];
    const isOpen = expanded.has(folder.id);
    const isCurrent = only === folder.id;
    return (
      <li key={folder.id}>
        <div className={cx("flex h-9 items-center rounded-lg pr-2", target === folder.id ? "bg-select text-chestnut" : "hover:bg-hover")} style={{ paddingLeft: 6 + depth * 18 }}>
          <button
            type="button"
            aria-label={isOpen ? `Replier ${folder.name}` : `Déplier ${folder.name}`}
            onClick={() =>
              setExpanded((s) => {
                const n = new Set(s);
                if (n.has(folder.id)) n.delete(folder.id);
                else n.add(folder.id);
                return n;
              })
            }
            className={cx("flex h-6 w-6 items-center justify-center rounded text-faint hover:text-ink", kids.length === 0 && "invisible")}
          >
            <ChevronRight className={cx("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")} />
          </button>
          <button type="button" onClick={() => setTarget(folder.id)} onDoubleClick={() => onMove(folder.id)} className="flex h-full min-w-0 flex-1 items-center gap-2 text-left text-[13.5px]" aria-pressed={target === folder.id}>
            <FolderIcon className="h-4 w-4 shrink-0" style={{ color: folder.color ?? undefined }} aria-hidden />
            <span className="truncate">{folder.name}</span>
            {isCurrent ? <span className="shrink-0 text-2xs text-faint">Dossier actuel</span> : null}
            {target === folder.id ? <Check className="ml-auto h-4 w-4 shrink-0" aria-hidden /> : null}
          </button>
        </div>
        {isOpen && kids.length > 0 ? (
          <ul>
            {kids.map((k) => renderRow(k, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Déplacer ${plural(count, "média")}`}
      description="Choisissez le dossier de destination."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={target === undefined || target === only} onClick={() => target !== undefined && onMove(target)}>
            Déplacer ici
          </Button>
        </>
      }
    >
      <div className="px-5 pb-2 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Chercher un dossier" aria-label="Chercher un dossier" className="pl-9" />
        </div>
      </div>
      <div className="max-h-[50vh] overflow-y-auto px-3 pb-3">
        <ul>
          {!matches ? (
            <li>
              <button
                type="button"
                onClick={() => setTarget(null)}
                onDoubleClick={() => onMove(null)}
                aria-pressed={target === null}
                className={cx("flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13.5px] font-semibold", target === null ? "bg-select text-chestnut" : "hover:bg-hover")}
              >
                <Images className="h-4 w-4" aria-hidden /> Médiathèque <span className="font-normal text-faint">(racine)</span>
                {only === null ? <span className="text-2xs font-normal text-faint">Dossier actuel</span> : null}
                {target === null ? <Check className="ml-auto h-4 w-4" aria-hidden /> : null}
              </button>
            </li>
          ) : null}
          {matches
            ? matches.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setTarget(f.id)}
                    onDoubleClick={() => onMove(f.id)}
                    aria-pressed={target === f.id}
                    className={cx("flex h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13.5px]", target === f.id ? "bg-select text-chestnut" : "hover:bg-hover")}
                  >
                    <FolderIcon className="h-4 w-4 shrink-0" style={{ color: f.color ?? undefined }} aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate">{f.name}</span>
                      {f.parentId ? <span className="block truncate text-2xs text-faint">{pathOf(f)}</span> : null}
                    </span>
                  </button>
                </li>
              ))
            : (byParent.get(null) ?? []).map((f) => renderRow(f, 0))}
          {matches && matches.length === 0 ? <li className="px-3 py-6 text-center text-[13px] text-muted">Aucun dossier ne correspond.</li> : null}
        </ul>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------
// Mots-clés (sélection multiple)

export function TagsDialog({
  open,
  onClose,
  assets,
  suggestions,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  assets: Asset[];
  suggestions: { tag: string; count: number }[];
  onApply: (add: string[], remove: string[]) => Promise<void>;
}) {
  const [add, setAdd] = useState<string[]>([]);
  const [remove, setRemove] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setAdd([]);
      setRemove([]);
    }
  }, [open]);

  const present = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assets) for (const t of a.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  }, [assets]);

  const shown = [...present.map(([t]) => t), ...add.filter((t) => !present.some(([p]) => p === t))];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Mots-clés"
      description={`${plural(assets.length, "média sélectionné", "médias sélectionnés")}. Les changements s'appliquent à toute la sélection.`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={add.length === 0 && remove.length === 0}
            onClick={async () => {
              setBusy(true);
              await onApply(add, remove);
              setBusy(false);
              onClose();
            }}
          >
            Appliquer
          </Button>
        </>
      }
    >
      <div className="space-y-4 px-5 py-4">
        {shown.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Mots-clés de la sélection">
            {shown.map((t) => {
              const count = present.find(([p]) => p === t)?.[1] ?? 0;
              const removed = remove.includes(t);
              const added = add.includes(t);
              return (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => {
                      if (added) setAdd((xs) => xs.filter((x) => x !== t));
                      else setRemove((xs) => (removed ? xs.filter((x) => x !== t) : [...xs, t]));
                    }}
                    aria-pressed={!removed}
                    title={removed ? "Garder ce mot-clé" : "Retirer ce mot-clé de la sélection"}
                    className={cx(
                      "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] transition-colors",
                      removed ? "bg-terracotta-soft text-terracotta line-through" : added ? "bg-olive-soft text-olive" : "bg-sunken text-ink hover:bg-hover",
                    )}
                  >
                    {t}
                    {!added ? <span className="text-2xs tabular-nums opacity-70">{count === assets.length ? "tous" : `${count}/${assets.length}`}</span> : <span className="text-2xs">nouveau</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-muted">Aucun mot-clé pour l'instant.</p>
        )}
        <TagInput
          value={shown}
          showChips={false}
          suggestions={suggestions}
          autoFocus
          onAdd={(t) => {
            setRemove((xs) => xs.filter((x) => x !== t));
            if (!present.some(([p, c]) => p === t && c === assets.length)) setAdd((xs) => (xs.includes(t) ? xs : [...xs, t]));
          }}
          onRemove={(t) => setRemove((xs) => (xs.includes(t) ? xs : [...xs, t]))}
          placeholder="Ajouter un mot-clé (Entrée pour valider)"
        />
        <p className="text-2xs text-faint">Cliquez sur un mot-clé pour le retirer de toute la sélection.</p>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------
// Renommer (média ou dossier)

export function TextDialog({
  open,
  onClose,
  title,
  label,
  initial,
  confirmLabel = "Enregistrer",
  selectBaseName,
  maxLength = 255,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  initial: string;
  confirmLabel?: string;
  /** Sélectionne le nom sans l'extension à l'ouverture. */
  selectBaseName?: boolean;
  maxLength?: number;
  onSubmit: (value: string) => Promise<boolean | void>;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      <form
        className="space-y-4 px-5 py-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!value.trim()) return;
          setBusy(true);
          const ok = await onSubmit(value.trim());
          setBusy(false);
          if (ok !== false) onClose();
        }}
      >
        <Input
          autoFocus
          aria-label={label}
          value={value}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => {
            const el = e.currentTarget;
            const dot = selectBaseName ? el.value.lastIndexOf(".") : -1;
            window.requestAnimationFrame(() => el.setSelectionRange(0, dot > 0 ? dot : el.value.length));
          }}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" loading={busy} disabled={!value.trim() || value.trim() === initial}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------
// Couleur de dossier

export const FOLDER_COLORS: { value: string | null; label: string }[] = [
  { value: null, label: "Par défaut" },
  { value: "#8B5E34", label: "Châtaigne" },
  { value: "#C98A3C", label: "Miel" },
  { value: "#5F6F45", label: "Olive" },
  { value: "#A8482A", label: "Terracotta" },
  { value: "#6E4B5E", label: "Prune" },
  { value: "#6B5E50", label: "Taupe" },
  { value: "#B07A5B", label: "Argile" },
];

export function FolderColorDialog({ open, onClose, folder, onPick }: { open: boolean; onClose: () => void; folder: Folder | null; onPick: (color: string | null) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Couleur du dossier" description={folder ? `« ${folder.name} »` : undefined} size="sm">
      <ul className="grid grid-cols-4 gap-3 px-5 py-5">
        {FOLDER_COLORS.map((c) => {
          const current = (folder?.color ?? null) === c.value;
          return (
            <li key={c.label}>
              <button
                type="button"
                onClick={() => onPick(c.value)}
                aria-pressed={current}
                className={cx("flex w-full flex-col items-center gap-1.5 rounded-xl p-2 text-2xs text-muted hover:bg-hover", current && "bg-select text-chestnut")}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line" style={{ background: c.value ?? "#FBF7F0" }}>
                  {current ? <Check className={cx("h-4 w-4", c.value ? "text-surface" : "text-chestnut")} aria-hidden /> : c.value ? null : <FolderIcon className="h-4 w-4 text-chestnut" aria-hidden />}
                </span>
                {c.label}
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

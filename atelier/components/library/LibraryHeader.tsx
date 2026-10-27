"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Folder as FolderIcon, FolderPlus, Trash2, Upload } from "lucide-react";
import type { LibraryMode } from "@/components/library/LibraryView";
import { useFolderDropTarget } from "@/components/library/use-drop-target";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { plural } from "@/lib/shared/format";
import type { Folder } from "@/lib/shared/types";

interface Props {
  mode: LibraryMode;
  query?: string;
  folder: Folder | null;
  path: Folder[];
  total: number | null;
  /** Le gros bouton « Importer » de l'état vide remplace celui de l'en-tête. */
  hideImport: boolean;
  onImport: () => void;
  onNewFolder: () => void;
  onFolderMenu: (el: HTMLElement) => void;
  onEmptyTrash: () => void;
  onMoveIds: (ids: string[], folderId: string | null) => void;
}

const TITLES: Partial<Record<LibraryMode, string>> = {
  root: "Médiathèque",
  recent: "Récents",
  starred: "Favoris",
  trash: "Corbeille",
};

const SUBTITLES: Partial<Record<LibraryMode, string>> = {
  recent: "Les 100 derniers médias importés, tous dossiers confondus.",
  starred: "Les médias marqués d'une étoile, pour les retrouver vite.",
  trash: "Les médias supprimés restent ici jusqu'à ce que vous vidiez la corbeille.",
};

/** En-tête : fil d'Ariane et actions du dossier, ou titre de la vue (Récents, Favoris…). */
export function LibraryHeader({ mode, query, folder, path, total, hideImport, onImport, onNewFolder, onFolderMenu, onEmptyTrash, onMoveIds }: Props) {
  const count = total === null ? null : total > 0 ? plural(total, "média") : "";
  const canImport = mode === "root" || mode === "folder";

  return (
    <header className="mb-4">
      {mode === "folder" ? <Breadcrumb path={path} onMoveIds={onMoveIds} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          {mode === "folder" ? (
            <div className="flex min-w-0 items-center gap-2">
              <FolderIcon className="h-6 w-6 shrink-0" style={{ color: folder?.color ?? "#8B5E34" }} fill={folder?.color ?? "#8B5E34"} fillOpacity={0.18} aria-hidden />
              {folder ? (
                <button
                  type="button"
                  onClick={(e) => onFolderMenu(e.currentTarget)}
                  className="group flex min-w-0 items-center gap-1 rounded-lg px-1 -mx-1 text-left hover:bg-hover"
                  aria-label={`Actions du dossier ${folder.name}`}
                  aria-haspopup="menu"
                >
                  <h1 className="page-title truncate">{folder.name}</h1>
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted group-hover:text-ink" aria-hidden />
                </button>
              ) : (
                <div className="skeleton h-8 w-56" />
              )}
            </div>
          ) : (
            <h1 className="page-title">{mode === "search" ? `Résultats pour « ${query ?? ""} »` : TITLES[mode]}</h1>
          )}
          <p className="mt-1 text-[13px] text-muted">
            {SUBTITLES[mode] ?? null}
            {mode !== "recent" ? (
              count === null ? (
                <span className="ml-1 inline-block h-3 w-16 animate-pulse rounded bg-sunken align-middle" aria-hidden />
              ) : (
                count ? <span className="tabular-nums">{SUBTITLES[mode] ? ` · ${count}` : count}</span> : null
              )
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canImport ? (
            <>
              <Button variant="secondary" icon={<FolderPlus className="h-4 w-4" />} onClick={onNewFolder} className="hidden sm:inline-flex">
                {mode === "folder" ? "Sous-dossier" : "Nouveau dossier"}
              </Button>
              {!hideImport ? (
                <Button variant="primary" icon={<Upload className="h-4 w-4" />} onClick={onImport} title="Importer (U)">
                  Importer
                </Button>
              ) : null}
            </>
          ) : null}
          {mode === "trash" ? (
            <Button variant="secondary" icon={<Trash2 className="h-4 w-4" />} onClick={onEmptyTrash} disabled={!total} className="text-terracotta hover:bg-terracotta-soft">
              Vider la corbeille
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function Breadcrumb({ path, onMoveIds }: { path: Folder[]; onMoveIds: Props["onMoveIds"] }) {
  const ancestors = path.slice(0, -1);
  return (
    <nav aria-label="Fil d'Ariane" className="mb-1.5">
      <ol className="flex min-w-0 flex-wrap items-center gap-0.5 text-[13px] text-muted">
        <Crumb folderId={null} name="Médiathèque" href="/mediatheque" onMoveIds={onMoveIds} />
        {ancestors.map((f) => (
          <Crumb key={f.id} folderId={f.id} name={f.name} href={`/mediatheque/dossier/${f.id}`} onMoveIds={onMoveIds} />
        ))}
        {path.length > 0 ? (
          <li className="flex min-w-0 items-center gap-0.5">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
            <span aria-current="page" className="truncate px-1 font-semibold text-ink">
              {path[path.length - 1].name}
            </span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}

function Crumb({ folderId, name, href, onMoveIds }: { folderId: string | null; name: string; href: string; onMoveIds: Props["onMoveIds"] }) {
  const drop = useFolderDropTarget(folderId, name, onMoveIds);
  return (
    <li className="flex min-w-0 items-center gap-0.5" {...drop.props}>
      {folderId ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden /> : null}
      <Link href={href} className={cx("truncate rounded-md px-1 py-0.5 hover:bg-hover hover:text-ink", drop.over && "bg-honey-soft text-ink ring-2 ring-honey")}>
        {name}
      </Link>
    </li>
  );
}

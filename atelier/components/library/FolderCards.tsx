"use client";

import Link from "next/link";
import { memo } from "react";
import { Folder as FolderIcon, MoreVertical } from "lucide-react";
import { useFolderDropTarget } from "@/components/library/use-drop-target";
import { cx } from "@/components/ui/cx";
import { plural } from "@/lib/shared/format";
import type { Folder } from "@/lib/shared/types";

interface Props {
  folders: Folder[];
  onMenu: (folder: Folder, at: { clientX: number; clientY: number } | HTMLElement) => void;
  onMoveIds: (ids: string[], folderId: string | null) => void;
}

/** Sous-dossiers, avant les médias. Un clic ouvre ; on peut y déposer des médias ou des fichiers. */
export function FolderCards({ folders, onMenu, onMoveIds }: Props) {
  if (folders.length === 0) return null;
  return (
    <section aria-label="Dossiers" className="mb-6">
      <h2 className="label-eyebrow mb-2.5">Dossiers</h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
        {folders.map((f) => (
          <FolderCard key={f.id} folder={f} onMenu={onMenu} onMoveIds={onMoveIds} />
        ))}
      </ul>
    </section>
  );
}

const FolderCard = memo(function FolderCard({ folder, onMenu, onMoveIds }: { folder: Folder; onMenu: Props["onMenu"]; onMoveIds: Props["onMoveIds"] }) {
  const drop = useFolderDropTarget(folder.id, folder.name, onMoveIds);
  return (
    <li
      {...drop.props}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(folder, e);
      }}
      className={cx(
        "group relative flex h-[52px] items-center rounded-[12px] border bg-surface transition-colors duration-fast",
        drop.over ? "border-honey bg-honey-soft ring-2 ring-honey" : "border-line hover:bg-[#F6F1E8]",
      )}
    >
      <Link
        href={`/mediatheque/dossier/${folder.id}`}
        className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-[12px] pl-3.5 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-chestnut"
        draggable={false}
      >
        <FolderIcon className="h-5 w-5 shrink-0" style={{ color: folder.color ?? "#8B5E34" }} fill={folder.color ?? "#8B5E34"} fillOpacity={0.18} aria-hidden />
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold text-ink">{folder.name}</span>
          <span className="block text-2xs text-muted">{folder.assetCount > 0 ? plural(folder.assetCount, "média") : "Vide"}</span>
        </span>
      </Link>
      <button
        type="button"
        aria-label={`Actions du dossier ${folder.name}`}
        onClick={(e) => onMenu(folder, e.currentTarget)}
        className="mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-faint opacity-60 hover:bg-hover hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </li>
  );
});

"use client";

import { CalendarPlus, Clapperboard, Download, FolderInput, MessageSquareText, MoreHorizontal, Palette, RotateCcw, ScanSearch, Star, Tags, Trash2, WandSparkles, X } from "lucide-react";
import { useMediaQuery } from "@/components/library/prefs";
import { IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { useMenu, type MenuEntry } from "@/components/ui/Menu";
import { plural } from "@/lib/shared/format";
import type { Asset } from "@/lib/shared/types";

export interface SelectionCommands {
  clear: () => void;
  download: () => void;
  move: () => void;
  tags: () => void;
  star: (starred: boolean) => void;
  retouch: () => void;
  applyLook: () => void;
  montage: () => void;
  schedule: () => void;
  askAgent: () => void;
  analyze: () => void;
  trash: () => void;
  restore: () => void;
  deleteForever: () => void;
}

interface Action {
  key: string;
  label: string;
  icon: React.ReactNode;
  run: () => void;
  /** 1 : toujours visible ; 2 : dès 520 px ; 3 : sur grand écran. Sinon dans « Plus ». */
  priority: 1 | 2 | 3;
  danger?: boolean;
  disabled?: boolean;
}

/** Barre affichée à la place de la barre d'outils dès qu'une sélection existe. */
export function SelectionBar({ assets, trash, cmd }: { assets: Asset[]; trash: boolean; cmd: SelectionCommands }) {
  const menu = useMenu();
  const wide = useMediaQuery("(min-width: 1280px)");
  const roomy = useMediaQuery("(min-width: 520px)", true);
  const n = assets.length;
  const photos = assets.filter((a) => a.kind === "photo");
  const allStarred = n > 0 && assets.every((a) => a.starred);
  const visual = assets.filter((a) => a.kind !== "audio").length;

  const actions: Action[] = trash
    ? [
        { key: "restore", label: "Restaurer", icon: <RotateCcw />, run: cmd.restore, priority: 1 },
        { key: "delete", label: "Supprimer définitivement", icon: <Trash2 />, run: cmd.deleteForever, priority: 1, danger: true },
      ]
    : [
        { key: "download", label: "Télécharger", icon: <Download />, run: cmd.download, priority: 1 },
        { key: "move", label: "Déplacer…", icon: <FolderInput />, run: cmd.move, priority: 1 },
        { key: "tags", label: "Mots-clés…", icon: <Tags />, run: cmd.tags, priority: 2 },
        { key: "star", label: allStarred ? "Retirer des favoris" : "Ajouter aux favoris", icon: <Star className={allStarred ? "fill-current text-honey" : undefined} />, run: () => cmd.star(!allStarred), priority: 2 },
        ...(n === 1 && photos.length === 1 ? [{ key: "retouch", label: "Retoucher", icon: <WandSparkles />, run: cmd.retouch, priority: 1 as const }] : []),
        ...(photos.length > 0 ? [{ key: "look", label: `Appliquer un look…${photos.length < n ? ` (${plural(photos.length, "photo")})` : ""}`, icon: <Palette />, run: cmd.applyLook, priority: 3 as const }] : []),
        ...(visual > 0 ? [{ key: "montage", label: "Monter", icon: <Clapperboard />, run: cmd.montage, priority: 3 as const }] : []),
        ...(visual > 0 ? [{ key: "schedule", label: "Programmer", icon: <CalendarPlus />, run: cmd.schedule, priority: 3 as const }] : []),
        { key: "agent", label: "Demander à l'agent", icon: <MessageSquareText />, run: cmd.askAgent, priority: 3 },
        ...(visual > 0 ? [{ key: "analyze", label: "Analyser avec l'IA", icon: <ScanSearch />, run: cmd.analyze, priority: 3 as const }] : []),
        { key: "trash", label: "Mettre à la corbeille", icon: <Trash2 />, run: cmd.trash, priority: 1, danger: true },
      ];

  const visible = (a: Action) => a.priority === 1 || (a.priority === 2 && (roomy || trash)) || (a.priority === 3 && wide);
  const shown = actions.filter(visible);
  const overflow = actions.filter((a) => !visible(a));

  return (
    <div className="flex h-11 items-center gap-1 rounded-full bg-surface pl-1.5 pr-2 border border-line shadow-card" role="toolbar" aria-label="Actions sur la sélection">
      <IconButton label="Désélectionner (Échap)" onClick={cmd.clear} size="sm" className="h-8 w-8">
        <X className="h-4 w-4" />
      </IconButton>
      <span className="mr-2 whitespace-nowrap text-[13.5px] font-semibold text-ink" aria-live="polite">
        {plural(n, "sélectionné", "sélectionnés")}
      </span>
      <span className="mr-1 hidden h-5 w-px bg-ink/10 sm:block" aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-0.5">
        {shown.map((a) =>
          trash ? (
            <button
              key={a.key}
              type="button"
              onClick={a.run}
              aria-label={a.label}
              title={a.label}
              className={cx("inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold sm:px-3 [&>svg]:h-4 [&>svg]:w-4", a.danger ? "text-terracotta hover:bg-terracotta-soft" : "text-ink hover:bg-hover")}
            >
              {a.icon}
              <span className="hidden sm:inline">{a.label}</span>
            </button>
          ) : (
            <IconButton key={a.key} label={a.label} onClick={a.run} size="sm" className={cx("h-8 w-8 [&>svg]:h-[17px] [&>svg]:w-[17px]", a.danger && "hover:bg-terracotta-soft hover:text-terracotta")}>
              {a.icon}
            </IconButton>
          ),
        )}
        {overflow.length > 0 ? (
          <IconButton
            label="Plus d'actions"
            size="sm"
            className="h-8 w-8"
            onClick={(e) => menu.openBelow(e.currentTarget, overflow.map<MenuEntry>((a) => ({ label: a.label, icon: a.icon, onSelect: a.run, danger: a.danger, disabled: a.disabled })), "left")}
          >
            <MoreHorizontal className="h-[17px] w-[17px]" />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}

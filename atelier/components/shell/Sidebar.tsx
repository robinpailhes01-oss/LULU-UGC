"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Clock,
  Folder as FolderIcon,
  FolderPlus,
  Images,
  LayoutDashboard,
  MessageSquareText,
  Plus,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { cx } from "@/components/ui/cx";
import { useMenu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { useShell } from "@/components/shell/ShellContext";
import { useUploads } from "@/components/library/UploadProvider";
import { NewFolderDialog } from "@/components/shell/NewFolderDialog";
import { api, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { useResource } from "@/lib/client/use-resource";
import { formatBytes } from "@/lib/shared/format";
import type { Folder } from "@/lib/shared/types";

/** Type MIME utilisé pour glisser des médias vers un dossier. */
export const DRAG_ASSETS_MIME = "application/x-atelier-assets";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/mediatheque", label: "Médiathèque", icon: Images, exact: true },
  { href: "/mediatheque/recents", label: "Récents", icon: Clock },
  { href: "/mediatheque/favoris", label: "Favoris", icon: Star },
  { href: "/menage", label: "Ménage", icon: Sparkles },
  { href: "/montage", label: "Montage", icon: Clapperboard },
  { href: "/programmation", label: "Programmation", icon: CalendarDays },
  { href: "/agent", label: "Agent", icon: MessageSquareText },
  { href: "/corbeille", label: "Corbeille", icon: Trash2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { folders, sidebarOpen, setSidebarOpen } = useShell();
  const { pickFiles } = useUploads();
  const menu = useMenu();
  const [newFolder, setNewFolder] = useState<{ parentId: string | null } | null>(null);
  const currentFolderId = /^\/mediatheque\/dossier\/([^/]+)/.exec(pathname)?.[1] ?? null;

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <>
      {sidebarOpen ? <div className="fixed inset-0 z-sidebar bg-night/30 lg:hidden" onClick={() => setSidebarOpen(false)} /> : null}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-sidebar flex w-[248px] flex-col border-r border-line bg-sidebar transition-transform duration-base lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Navigation"
      >
        <div className="flex h-14 items-center gap-2 px-5">
          <Link href="/" className="font-display text-[1.35rem] font-[400] tracking-[-0.02em] text-ink" style={{ fontVariationSettings: "'opsz' 96, 'SOFT' 30" }}>
            June <span className="italic text-chestnut">atelier</span>
          </Link>
        </div>

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={(e) =>
              menu.openBelow(e.currentTarget, [
                { label: "Importer des fichiers", icon: <Upload />, shortcut: "U", onSelect: () => pickFiles(currentFolderId) },
                { label: "Nouveau dossier", icon: <FolderPlus />, onSelect: () => setNewFolder({ parentId: currentFolderId }) },
                "separator",
                { label: "Nouveau montage", icon: <Clapperboard />, onSelect: () => router.push("/montage?nouveau=1") },
                { label: "Nouvelle publication", icon: <CalendarDays />, onSelect: () => router.push("/programmation?nouveau=1") },
              ])
            }
            className="flex h-11 items-center gap-2.5 rounded-2xl bg-surface pl-4 pr-5 text-[14px] font-semibold text-ink shadow-card transition-shadow hover:shadow-pop"
          >
            <Plus className="h-5 w-5 text-chestnut" /> Nouveau
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cx(
                    "flex h-9 items-center gap-3 rounded-full px-3 text-[13.5px] transition-colors",
                    isActive(item.href, item.exact) ? "bg-select font-semibold text-chestnut" : "text-ink hover:bg-hover",
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  {item.label}
                </Link>
                {item.href === "/mediatheque" ? <FolderTree folders={folders} currentId={currentFolderId} onNew={(parentId) => setNewFolder({ parentId })} /> : null}
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line px-3 py-3">
          <Link href="/reglages" className={cx("mb-2 flex h-9 items-center gap-3 rounded-full px-3 text-[13.5px]", isActive("/reglages") ? "bg-select font-semibold text-chestnut" : "hover:bg-hover")}>
            <Settings className="h-[18px] w-[18px]" aria-hidden /> Réglages
          </Link>
          <StorageMeter />
        </div>
      </aside>
      <NewFolderDialog state={newFolder} onClose={() => setNewFolder(null)} />
    </>
  );
}

function FolderTree({ folders, currentId, onNew }: { folders: Folder[]; currentId: string | null; onNew: (parentId: string | null) => void }) {
  const children = useMemo(() => {
    const m = new Map<string | null, Folder[]>();
    for (const f of folders) {
      const list = m.get(f.parentId) ?? [];
      list.push(f);
      m.set(f.parentId, list);
    }
    for (const list of m.values()) list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return m;
  }, [folders]);

  const ancestors = useMemo(() => {
    const byId = new Map(folders.map((f) => [f.id, f]));
    const set = new Set<string>();
    let cur = currentId ? byId.get(currentId) : undefined;
    while (cur?.parentId) {
      set.add(cur.parentId);
      cur = byId.get(cur.parentId);
    }
    return set;
  }, [folders, currentId]);

  const roots = children.get(null) ?? [];
  if (roots.length === 0) {
    return (
      <button type="button" onClick={() => onNew(null)} className="ml-9 mt-0.5 flex h-7 items-center gap-1.5 text-[12.5px] text-muted hover:text-chestnut">
        <FolderPlus className="h-3.5 w-3.5" /> Créer un premier dossier
      </button>
    );
  }
  return (
    <ul className="mt-0.5">
      {roots.map((f) => (
        <FolderNode key={f.id} folder={f} depth={0} childrenMap={children} currentId={currentId} ancestors={ancestors} />
      ))}
    </ul>
  );
}

function FolderNode({ folder, depth, childrenMap, currentId, ancestors }: { folder: Folder; depth: number; childrenMap: Map<string | null, Folder[]>; currentId: string | null; ancestors: Set<string> }) {
  const kids = childrenMap.get(folder.id) ?? [];
  const [open, setOpen] = useState(ancestors.has(folder.id));
  const [over, setOver] = useState(false);
  const toast = useToast();
  const { setSidebarOpen } = useShell();
  const active = currentId === folder.id;
  const expanded = open || ancestors.has(folder.id);

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setOver(false);
    const raw = e.dataTransfer.getData(DRAG_ASSETS_MIME);
    if (!raw) return;
    try {
      const ids = JSON.parse(raw) as string[];
      await api.post("/api/assets/bulk", { ids, op: { action: "move", folderId: folder.id } });
      emitRefresh("assets", "folders");
      toast(`${ids.length > 1 ? `${ids.length} médias déplacés` : "Média déplacé"} dans « ${folder.name} »`);
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    }
  }

  return (
    <li>
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_ASSETS_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cx(
          "group flex h-8 items-center rounded-full pr-2 text-[13px] transition-colors",
          active ? "bg-select font-semibold text-chestnut" : "text-ink hover:bg-hover",
          over && "bg-honey-soft ring-2 ring-honey",
        )}
        style={{ paddingLeft: 14 + depth * 14 }}
      >
        <button
          type="button"
          aria-label={expanded ? "Replier" : "Déplier"}
          onClick={() => setOpen(!expanded)}
          className={cx("mr-0.5 flex h-5 w-5 items-center justify-center rounded text-faint hover:text-ink", kids.length === 0 && "invisible")}
        >
          <ChevronRight className={cx("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
        </button>
        <Link href={`/mediatheque/dossier/${folder.id}`} onClick={() => setSidebarOpen(false)} className="flex min-w-0 flex-1 items-center gap-2">
          <FolderIcon className="h-4 w-4 shrink-0" style={folder.color ? { color: folder.color } : undefined} aria-hidden />
          <span className="truncate">{folder.name}</span>
        </Link>
        {folder.assetCount > 0 ? <span className="ml-1 text-2xs tabular-nums text-faint">{folder.assetCount}</span> : null}
      </div>
      {expanded && kids.length > 0 ? (
        <ul>
          {kids.map((k) => (
            <FolderNode key={k.id} folder={k} depth={depth + 1} childrenMap={childrenMap} currentId={currentId} ancestors={ancestors} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function StorageMeter() {
  const { data } = useResource<{ photos: number; videos: number; bytes: number }>("/api/stats/storage", ["assets"]);
  if (!data) return <div className="skeleton h-9" />;
  return (
    <div className="px-3 text-[12px] text-muted">
      <div className="flex items-center justify-between">
        <span>{formatBytes(data.bytes)} utilisés</span>
      </div>
      <div className="mt-1 text-2xs text-faint">
        {data.photos.toLocaleString("fr-FR")} photos · {data.videos.toLocaleString("fr-FR")} vidéos
      </div>
    </div>
  );
}

"use client";

/**
 * Médiathèque façon Google Drive : dossiers, grille ou liste virtualisée, sélection multiple
 * (clic, Ctrl/Cmd, Maj, clavier), glisser vers un dossier, menu contextuel, panneau Infos,
 * aperçu plein écran. Un seul composant pour tous les modes : racine, dossier, récents,
 * favoris, corbeille et recherche.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarPlus,
  Clapperboard,
  Clock,
  Copy,
  Download,
  Eye,
  FolderInput,
  FolderOpen,
  FolderPlus,
  MessageSquareText,
  Palette,
  Pencil,
  RotateCcw,
  ScanSearch,
  Search,
  Star,
  Tags,
  Trash2,
  Upload,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { AssetGrid, type GridHandle } from "@/components/library/AssetGrid";
import { AssetList } from "@/components/library/AssetList";
import type { CardHandlers } from "@/components/library/AssetCard";
import { DetailsPanel, revealHref } from "@/components/library/DetailsPanel";
import { FolderColorDialog, MoveDialog, TagsDialog, TextDialog } from "@/components/library/dialogs";
import { FolderCards } from "@/components/library/FolderCards";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { LibraryToolbar, NO_FILTERS, SORT_LABEL, type Filters } from "@/components/library/LibraryToolbar";
import { PreviewDialog } from "@/components/library/PreviewDialog";
import { SelectionBar, type SelectionCommands } from "@/components/library/SelectionBar";
import { useUploads } from "@/components/library/UploadProvider";
import { usePref, useMediaQuery } from "@/components/library/prefs";
import { useAssetList, type ListQuery } from "@/components/library/use-asset-list";
import { useFolderDropTarget } from "@/components/library/use-drop-target";
import { useLibraryActions } from "@/components/library/use-library-actions";
import { useSelection } from "@/components/library/use-selection";
import { ApplyLookDialog } from "@/components/retouch/ApplyLookDialog";
import { NewFolderDialog } from "@/components/shell/NewFolderDialog";
import { useScreenContext, useShell } from "@/components/shell/ShellContext";
import { DRAG_ASSETS_MIME } from "@/components/shell/Sidebar";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMenu, type MenuEntry } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { aiAvailable } from "@/lib/client/upload/ai";
import { useResource } from "@/lib/client/use-resource";
import { plural } from "@/lib/shared/format";
import type { Asset, AssetSort, Folder } from "@/lib/shared/types";

export type LibraryMode = "root" | "folder" | "recent" | "starred" | "trash" | "search";

export function LibraryView({ mode, folderId, query }: { mode: LibraryMode; folderId?: string; query?: string }) {
  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <LibraryScreen key={`${mode}:${folderId ?? ""}:${query ?? ""}`} mode={mode} folderId={folderId} query={query} />
    </Suspense>
  );
}

const isView = (v: unknown): v is "grid" | "list" => v === "grid" || v === "list";
const isSort = (v: unknown): v is AssetSort => typeof v === "string" && v in SORT_LABEL;
const isBool = (v: unknown): v is boolean => typeof v === "boolean";

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable));
}

function LibraryScreen({ mode, folderId, query }: { mode: LibraryMode; folderId?: string; query?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { folders, askAgent } = useShell();
  const { pickFiles } = useUploads();
  const menu = useMenu();
  const toast = useToast();
  const trash = mode === "trash";

  // Préférences d'affichage
  const [view, setView] = usePref<"grid" | "list">("view", "grid", isView);
  const [sortPref, setSortPref] = usePref<AssetSort>("sort", "recent", isSort);
  const [infoPref, setInfoPref] = usePref<boolean>("info", false, isBool);
  const desktop = useMediaQuery("(min-width: 1024px)", true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const infoOpen = desktop ? infoPref : sheetOpen;
  const toggleInfo = useCallback(() => (desktop ? setInfoPref(!infoPref) : setSheetOpen((o) => !o)), [desktop, infoPref, setInfoPref]);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const sort: AssetSort = mode === "recent" ? "recent" : sortPref;
  const filtered = filters.kind !== "all" || filters.tags.length > 0 || filters.untagged;

  // Données
  const listQuery = useMemo<ListQuery>(
    () => ({
      folder: mode === "root" ? "root" : mode === "folder" ? folderId : undefined,
      q: mode === "search" ? query?.trim() : undefined,
      starred: mode === "starred" || undefined,
      trashed: trash || undefined,
      kind: filters.kind === "all" ? undefined : filters.kind,
      tags: filters.tags.length ? filters.tags : undefined,
      untagged: filters.untagged || undefined,
      sort,
    }),
    [mode, folderId, query, trash, filters, sort],
  );
  const emptySearch = mode === "search" && !query?.trim();
  const list = useAssetList(emptySearch ? null : listQuery, { pageSize: mode === "recent" ? 100 : 200, maxItems: mode === "recent" ? 100 : undefined });
  const items = list.items;
  const folderInfo = useResource<{ folder: Folder; path: Folder[] }>(mode === "folder" && folderId ? `/api/folders/${folderId}` : null, ["folders"]);
  const tagsRes = useResource<{ tags: { tag: string; count: number }[] }>("/api/assets/tags", ["assets"]);
  const tags = useMemo(() => tagsRes.data?.tags ?? [], [tagsRes.data]);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    void aiAvailable().then(setAiEnabled);
  }, []);

  const currentFolder = mode === "folder" ? folderInfo.data?.folder ?? folders.find((f) => f.id === folderId) ?? null : null;
  const folderPath = useMemo(() => {
    if (mode !== "folder") return [];
    if (folderInfo.data?.path) return folderInfo.data.path;
    const byId = new Map(folders.map((f) => [f.id, f]));
    const out: Folder[] = [];
    let cur = folderId ? byId.get(folderId) : undefined;
    while (cur && out.length < 50) {
      out.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return out;
  }, [mode, folderInfo.data, folders, folderId]);
  const folderMissing = mode === "folder" && Boolean(folderInfo.error) && !currentFolder;

  const subFolders = useMemo(() => {
    let list: Folder[] = [];
    if (mode === "root") list = folders.filter((f) => f.parentId === null);
    else if (mode === "folder") list = folders.filter((f) => f.parentId === folderId);
    else if (mode === "search" && query?.trim()) {
      const q = query.trim().toLowerCase();
      list = folders.filter((f) => f.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [mode, folders, folderId, query]);
  const shownFolders = filtered ? [] : subFolders;

  // Sélection, aperçu, dialogues
  const sel = useSelection(items);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [moveFor, setMoveFor] = useState<Asset[] | null>(null);
  const [tagsFor, setTagsFor] = useState<Asset[] | null>(null);
  const [renameFor, setRenameFor] = useState<Asset | null>(null);
  const [lookFor, setLookFor] = useState<string[] | null>(null);
  const [deleteFor, setDeleteFor] = useState<Asset[] | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [folderRename, setFolderRename] = useState<Folder | null>(null);
  const [folderColor, setFolderColor] = useState<Folder | null>(null);
  const [folderDelete, setFolderDelete] = useState<Folder | null>(null);
  const [newFolder, setNewFolder] = useState<{ parentId: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const actions = useLibraryActions({
    mutate: list.mutate,
    removesOnMove: (target) => (mode === "root" && target !== null) || (mode === "folder" && target !== folderId),
  });

  useScreenContext({
    page: "mediatheque",
    folderId: mode === "folder" ? folderId ?? null : mode === "root" ? null : undefined,
    selectedAssetIds: [...sel.selected],
  });

  const gridRef = useRef<GridHandle>(null);
  const cardEls = useRef(new Map<string, HTMLElement>());
  const pendingFocus = useRef<string | null>(null);
  const pointer = useRef<{ type: string; longPress: number | null; fired: boolean; x: number; y: number }>({ type: "mouse", longPress: null, fired: false, x: 0, y: 0 });

  const openPreview = useCallback((id: string) => setPreviewId(id), []);

  // État courant lu par les gestionnaires stables.
  const live = useRef({ items, sel, actions, trash, view, activeIndex });
  live.current = { items, sel, actions, trash, view, activeIndex };

  const contextItems = useCallback(
    (targets: Asset[]): MenuEntry[] => {
      const a = live.current.actions;
      const one = targets.length === 1 ? targets[0] : null;
      if (live.current.trash) {
        return [
          ...(one ? [{ label: "Ouvrir", icon: <Eye />, shortcut: "Entrée", onSelect: () => openPreview(one.id) }] : []),
          { label: "Restaurer", icon: <RotateCcw />, onSelect: () => void a.restore(targets) },
          { label: "Télécharger", icon: <Download />, onSelect: () => a.download(targets) },
          "separator",
          { label: "Supprimer définitivement", icon: <Trash2 />, danger: true, onSelect: () => setDeleteFor(targets) },
        ];
      }
      const photos = targets.filter((t) => t.kind === "photo");
      const visual = targets.filter((t) => t.kind !== "audio");
      const allStarred = targets.every((t) => t.starred);
      return [
        ...(one ? [{ label: "Ouvrir", icon: <Eye />, shortcut: "Entrée", onSelect: () => openPreview(one.id) }] : []),
        ...(one && one.kind === "photo" ? [{ label: "Retoucher", icon: <WandSparkles />, onSelect: () => a.retouch(one) }] : []),
        { label: targets.length > 1 ? `Télécharger (${targets.length})` : "Télécharger", icon: <Download />, onSelect: () => a.download(targets) },
        ...(one ? [{ label: "Copier le lien de téléchargement", icon: <Copy />, onSelect: () => void a.copyLink(one) }] : []),
        ...(one ? [{ label: "Renommer", icon: <Pencil />, shortcut: "F2", onSelect: () => setRenameFor(one) }] : []),
        "separator",
        { label: "Déplacer…", icon: <FolderInput />, onSelect: () => setMoveFor(targets) },
        { label: "Mots-clés…", icon: <Tags />, onSelect: () => setTagsFor(targets) },
        { label: allStarred ? "Retirer des favoris" : "Ajouter aux favoris", icon: <Star />, shortcut: "S", onSelect: () => void a.star(targets, !allStarred) },
        ...(photos.length ? [{ label: "Appliquer un look…", icon: <Palette />, onSelect: () => setLookFor(photos.map((p) => p.id)) }] : []),
        ...(visual.length ? [{ label: "Monter", icon: <Clapperboard />, onSelect: () => a.montage(targets) }] : []),
        ...(visual.length ? [{ label: "Programmer", icon: <CalendarPlus />, onSelect: () => a.schedule(targets) }] : []),
        { label: "Demander à l'agent", icon: <MessageSquareText />, onSelect: () => a.askAbout(targets) },
        ...(visual.length ? [{ label: "Analyser avec l'IA", icon: <ScanSearch />, onSelect: () => void a.analyze(targets) }] : []),
        "separator",
        { label: "Mettre à la corbeille", icon: <Trash2 />, danger: true, shortcut: "Suppr", onSelect: () => void a.trash(targets) },
      ];
    },
    [openPreview],
  );

  const focusIndex = useCallback((idx: number) => {
    const { items: list } = live.current;
    const a = list[idx];
    if (!a) return;
    setActiveIndex(idx);
    gridRef.current?.ensureVisible(idx);
    const el = cardEls.current.get(a.id);
    if (el) el.focus({ preventScroll: true });
    else pendingFocus.current = a.id;
  }, []);

  const handlers = useMemo<CardHandlers>(
    () => ({
      pointerDown: (e, index) => {
        const p = pointer.current;
        p.type = e.pointerType;
        p.fired = false;
        p.x = e.clientX;
        p.y = e.clientY;
        if (p.longPress) window.clearTimeout(p.longPress);
        p.longPress = null;
        if (e.pointerType !== "touch") return;
        const cancel = (ev: PointerEvent) => {
          if (ev.type === "pointermove" && Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < 10) return;
          if (p.longPress) window.clearTimeout(p.longPress);
          p.longPress = null;
          window.removeEventListener("pointermove", cancel);
          window.removeEventListener("pointerup", cancel);
          window.removeEventListener("pointercancel", cancel);
        };
        window.addEventListener("pointermove", cancel);
        window.addEventListener("pointerup", cancel);
        window.addEventListener("pointercancel", cancel);
        p.longPress = window.setTimeout(() => {
          p.longPress = null;
          p.fired = true;
          const a = live.current.items[index];
          if (a) {
            live.current.sel.toggle(a.id);
            setActiveIndex(index);
            navigator.vibrate?.(8);
          }
        }, 450);
      },
      click: (e, index) => {
        const { items: list, sel: s } = live.current;
        const a = list[index];
        if (!a) return;
        const p = pointer.current;
        if (p.fired) {
          p.fired = false;
          return;
        }
        setActiveIndex(index);
        if (p.type === "touch") {
          if (s.selected.size > 0) s.toggle(a.id);
          else openPreview(a.id);
          return;
        }
        if (e.shiftKey) s.range(a.id, e.metaKey || e.ctrlKey);
        else if (e.metaKey || e.ctrlKey) s.toggle(a.id);
        else s.selectOnly(a.id);
      },
      doubleClick: (index) => {
        const a = live.current.items[index];
        if (a && pointer.current.type !== "touch") openPreview(a.id);
      },
      contextMenu: (e, index) => {
        const { items: list, sel: s } = live.current;
        const a = list[index];
        if (!a) return;
        if (pointer.current.type === "touch" && pointer.current.fired) {
          e.preventDefault();
          return;
        }
        let targets: Asset[];
        if (s.selected.has(a.id)) targets = s.selectedAssets;
        else {
          s.selectOnly(a.id);
          targets = [a];
        }
        setActiveIndex(index);
        menu.openAt(e, contextItems(targets));
      },
      toggleCheck: (index, shift) => {
        const { items: list, sel: s } = live.current;
        const a = list[index];
        if (!a) return;
        setActiveIndex(index);
        if (shift) s.range(a.id, true);
        else s.toggle(a.id);
      },
      toggleStar: (index) => {
        const a = live.current.items[index];
        if (a) void live.current.actions.star([a], !a.starred);
      },
      dragStart: (e, index) => {
        const { items: list, sel: s } = live.current;
        const a = list[index];
        if (!a) return;
        const ids = s.selected.has(a.id) ? [...s.selected] : [a.id];
        if (!s.selected.has(a.id)) s.selectOnly(a.id);
        e.dataTransfer.setData(DRAG_ASSETS_MIME, JSON.stringify(ids));
        e.dataTransfer.setData("text/plain", ids.length > 1 ? plural(ids.length, "média") : a.name);
        e.dataTransfer.effectAllowed = "move";
        const ghost = document.createElement("div");
        ghost.textContent = ids.length > 1 ? plural(ids.length, "média") : a.name;
        ghost.style.cssText =
          "position:fixed;top:-200px;left:-200px;max-width:260px;padding:8px 14px;border-radius:999px;background:#241D17;color:#FBF7F0;font:600 13px var(--font-manrope),system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 10px 28px rgba(36,29,23,.28)";
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 18, 18);
        window.setTimeout(() => ghost.remove(), 0);
      },
      focus: (index) => setActiveIndex(index),
      register: (id, el) => {
        if (el) {
          cardEls.current.set(id, el);
          if (pendingFocus.current === id) {
            pendingFocus.current = null;
            el.focus({ preventScroll: true });
          }
        } else cardEls.current.delete(id);
      },
    }),
    [menu, contextItems, openPreview],
  );

  // Raccourcis clavier de la vue
  useEffect(() => {
    // Un menu ou une fenêtre ouverts au début de l'événement le gèrent (Échap ferme le menu sans
    // vider la sélection) : on le note avant que React ne les retire du DOM.
    let overlayAtStart = false;
    const onCapture = () => {
      overlayAtStart = Boolean(document.querySelector("dialog[open],[role=menu]"));
    };
    const onKey = (e: KeyboardEvent) => {
      if (overlayAtStart || e.defaultPrevented || document.querySelector("dialog[open]") || document.querySelector("[role=menu]")) return;
      if (isTyping(e.target)) return;
      const { items: list, sel: s, actions: a, trash: inTrash, view: v, activeIndex: active } = live.current;
      const t = e.target as HTMLElement;
      const onCard = Boolean(t.closest?.("[data-card]"));
      const neutral = onCard || t === document.body || t.tagName === "MAIN" || t.tagName === "HTML";
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key;

      if (mod && key.toLowerCase() === "a") {
        if (list.length === 0) return;
        e.preventDefault();
        s.all();
        return;
      }
      if (key === "Escape" && s.selected.size > 0) {
        s.clear();
        return;
      }
      if ((key === "Delete" || key === "Backspace") && s.selected.size > 0 && neutral) {
        e.preventDefault();
        if (inTrash) setDeleteFor(s.selectedAssets);
        else void a.trash(s.selectedAssets);
        return;
      }
      if (key === "Enter" && neutral) {
        const target = onCard && active >= 0 ? list[active] : s.selectedAssets[0];
        if (target) {
          e.preventDefault();
          openPreview(target.id);
        }
        return;
      }
      if (mod || e.altKey) return;
      if (key.toLowerCase() === "i") {
        e.preventDefault();
        toggleInfo();
        return;
      }
      if (key === "F2" && s.selectedAssets.length === 1 && !inTrash) {
        e.preventDefault();
        setRenameFor(s.selectedAssets[0]);
        return;
      }
      if (key.toLowerCase() === "s" && s.selectedAssets.length > 0 && !inTrash) {
        e.preventDefault();
        const all = s.selectedAssets.every((x) => x.starred);
        void a.star(s.selectedAssets, !all);
        return;
      }
      if (key === " " && onCard && active >= 0 && list[active]) {
        e.preventDefault();
        s.toggle(list[active].id);
        return;
      }
      if (!neutral || list.length === 0) return;
      const cols = v === "grid" ? gridRef.current?.columns() ?? 1 : 1;
      const cur = active < 0 ? -1 : active;
      let next = cur;
      if (key === "ArrowRight" && v === "grid") next = cur + 1;
      else if (key === "ArrowLeft" && v === "grid") next = cur - 1;
      else if (key === "ArrowDown") next = cur < 0 ? 0 : cur + cols;
      else if (key === "ArrowUp") next = cur - cols;
      else if (key === "Home") next = 0;
      else if (key === "End") next = list.length - 1;
      else return;
      e.preventDefault();
      next = Math.max(0, Math.min(list.length - 1, next));
      const target = list[next];
      if (e.shiftKey) s.range(target.id, false);
      else s.selectOnly(target.id);
      focusIndex(next);
    };
    window.addEventListener("keydown", onCapture, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onCapture, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [openPreview, toggleInfo, focusIndex]);

  // ?media=<id> : sélectionne et montre un média (liens du tiroir d'envoi, des versions, de l'agent).
  const mediaParam = searchParams.get("media");
  const revealed = useRef<string | null>(null);
  useEffect(() => {
    if (!mediaParam || revealed.current === mediaParam || !list.ready || list.loading) return;
    const idx = items.findIndex((a) => a.id === mediaParam);
    const clearParam = () => {
      const sp = new URLSearchParams(window.location.search);
      sp.delete("media");
      const s = sp.toString();
      router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false });
    };
    if (idx >= 0) {
      revealed.current = mediaParam;
      sel.selectOnly(mediaParam);
      setActiveIndex(idx);
      if (desktop && !infoPref) setInfoPref(true);
      window.requestAnimationFrame(() => focusIndex(idx));
      clearParam();
      return;
    }
    if (list.hasMore && items.length < 3000 && !list.loadingMore) {
      void list.loadMore();
      return;
    }
    if (list.loadingMore) return;
    revealed.current = mediaParam;
    api
      .get<Asset>(`/api/assets/${mediaParam}`)
      .then((a) => {
        const href = revealHref(a);
        if (href.split("?")[0] !== pathname) router.replace(href);
        else {
          clearParam();
          toast("Ce média est masqué par les filtres actuels.", { tone: "info" });
        }
      })
      .catch(() => {
        clearParam();
        toast("Ce média n'existe plus.", { tone: "error" });
      });
  }, [mediaParam, list.ready, list.loading, list.hasMore, list.loadingMore, list, items, sel, desktop, infoPref, setInfoPref, focusIndex, router, pathname, toast]);

  // Commandes de la barre de sélection
  const selected = sel.selectedAssets;
  const cmd: SelectionCommands = {
    clear: sel.clear,
    download: () => actions.download(selected),
    move: () => setMoveFor(selected),
    tags: () => setTagsFor(selected),
    star: (starred) => void actions.star(selected, starred),
    retouch: () => selected[0] && actions.retouch(selected[0]),
    applyLook: () => setLookFor(selected.filter((a) => a.kind === "photo").map((a) => a.id)),
    montage: () => actions.montage(selected),
    schedule: () => actions.schedule(selected),
    askAgent: () => actions.askAbout(selected),
    analyze: () => void actions.analyze(selected),
    trash: () => void actions.trash(selected),
    restore: () => void actions.restore(selected),
    deleteForever: () => setDeleteFor(selected),
  };

  // Dossiers
  const moveIds = useCallback(
    (ids: string[], target: string | null) => {
      const byId = new Map(live.current.items.map((a) => [a.id, a]));
      const assets = ids.map((id) => byId.get(id)).filter((a): a is Asset => Boolean(a));
      if (assets.length) void live.current.actions.move(assets, target);
      else
        void api
          .post("/api/assets/bulk", { ids, op: { action: "move", folderId: target } })
          .then(() => emitRefresh("assets", "folders"))
          .catch((err) => toast(errorMessage(err), { tone: "error" }));
    },
    [toast],
  );

  const folderMenu = useCallback(
    (f: Folder, withOpen: boolean): MenuEntry[] => [
      ...(withOpen ? [{ label: "Ouvrir", icon: <FolderOpen />, onSelect: () => router.push(`/mediatheque/dossier/${f.id}`) }] : []),
      { label: "Importer ici", icon: <Upload />, onSelect: () => pickFiles(f.id) },
      { label: "Renommer", icon: <Pencil />, onSelect: () => setFolderRename(f) },
      { label: "Couleur", icon: <Palette />, onSelect: () => setFolderColor(f) },
      { label: "Nouveau sous-dossier", icon: <FolderPlus />, onSelect: () => setNewFolder({ parentId: f.id }) },
      "separator",
      { label: "Supprimer le dossier", icon: <Trash2 />, danger: true, onSelect: () => setFolderDelete(f) },
    ],
    [router, pickFiles],
  );

  const onFolderCardMenu = useCallback(
    (f: Folder, at: { clientX: number; clientY: number } | HTMLElement) => {
      if (at instanceof HTMLElement) menu.openBelow(at, folderMenu(f, true), "right");
      else menu.openAt(at, folderMenu(f, true));
    },
    [menu, folderMenu],
  );

  const subtreeCount = (f: Folder) => {
    const ids = new Set([f.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const x of folders) if (x.parentId && ids.has(x.parentId) && !ids.has(x.id)) {
        ids.add(x.id);
        grew = true;
      }
    }
    return folders.filter((x) => ids.has(x.id)).reduce((n, x) => n + x.assetCount, 0);
  };

  const patchFolder = async (f: Folder, patch: { name?: string; color?: string | null }) => {
    try {
      await api.patch<Folder>(`/api/folders/${f.id}`, patch);
      emitRefresh("folders");
      toast(patch.name ? `Dossier renommé en « ${patch.name} »` : "Couleur du dossier mise à jour");
      return true;
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
      return false;
    }
  };

  const deleteFolder = async (f: Folder) => {
    setBusy(true);
    try {
      const r = await api.del<{ trashedAssets: number }>(`/api/folders/${f.id}`);
      emitRefresh("folders", "assets", "stats", "cleanup");
      toast(r.trashedAssets > 0 ? `Dossier « ${f.name} » supprimé · ${plural(r.trashedAssets, "média")} dans la corbeille` : `Dossier « ${f.name} » supprimé`);
      setFolderDelete(null);
      if (mode === "folder" && folderPath.some((p) => p.id === f.id)) router.push(f.parentId ? `/mediatheque/dossier/${f.parentId}` : "/mediatheque");
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  // Fond cliqué : on désélectionne (comme dans Drive).
  const onBackgroundDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.shiftKey || e.metaKey || e.ctrlKey) return;
    const t = e.target as HTMLElement;
    if (t.closest("[data-card],button,a,input,textarea,select,label,[role=toolbar],[role=dialog],[role=menu],aside,dialog,[data-keep-selection]")) return;
    sel.clear();
  };

  const focusAsset = selected.length === 1 ? selected[0] : null;
  const showEmpty = list.ready && !list.loading && items.length === 0 && !list.error;
  const rootEmpty = showEmpty && !filtered && (mode === "root" || mode === "folder") && shownFolders.length === 0;
  const importTarget = mode === "folder" ? folderId ?? null : null;
  const label = mode === "search" ? `Résultats pour ${query}` : mode === "folder" ? `Médias de ${currentFolder?.name ?? "ce dossier"}` : "Médias";

  if (folderMissing) {
    return (
      <div className="px-6 py-10">
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title="Ce dossier n'existe plus"
          action={
            <Button variant="primary" onClick={() => router.push("/mediatheque")}>
              Retour à la médiathèque
            </Button>
          }
        >
          Il a peut-être été supprimé. Ses médias sont dans la corbeille.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex min-h-full">
      <div className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8" onMouseDown={onBackgroundDown}>
        <LibraryHeader
          mode={mode}
          query={query}
          folder={currentFolder}
          path={folderPath}
          total={emptySearch ? 0 : list.ready ? list.total : null}
          hideImport={rootEmpty}
          onImport={() => pickFiles(importTarget)}
          onNewFolder={() => setNewFolder({ parentId: importTarget })}
          onFolderMenu={(el) => currentFolder && menu.openBelow(el, folderMenu(currentFolder, false))}
          onEmptyTrash={() => setConfirmEmpty(true)}
          onMoveIds={moveIds}
        />

        {!emptySearch ? (
          <div className="sticky top-0 z-20 -mx-4 mb-4 bg-canvas/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            {selected.length > 0 ? (
              <SelectionBar assets={selected} trash={trash} cmd={cmd} />
            ) : (
              <div className="flex h-11 items-center">
                <div className="min-w-0 flex-1">
                  <LibraryToolbar
                    filters={filters}
                    onFilters={setFilters}
                    sort={sort}
                    onSort={mode === "recent" ? null : setSortPref}
                    view={view}
                    onView={setView}
                    infoOpen={infoOpen}
                    onToggleInfo={toggleInfo}
                    tags={tags}
                    showUntagged={!trash}
                    onAskAgent={mode === "root" || mode === "folder" ? () => askAgent("Analyse et range les médias non triés de ce dossier") : null}
                  />
                </div>
              </div>
            )}
            {list.loading && list.ready ? <div className="absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-honey/60" aria-hidden /> : null}
          </div>
        ) : null}

        {emptySearch ? (
          <EmptyState icon={<Search className="h-6 w-6" />} title="Que cherchez-vous ?">
            Tapez un mot dans la barre de recherche : un lieu, une ambiance, un client, un mot-clé…
          </EmptyState>
        ) : !list.ready ? (
          <GridSkeleton />
        ) : list.error && items.length === 0 ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : (
          <>
            {list.error ? (
              <div role="alert" className="mb-3 flex items-center gap-3 rounded-xl bg-terracotta-soft px-4 py-2.5 text-[13px] text-terracotta">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1">Actualisation impossible : {list.error}</span>
                <button type="button" onClick={list.reload} className="font-semibold hover:underline">
                  Réessayer
                </button>
              </div>
            ) : null}
            {mode === "root" || mode === "folder" || mode === "search" ? <FolderCards folders={shownFolders} onMenu={onFolderCardMenu} onMoveIds={moveIds} /> : null}
            {items.length > 0 ? (
              <>
                {shownFolders.length > 0 ? <h2 className="label-eyebrow mb-2.5">Médias</h2> : null}
                {view === "grid" ? (
                  <AssetGrid ref={gridRef} items={items} selected={sel.selected} activeIndex={activeIndex} draggable={desktop} handlers={handlers} label={label} />
                ) : (
                  <AssetList ref={gridRef} items={items} selected={sel.selected} activeIndex={activeIndex} draggable={desktop} handlers={handlers} label={label} />
                )}
                {list.hasMore ? (
                  <div className="mt-6 flex justify-center">
                    <Button variant="secondary" loading={list.loadingMore} onClick={() => void list.loadMore()}>
                      Afficher plus <span className="font-normal text-muted">({(list.total - items.length).toLocaleString("fr-FR")} restants)</span>
                    </Button>
                  </div>
                ) : null}
              </>
            ) : showEmpty ? (
              <ModeEmpty
                mode={mode}
                query={query}
                filtered={filtered}
                hasFolders={shownFolders.length > 0}
                folderId={importTarget}
                folderName={currentFolder?.name ?? "Médiathèque"}
                onClearFilters={() => setFilters(NO_FILTERS)}
                onImport={() => pickFiles(importTarget)}
                onMoveIds={moveIds}
              />
            ) : null}
          </>
        )}
      </div>

      {desktop && infoOpen ? (
        <aside className="sticky top-0 h-[calc(100dvh-3.5rem)] w-[320px] shrink-0 self-start border-l border-line bg-surface" aria-label="Infos">
          <DetailsPanel
            asset={focusAsset}
            selection={selected}
            aiEnabled={aiEnabled}
            tags={tags}
            actions={actions}
            onClose={toggleInfo}
            onPreview={(a) => openPreview(a.id)}
            onEditTags={() => setTagsFor(selected)}
            emptyHint="Sélectionnez un média pour voir ses détails, ses mots-clés et l'analyse de l'IA."
          />
        </aside>
      ) : null}
      {!desktop && sheetOpen ? (
        <div className="fixed inset-0 z-panel" role="dialog" aria-modal="true" aria-label="Infos">
          <div className="absolute inset-0 bg-night/35 animate-fade-in" onClick={() => setSheetOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[20px] bg-surface shadow-pop animate-rise-in">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink/25" aria-hidden />
            <DetailsPanel
              asset={focusAsset}
              selection={selected}
              aiEnabled={aiEnabled}
              tags={tags}
              actions={actions}
              onClose={() => setSheetOpen(false)}
              onPreview={(a) => openPreview(a.id)}
              onEditTags={() => setTagsFor(selected)}
              emptyHint="Touchez longuement un média pour le sélectionner, puis rouvrez les infos."
              className="h-[min(78dvh,680px)]"
            />
          </div>
        </div>
      ) : null}

      <PreviewDialog
        assets={items}
        currentId={previewId}
        onNavigate={(id) => {
          setPreviewId(id);
          const idx = live.current.items.findIndex((a) => a.id === id);
          if (idx >= 0) {
            setActiveIndex(idx);
            live.current.sel.selectOnly(id);
          }
        }}
        onClose={() => {
          const id = previewId;
          setPreviewId(null);
          if (id) {
            const idx = live.current.items.findIndex((a) => a.id === id);
            if (idx >= 0) window.setTimeout(() => focusIndex(idx), 0);
          }
        }}
        actions={actions}
        trash={trash}
        aiEnabled={aiEnabled}
        tags={tags}
        onEditTags={(a) => setTagsFor([a])}
      />

      <MoveDialog
        open={Boolean(moveFor)}
        onClose={() => setMoveFor(null)}
        folders={folders}
        count={moveFor?.length ?? 0}
        currentFolderIds={moveFor?.map((a) => a.folderId) ?? []}
        onMove={(target) => {
          const assets = moveFor ?? [];
          setMoveFor(null);
          void actions.move(assets, target);
        }}
      />
      <TagsDialog open={Boolean(tagsFor)} onClose={() => setTagsFor(null)} assets={tagsFor ?? []} suggestions={tags} onApply={(add, remove) => actions.tag(tagsFor ?? [], add, remove)} />
      <TextDialog
        open={Boolean(renameFor)}
        onClose={() => setRenameFor(null)}
        title="Renommer le média"
        label="Nouveau nom"
        initial={renameFor?.name ?? ""}
        selectBaseName
        onSubmit={(v) => (renameFor ? actions.rename(renameFor, v) : Promise.resolve(true))}
      />
      <TextDialog
        open={Boolean(folderRename)}
        onClose={() => setFolderRename(null)}
        title="Renommer le dossier"
        label="Nom du dossier"
        initial={folderRename?.name ?? ""}
        maxLength={120}
        onSubmit={(v) => (folderRename ? patchFolder(folderRename, { name: v }) : Promise.resolve(true))}
      />
      <FolderColorDialog
        open={Boolean(folderColor)}
        onClose={() => setFolderColor(null)}
        folder={folderColor}
        onPick={(color) => {
          const f = folderColor;
          setFolderColor(null);
          if (f) void patchFolder(f, { color });
        }}
      />
      <ConfirmDialog
        open={Boolean(folderDelete)}
        onClose={() => setFolderDelete(null)}
        onConfirm={() => folderDelete && void deleteFolder(folderDelete)}
        title={`Supprimer « ${folderDelete?.name ?? ""} » ?`}
        confirmLabel="Supprimer le dossier"
        danger
        loading={busy}
      >
        {folderDelete && subtreeCount(folderDelete) > 0 ? (
          <>
            Le dossier et ses sous-dossiers seront supprimés. Les {plural(subtreeCount(folderDelete), "média")} qu'ils contiennent iront à la corbeille : vous pourrez les restaurer, ils
            reviendront alors à la racine de la médiathèque.
          </>
        ) : (
          "Le dossier est vide : il sera simplement supprimé, avec ses éventuels sous-dossiers."
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(deleteFor)}
        onClose={() => setDeleteFor(null)}
        onConfirm={() => {
          const assets = deleteFor ?? [];
          setDeleteFor(null);
          void actions.deleteForever(assets);
        }}
        title={deleteFor && deleteFor.length > 1 ? `Supprimer définitivement ${plural(deleteFor.length, "média")} ?` : "Supprimer définitivement ce média ?"}
        confirmLabel="Supprimer définitivement"
        danger
      >
        Les fichiers seront effacés du stockage, ainsi que leurs vignettes. Cette action est irréversible.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmEmpty}
        onClose={() => setConfirmEmpty(false)}
        onConfirm={async () => {
          setBusy(true);
          await actions.emptyTrash();
          setBusy(false);
          setConfirmEmpty(false);
        }}
        title="Vider la corbeille ?"
        confirmLabel="Vider la corbeille"
        danger
        loading={busy}
      >
        {list.total > 0 ? `Les ${plural(list.total, "média")} de la corbeille seront effacés définitivement, fichiers compris.` : "Tout ce qui est dans la corbeille sera effacé définitivement."} Cette action est
        irréversible.
      </ConfirmDialog>
      <ApplyLookDialog open={Boolean(lookFor)} onClose={() => setLookFor(null)} assetIds={lookFor ?? []} />
      <NewFolderDialog state={newFolder} onClose={() => setNewFolder(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// États : chargement, erreur, vide

function LibrarySkeleton() {
  return (
    <div className="px-4 pt-5 sm:px-6 lg:px-8">
      <div className="skeleton mb-2 h-8 w-48" />
      <div className="skeleton mb-6 h-4 w-24" />
      <GridSkeleton />
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(176px,1fr))] sm:gap-3" aria-busy="true" aria-label="Chargement des médias">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="p-1.5">
          <div className="skeleton aspect-square w-full rounded-[9px]" />
          <div className="skeleton mt-2.5 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-10 max-w-md rounded-card border border-terracotta/25 bg-surface p-6 text-center shadow-card">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-soft text-terracotta">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-[14.5px] font-semibold text-ink">Impossible de charger les médias</p>
      <p className="mt-1 text-[13px] text-muted">{message}</p>
      <Button className="mt-4" onClick={onRetry} icon={<RotateCcw className="h-4 w-4" />}>
        Réessayer
      </Button>
    </div>
  );
}

function ModeEmpty({
  mode,
  query,
  filtered,
  hasFolders,
  folderId,
  folderName,
  onClearFilters,
  onImport,
  onMoveIds,
}: {
  mode: LibraryMode;
  query?: string;
  filtered: boolean;
  hasFolders: boolean;
  folderId: string | null;
  folderName: string;
  onClearFilters: () => void;
  onImport: () => void;
  onMoveIds: (ids: string[], folderId: string | null) => void;
}) {
  if (filtered) {
    return (
      <EmptyState icon={<Search className="h-6 w-6" />} title="Aucun média ne correspond" action={<Button onClick={onClearFilters}>Effacer les filtres</Button>}>
        Essayez un autre type ou d'autres mots-clés.
      </EmptyState>
    );
  }
  if (mode === "root" || mode === "folder") {
    return <DropZone big={!hasFolders} root={mode === "root"} folderId={folderId} folderName={folderName} onImport={onImport} onMoveIds={onMoveIds} />;
  }
  if (mode === "trash")
    return (
      <EmptyState icon={<Trash2 className="h-6 w-6" />} title="La corbeille est vide">
        Les médias que vous supprimez arrivent ici. Vous pourrez les restaurer ou les effacer définitivement.
      </EmptyState>
    );
  if (mode === "starred")
    return (
      <EmptyState icon={<Star className="h-6 w-6" />} title="Aucun favori pour l'instant">
        Survolez un média et touchez son étoile (ou appuyez sur S) pour le retrouver ici.
      </EmptyState>
    );
  if (mode === "recent")
    return (
      <EmptyState icon={<Clock className="h-6 w-6" />} title="Rien de récent" action={<Button icon={<Upload className="h-4 w-4" />} onClick={onImport}>Importer</Button>}>
        Les médias que vous importez apparaîtront ici, tous dossiers confondus.
      </EmptyState>
    );
  return (
    <EmptyState icon={<Search className="h-6 w-6" />} title={`Aucun résultat pour « ${query ?? ""} »`}>
      Essayez un autre mot : un lieu, une ambiance, un client, un mot-clé… La recherche porte sur les noms, les mots-clés, les titres de l'IA et les dossiers.
    </EmptyState>
  );
}

function DropZone({ big, root, folderId, folderName, onImport, onMoveIds }: { big: boolean; root: boolean; folderId: string | null; folderName: string; onImport: () => void; onMoveIds: (ids: string[], folderId: string | null) => void }) {
  const drop = useFolderDropTarget(folderId, folderName, onMoveIds);
  return (
    <div
      {...drop.props}
      className={cx(
        "mx-auto flex max-w-2xl flex-col items-center rounded-[20px] border-2 border-dashed px-6 text-center transition-colors",
        big ? "mt-4 py-16" : "mt-2 py-10",
        drop.over ? "border-honey bg-honey-soft/60" : "border-line-strong bg-surface/50",
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-honey-soft text-chestnut">
        <UploadCloud className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="font-display text-[1.45rem] font-[380] tracking-[-0.01em] text-ink">{root ? (big ? "Votre médiathèque vous attend" : "Aucun média à la racine") : "Ce dossier est vide"}</h2>
      <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">
        {root && big
          ? "Glissez ici vos photos et vidéos (iPhone, appareil photo, drone…) ou importez-les depuis votre ordinateur. Vignettes, dates de prise de vue et doublons sont repérés automatiquement."
          : "Glissez des photos ou des vidéos ici, ou importez-les depuis votre ordinateur."}
      </p>
      <Button variant="primary" size="lg" className="mt-6" icon={<Upload className="h-4 w-4" />} onClick={onImport}>
        Importer des fichiers
      </Button>
      <p className="mt-3 text-2xs text-faint">Raccourci : touche U · JPEG, HEIC, PNG, MP4, MOV, sons…</p>
    </div>
  );
}

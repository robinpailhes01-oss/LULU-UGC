"use client";

/**
 * File d'envoi de la médiathèque : sélecteur de fichiers, glisser-déposer sur toute la fenêtre,
 * raccourci « U », collage d'images, tiroir de progression façon Drive (en bas à droite) et
 * analyse IA automatique après import quand elle est configurée.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { useShell } from "@/components/shell/ShellContext";
import { useToast } from "@/components/ui/Toast";
import { UploadTray } from "@/components/library/UploadTray";
import { emitRefresh } from "@/lib/client/refresh";
import { AiBatcher } from "@/lib/client/upload/ai";
import { collectDropped, hasFiles, splitAccepted } from "@/lib/client/upload/files";
import { UploadQueue } from "@/lib/client/upload/queue";
import { plural } from "@/lib/shared/format";

export interface UploadsApi {
  /** Ouvre le sélecteur de fichiers puis envoie dans le dossier donné (null = racine). */
  pickFiles: (folderId: string | null) => void;
  /** Ajoute des fichiers à la file d'envoi. */
  enqueue: (files: File[], folderId: string | null) => void;
}

/** Événement émis par une zone de dépôt (carte de dossier) pour afficher sa cible dans le bandeau. */
export const UPLOAD_TARGET_EVENT = "atelier:upload-target";

export const ACCEPT = "image/*,video/*,audio/*,.heic,.heif";

const Ctx = createContext<UploadsApi>({ pickFiles: () => undefined, enqueue: () => undefined });

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const { folders } = useShell();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<string | null>(null);
  const currentFolderId = /^\/mediatheque\/dossier\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
  const currentRef = useRef(currentFolderId);
  currentRef.current = currentFolderId;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [queue] = useState(() => new UploadQueue({ concurrency: 3 }));
  const [ai] = useState(
    () =>
      new AiBatcher({
        onAnalyzed: () => emitRefresh("assets"),
        onUnavailable: () => toastRef.current("L'analyse IA automatique n'a pas pu se faire. Relancez-la plus tard depuis le panneau Infos.", { tone: "info" }),
      }),
  );

  // Rafraîchissement après chaque import, regroupé (au plus ~1 fois toutes les 700 ms).
  const refresh = useRef<{ last: number; timer: number | null }>({ last: 0, timer: null });
  useEffect(() => {
    const scheduleRefresh = () => {
      const r = refresh.current;
      const wait = 700 - (Date.now() - r.last);
      if (wait <= 0 && r.timer === null) {
        r.last = Date.now();
        emitRefresh("assets", "folders");
      } else if (r.timer === null) {
        r.timer = window.setTimeout(() => {
          r.timer = null;
          r.last = Date.now();
          emitRefresh("assets", "folders");
        }, Math.max(wait, 50));
      }
    };
    queue.setOptions({
      onCompleted: (asset) => {
        scheduleRefresh();
        if (asset.kind === "photo" || asset.kind === "video") ai.add(asset.id);
      },
    });
  }, [queue, ai]);

  const snap = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  useEffect(() => {
    if (!snap.busy) ai.flush();
  }, [snap.busy, ai]);

  // Avertit avant de quitter la page pendant un envoi.
  useEffect(() => {
    if (!snap.busy) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [snap.busy]);

  const enqueue = useCallback(
    (files: File[], folderId: string | null) => {
      const { accepted, rejected } = splitAccepted(files);
      if (rejected.length > 0) {
        toastRef.current(
          accepted.length > 0
            ? `${plural(rejected.length, "fichier ignoré", "fichiers ignorés")} : seuls les photos, vidéos et sons sont acceptés.`
            : "Aucun fichier importé : seuls les photos, vidéos et sons sont acceptés.",
          { tone: "info" },
        );
      }
      if (accepted.length > 0) queue.enqueue(accepted, folderId);
    },
    [queue],
  );

  const pickFiles = useCallback((folderId: string | null) => {
    targetRef.current = folderId;
    const input = inputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  }, []);

  // Raccourci « U » et collage d'images depuis le presse-papiers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "u" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (isTyping(e.target) || document.querySelector("dialog[open]")) return;
      e.preventDefault();
      pickFiles(currentRef.current);
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target) || document.querySelector("dialog[open]")) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      enqueue(
        files.map((f) => (f.name && f.name !== "image.png" ? f : new File([f], `Capture ${new Date().toLocaleString("fr-FR").replace(/[/:]/g, "-")}.${f.type.split("/")[1] || "png"}`, { type: f.type }))),
        currentRef.current,
      );
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [pickFiles, enqueue]);

  // Glisser-déposer de fichiers sur toute la fenêtre.
  const [dragging, setDragging] = useState(false);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  useEffect(() => {
    let internal = false;
    let hideTimer: number | null = null;
    const keepAlive = () => {
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        setDragging(false);
        setHoverTarget(null);
      }, 400);
    };
    const onDragStart = () => {
      internal = true; // glisser interne (cartes de médias) : pas de bandeau d'import
    };
    const onDragEnd = () => {
      internal = false;
    };
    const onDragOver = (e: DragEvent) => {
      if (internal || !hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      setDragging(true);
      keepAlive();
    };
    const onDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) keepAlive();
    };
    const onDrop = (e: DragEvent) => {
      if (internal) {
        internal = false;
        return;
      }
      if (!hasFiles(e.dataTransfer) || !e.dataTransfer) return;
      e.preventDefault();
      setDragging(false);
      setHoverTarget(null);
      void collectDropped(e.dataTransfer).then((files) => enqueue(files, currentRef.current));
    };
    const onTarget = (e: Event) => setHoverTarget((e as CustomEvent<string | null>).detail ?? null);
    window.addEventListener("dragstart", onDragStart);
    window.addEventListener("dragend", onDragEnd);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener(UPLOAD_TARGET_EVENT, onTarget);
    return () => {
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      window.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener(UPLOAD_TARGET_EVENT, onTarget);
    };
  }, [enqueue]);

  const folderName = currentFolderId ? folders.find((f) => f.id === currentFolderId)?.name ?? "ce dossier" : "Médiathèque";
  const api = useMemo<UploadsApi>(() => ({ pickFiles, enqueue }), [pickFiles, enqueue]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          if (files.length) enqueue(files, targetRef.current);
          e.currentTarget.value = "";
        }}
      />
      {dragging ? (
        <div className="pointer-events-none fixed inset-0 z-tray animate-fade-in" aria-hidden>
          <div className="absolute inset-2 rounded-[18px] border-2 border-dashed border-honey bg-honey/[0.06]" />
          <div className="absolute bottom-8 left-1/2 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-full bg-ink px-5 py-3 text-[14px] text-surface shadow-pop">
            <UploadCloud className="h-5 w-5 shrink-0 text-honey" />
            <span className="truncate">
              Déposez vos fichiers pour les importer dans « <strong className="font-semibold">{hoverTarget ?? folderName}</strong> »
            </span>
          </div>
        </div>
      ) : null}
      <UploadTray queue={queue} />
    </Ctx.Provider>
  );
}

export function useUploads(): UploadsApi {
  return useContext(Ctx);
}

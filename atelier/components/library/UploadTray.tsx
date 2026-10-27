"use client";

import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, Film, Image as ImageIcon, Loader2, Music, RotateCcw, X } from "lucide-react";
import { cx } from "@/components/ui/cx";
import type { UploadItem, UploadQueue } from "@/lib/client/upload/queue";
import { formatBytes, plural } from "@/lib/shared/format";

/** Tiroir d'envoi façon Drive, en bas à droite : progression par fichier, annulation, nouvel essai. */
export function UploadTray({ queue }: { queue: UploadQueue }) {
  const snap = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const items = snap.items;

  const stats = useMemo(() => {
    let remaining = 0;
    let done = 0;
    let errors = 0;
    let total = 0;
    let loaded = 0;
    for (const i of items) {
      if (i.phase === "cancelled") continue;
      if (i.phase === "done") done++;
      else if (i.phase === "error") errors++;
      else remaining++;
      total += i.size;
      loaded += i.phase === "done" ? i.size : i.loaded;
    }
    return { remaining, done, errors, total, loaded };
  }, [items]);

  const eta = useEta(snap.busy, stats.loaded, stats.total);

  // Le tiroir se rouvre quand de nouveaux fichiers arrivent.
  const count = items.length;
  const prevCount = useRef(count);
  useEffect(() => {
    if (count > prevCount.current) setCollapsed(false);
    prevCount.current = count;
  }, [count]);

  if (items.length === 0) return null;

  const title = snap.busy
    ? `Importation de ${plural(stats.remaining, "fichier")}…`
    : stats.errors > 0
      ? `${plural(stats.done, "importé", "importés")} · ${plural(stats.errors, "échec", "échecs")}`
      : stats.done > 0
        ? `${plural(stats.done, "fichier importé", "fichiers importés")}`
        : "Importation annulée";
  const pct = stats.total > 0 ? Math.min(100, (stats.loaded / stats.total) * 100) : 0;

  return (
    <section
      aria-label="Importations"
      className="fixed bottom-3 right-3 z-tray w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-card border border-line bg-surface shadow-pop animate-rise-in sm:bottom-4 sm:right-4"
    >
      <header className="relative flex items-center gap-2 bg-ink py-2.5 pl-4 pr-2 text-surface">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13.5px] font-semibold" aria-live="polite">
            {title}
          </h2>
          {snap.busy && eta ? <p className="text-2xs text-surface/60">{eta}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Déplier les importations" : "Replier les importations"}
          aria-expanded={!collapsed}
          className="rounded-full p-1.5 text-surface/70 hover:bg-white/10 hover:text-surface"
        >
          <ChevronDown className={cx("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
        {!snap.busy ? (
          <button type="button" onClick={() => queue.clearFinished()} aria-label="Fermer" className="rounded-full p-1.5 text-surface/70 hover:bg-white/10 hover:text-surface">
            <X className="h-4 w-4" />
          </button>
        ) : null}
        {snap.busy ? (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10" aria-hidden>
            <div className="h-full bg-honey transition-[width] duration-base" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </header>
      {!collapsed ? (
        <>
          <ul className="max-h-[min(340px,45vh)] divide-y divide-line overflow-y-auto">
            {items.map((item) => (
              <TrayRow key={item.id} item={item} queue={queue} onOpen={(id, folderId) => router.push(`${folderId ? `/mediatheque/dossier/${folderId}` : "/mediatheque"}?media=${id}`)} />
            ))}
          </ul>
          {snap.busy || stats.errors > 0 ? (
            <footer className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-[12.5px]">
              <span className="text-muted">
                {formatBytes(stats.loaded)} sur {formatBytes(stats.total)}
              </span>
              <div className="flex gap-1">
                {!snap.busy && stats.errors > 0 ? (
                  <button type="button" onClick={() => queue.retryAll()} className="h-7 rounded-full px-2.5 font-semibold text-chestnut hover:bg-hover">
                    Tout réessayer
                  </button>
                ) : null}
                {snap.busy ? (
                  <button type="button" onClick={() => queue.cancelAll()} className="h-7 rounded-full px-2.5 font-semibold text-terracotta hover:bg-terracotta-soft">
                    Tout annuler
                  </button>
                ) : null}
              </div>
            </footer>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

const TrayRow = memo(function TrayRow({ item, queue, onOpen }: { item: UploadItem; queue: UploadQueue; onOpen: (id: string, folderId: string | null) => void }) {
  const active = item.phase === "analyzing" || item.phase === "uploading" || item.phase === "finishing";
  const pct = item.size > 0 ? Math.min(100, (item.loaded / item.size) * 100) : 0;
  const Icon = item.kind === "video" ? Film : item.kind === "audio" ? Music : ImageIcon;

  let status: React.ReactNode;
  switch (item.phase) {
    case "queued":
      status = <span className="text-faint">En attente · {formatBytes(item.size)}</span>;
      break;
    case "analyzing":
      status = <span className="text-muted">Analyse du fichier…</span>;
      break;
    case "uploading":
      status = (
        <span className="tabular-nums text-muted">
          {formatBytes(item.loaded)} sur {formatBytes(item.size)}
        </span>
      );
      break;
    case "finishing":
      status = <span className="text-muted">Finalisation…</span>;
      break;
    case "done":
      status = <span className="text-muted">{formatBytes(item.size)} · Importé</span>;
      break;
    case "error":
      status = <span className="text-terracotta">{item.error ?? "Échec de l'envoi"}</span>;
      break;
    case "cancelled":
      status = <span className="text-faint">Annulé</span>;
      break;
  }

  return (
    <li className="group flex items-center gap-3 px-3 py-2.5">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sunken text-faint">
        {item.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-4 w-4" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        {item.phase === "done" && item.assetId ? (
          <button type="button" onClick={() => onOpen(item.assetId!, item.folderId)} className="block max-w-full truncate text-left text-[13px] font-semibold text-ink hover:text-chestnut hover:underline" title={`Afficher « ${item.name} »`}>
            {item.name}
          </button>
        ) : (
          <p className="truncate text-[13px] font-semibold text-ink" title={item.name}>
            {item.name}
          </p>
        )}
        <p className="mt-0.5 truncate text-2xs">{status}</p>
        {item.duplicateOf ? (
          <p className="mt-0.5 flex items-center gap-1 text-2xs font-semibold text-[#7a5220]">
            <Copy className="h-3 w-3" aria-hidden /> Déjà dans la médiathèque
            <button type="button" className="ml-1 font-semibold underline-offset-2 hover:underline" onClick={() => onOpen(item.duplicateOf!, null)}>
              Voir
            </button>
          </p>
        ) : null}
        {item.note && item.phase !== "error" ? <p className="mt-0.5 truncate text-2xs text-faint">{item.note}</p> : null}
        {item.phase === "uploading" || item.phase === "finishing" ? (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={`Envoi de ${item.name}`}>
            <div className="h-full rounded-full bg-honey transition-[width] duration-base" style={{ width: `${item.phase === "finishing" ? 100 : pct}%` }} />
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {item.phase === "done" ? <CheckCircle2 className="h-[18px] w-[18px] text-olive" aria-label="Importé" /> : null}
        {item.phase === "error" ? (
          <>
            <AlertTriangle className="h-4 w-4 text-terracotta" aria-label="Erreur" />
            <button type="button" onClick={() => queue.retry(item.id)} className="ml-1 inline-flex h-7 items-center gap-1 rounded-full px-2 text-2xs font-semibold text-chestnut hover:bg-hover">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Réessayer
            </button>
          </>
        ) : null}
        {item.phase === "cancelled" ? (
          <button type="button" onClick={() => queue.retry(item.id)} className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-2xs font-semibold text-chestnut hover:bg-hover">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Relancer
          </button>
        ) : null}
        {active ? <Loader2 className="h-4 w-4 animate-spin text-honey" aria-hidden /> : null}
        {active || item.phase === "queued" ? (
          <button
            type="button"
            onClick={() => queue.cancel(item.id)}
            aria-label={`Annuler l'envoi de ${item.name}`}
            className="rounded-full p-1 text-faint hover:bg-hover hover:text-terracotta focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </li>
  );
});

/** Estimation du temps restant à partir du débit moyen depuis le début de la série. */
function useEta(busy: boolean, loaded: number, total: number): string | null {
  const start = useRef<{ t: number; loaded: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!busy) {
      start.current = null;
      return;
    }
    const t = window.setInterval(() => setNow(Date.now()), 2000);
    return () => window.clearInterval(t);
  }, [busy]);
  if (!busy) return null;
  if (!start.current) start.current = { t: Date.now(), loaded };
  const elapsed = (now - start.current.t) / 1000;
  const speed = elapsed > 0 ? (loaded - start.current.loaded) / elapsed : 0;
  if (elapsed < 4 || speed <= 0) return null;
  const left = (total - loaded) / speed;
  if (left < 60) return "Moins d'une minute restante";
  return `Environ ${Math.round(left / 60)} min restantes`;
}

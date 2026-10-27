"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AlertTriangle, Clapperboard, Copy, ExternalLink, MoreHorizontal, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMenu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { useScreenContext } from "@/components/shell/ShellContext";
import { NewMontageDialog } from "@/components/montage/NewMontageDialog";
import { STATUS_TONE } from "@/components/montage/status";
import { api, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { useResource } from "@/lib/client/use-resource";
import { FORMAT_LABEL } from "@/lib/client/montage/style";
import type { MontageCard, MontageDetail } from "@/lib/client/montage/types";
import { formatDuration, formatRelative } from "@/lib/shared/format";
import { MONTAGE_STATUS_LABEL } from "@/lib/shared/labels";

/** Écran « Montage » : tous les montages, et la création d'un nouveau montage dans un style. */
export function MontageList() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <MontageListInner />
    </Suspense>
  );
}

function MontageListInner() {
  useScreenContext({ page: "montage" });
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const menu = useMenu();
  const { data, error, loading, reload, mutate } = useResource<{ montages: MontageCard[] }>("/api/montages", ["montages"]);
  const [dialog, setDialog] = useState<{ assets: string[]; style: string | null } | null>(null);
  const [toDelete, setToDelete] = useState<MontageCard | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Liens profonds : /montage?nouveau=1&assets=id1,id2&style=<slug>
  useEffect(() => {
    if (params.get("nouveau") !== "1") return;
    setDialog({ assets: (params.get("assets") ?? "").split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s)), style: params.get("style") });
  }, [params]);

  const closeDialog = () => {
    setDialog(null);
    if (params.get("nouveau")) router.replace("/montage", { scroll: false });
  };

  const montages = data?.montages ?? [];

  async function duplicate(m: MontageCard) {
    try {
      const copy = await api.post<MontageDetail>(`/api/montages/${m.id}/duplicate`);
      emitRefresh("montages");
      toast(`« ${copy.title} » créé`, { action: { label: "Ouvrir", onClick: () => router.push(`/montage/${copy.id}`) } });
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    }
  }

  async function remove(m: MontageCard) {
    setDeleting(true);
    try {
      await api.del(`/api/montages/${m.id}`);
      mutate((prev) => ({ montages: (prev?.montages ?? []).filter((x) => x.id !== m.id) }));
      emitRefresh("montages");
      toast(`« ${m.title} » supprimé${m.outputAssetId ? " (la vidéo rendue reste dans la médiathèque)" : ""}`);
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <h1 className="page-title">Montage</h1>
          <p className="mt-1 text-[13.5px] text-muted">Vos Reels montés avec HyperFrames, chacun dans un style de June.</p>
        </div>
        <Button variant="primary" className="self-start sm:self-auto" icon={<Plus className="h-4 w-4" />} onClick={() => setDialog({ assets: [], style: null })}>
          Nouveau montage
        </Button>
      </header>

      {loading && !data ? (
        <ListSkeleton />
      ) : error && !data ? (
        <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="Montages indisponibles" action={<Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => void reload()}>Réessayer</Button>}>
          {error}
        </EmptyState>
      ) : montages.length === 0 ? (
        <EmptyState
          icon={<Clapperboard className="h-6 w-6" />}
          title="Aucun montage pour l'instant"
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setDialog({ assets: [], style: null })}>
              Nouveau montage
            </Button>
          }
        >
          Choisissez des photos et des vidéos, un style (Reel immersion, Reel accroche…) : Atelier les enchaîne en composition HyperFrames, que vous ajustez sur la timeline
          avant de la rendre en MP4, prête à programmer.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
          {montages.map((m) => (
            <li key={m.id} className="group relative">
              <Link
                href={`/montage/${m.id}`}
                className="block rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-chestnut focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                onContextMenu={(e) =>
                  menu.openAt(e, [
                    { label: "Ouvrir", icon: <ExternalLink />, onSelect: () => router.push(`/montage/${m.id}`) },
                    { label: "Dupliquer", icon: <Copy />, onSelect: () => void duplicate(m) },
                    "separator",
                    { label: "Supprimer", icon: <Trash2 />, danger: true, onSelect: () => setToDelete(m) },
                  ])
                }
              >
                <div className="relative aspect-[9/14] overflow-hidden rounded-[14px] bg-gradient-to-b from-[#e9d3b0] via-[#c98a3c] to-[#5a3a22] shadow-card transition-shadow duration-base group-hover:shadow-pop">
                  {m.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-surface/80">
                      <Clapperboard className="h-8 w-8" aria-hidden />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night/60 to-transparent" aria-hidden />
                  <span className="absolute left-2 top-2">
                    <Badge tone={m.status === "draft" ? "dark" : STATUS_TONE[m.status]}>{MONTAGE_STATUS_LABEL[m.status]}</Badge>
                  </span>
                  <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-surface">{FORMAT_LABEL[m.spec.format]}</span>
                  {m.durationS ? <span className="absolute bottom-2 right-2 rounded bg-night/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-surface">{formatDuration(m.durationS)}</span> : null}
                  {m.status === "rendering" && m.render?.progress != null ? (
                    <span className="absolute inset-x-2 bottom-8 h-1 overflow-hidden rounded-full bg-surface/40" aria-hidden>
                      <span className="block h-full rounded-full bg-honey" style={{ width: `${Math.round(m.render.progress * 100)}%` }} />
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 pr-8">
                  <p className="truncate text-[13.5px] font-semibold text-ink" title={m.title}>
                    {m.title}
                  </p>
                  <p className="truncate text-[12px] text-muted">
                    {m.styleName ?? "Sans style"} · {m.clipCount} plan{m.clipCount > 1 ? "s" : ""} · {formatRelative(m.updatedAt)}
                  </p>
                </div>
              </Link>
              <IconButton
                label={`Actions pour ${m.title}`}
                size="sm"
                className="absolute bottom-3 right-0"
                onClick={(e) =>
                  menu.openBelow(
                    e.currentTarget,
                    [
                      { label: "Ouvrir", icon: <ExternalLink />, onSelect: () => router.push(`/montage/${m.id}`) },
                      { label: "Dupliquer", icon: <Copy />, onSelect: () => void duplicate(m) },
                      "separator",
                      { label: "Supprimer", icon: <Trash2 />, danger: true, onSelect: () => setToDelete(m) },
                    ],
                    "right",
                  )
                }
              >
                <MoreHorizontal className="h-4 w-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <NewMontageDialog open={dialog !== null} onClose={closeDialog} initialAssetIds={dialog?.assets} initialStyle={dialog?.style ?? null} />
      <ConfirmDialog open={toDelete !== null} onClose={() => setToDelete(null)} onConfirm={() => toDelete && void remove(toDelete)} title={`Supprimer « ${toDelete?.title ?? ""} » ?`} confirmLabel="Supprimer" danger loading={deleting}>
        Le montage et ses réglages seront supprimés. Les médias et les vidéos déjà rendues restent dans la médiathèque.
      </ConfirmDialog>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]" aria-busy="true" aria-label="Chargement des montages">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i}>
          <div className="skeleton aspect-[9/14] rounded-[14px]" />
          <div className="skeleton mt-2 h-4 w-3/4" />
          <div className="skeleton mt-1.5 h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );
}

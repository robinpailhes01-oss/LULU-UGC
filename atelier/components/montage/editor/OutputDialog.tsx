"use client";

import Link from "next/link";
import { CalendarDays, Download, FolderOpen } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";
import { useResource } from "@/lib/client/use-resource";
import { formatBytes, formatDuration } from "@/lib/shared/format";
import type { Asset } from "@/lib/shared/types";

/** La vidéo rendue : lecture, téléchargement, emplacement dans la médiathèque, programmation. */
export function OutputDialog({ assetId, open, onClose }: { assetId: string | null; open: boolean; onClose: () => void }) {
  const { data: asset, loading, error } = useResource<Asset>(open && assetId ? `/api/assets/${assetId}` : null, ["assets"]);
  return (
    <Dialog open={open} onClose={onClose} title="Vidéo rendue" description={asset ? `${asset.name} · ${formatDuration(asset.durationS)} · ${formatBytes(asset.sizeBytes)}` : undefined} size="lg">
      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,260px)_1fr]">
        <div className="overflow-hidden rounded-xl bg-night">
          {asset ? (
            <video src={asset.urls.original} poster={asset.urls.poster ?? undefined} controls playsInline className="aspect-[9/16] h-full max-h-[62vh] w-full object-contain">
              <track kind="captions" />
            </video>
          ) : (
            <div className="flex aspect-[9/16] items-center justify-center text-surface">{loading ? <Spinner className="text-surface" /> : null}</div>
          )}
        </div>
        <div className="space-y-3 text-[13.5px]">
          {error ? <p className="text-terracotta">{error}</p> : null}
          <p className="leading-relaxed text-muted">La vidéo est rangée dans la médiathèque{asset?.folderId ? ", dans le dossier du premier plan" : ""}. Vous pouvez la programmer directement.</p>
          <div className="flex flex-col gap-2">
            <Link href={assetId ? `/programmation?nouveau=1&assets=${assetId}` : "/programmation"} className="inline-flex h-9 items-center gap-2 self-start rounded-full bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-[#3a2f26]">
              <CalendarDays className="h-4 w-4" aria-hidden /> Programmer
            </Link>
            <Link href={asset?.folderId ? `/mediatheque/dossier/${asset.folderId}` : "/mediatheque"} className="inline-flex h-9 items-center gap-2 self-start rounded-full border border-line-strong bg-surface px-4 text-[13.5px] font-semibold hover:bg-hover">
              <FolderOpen className="h-4 w-4" aria-hidden /> Ouvrir dans la médiathèque
            </Link>
            {asset ? (
              <a href={asset.urls.download} className="inline-flex h-9 items-center gap-2 self-start rounded-full px-4 text-[13.5px] font-semibold text-ink hover:bg-hover">
                <Download className="h-4 w-4" aria-hidden /> Télécharger le MP4
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

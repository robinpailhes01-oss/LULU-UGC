"use client";

import { useEffect, useState } from "react";
import { Check, Star, ZoomIn, ZoomOut } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cx } from "@/components/ui/cx";
import { dimensions, formatBytes, formatDate } from "@/lib/shared/format";
import type { Asset, CleanupGroup } from "@/lib/shared/types";

const ZOOM = 2.5;

/**
 * Comparaison côte à côte (2 à 4 photos) d'un groupe de doublons. Le zoom est synchronisé :
 * un clic agrandit toutes les images au même endroit, la souris (ou le doigt) déplace la loupe.
 */
export function CompareDialog({
  group,
  assets,
  open,
  onClose,
  onKeep,
}: {
  group: CleanupGroup | null;
  assets: Record<string, Asset>;
  open: boolean;
  onClose: () => void;
  /** Garde ce média et met les autres du groupe à la corbeille. */
  onKeep: (keepId: string) => void;
}) {
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [start, setStart] = useState(0);
  useEffect(() => {
    if (open) {
      setZoom(false);
      setStart(0);
    }
  }, [open, group?.id]);

  if (!group) return null;
  const list = group.assetIds.map((id) => assets[id]).filter(Boolean);
  const shown = list.slice(start, start + 4);

  const move = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin({ x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)), y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)) });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="full"
      title="Comparer"
      description={`${group.reason}. Cliquez sur une image pour zoomer partout au même endroit.`}
      footer={
        <>
          {list.length > 4 ? (
            <span className="mr-auto flex items-center gap-2 text-[12.5px] text-muted">
              {start + 1}–{Math.min(start + 4, list.length)} sur {list.length}
              <Button size="sm" variant="ghost" disabled={start === 0} onClick={() => setStart(Math.max(0, start - 4))}>
                Précédentes
              </Button>
              <Button size="sm" variant="ghost" disabled={start + 4 >= list.length} onClick={() => setStart(start + 4)}>
                Suivantes
              </Button>
            </span>
          ) : null}
          <Button variant="ghost" icon={zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />} onClick={() => setZoom(!zoom)}>
            {zoom ? "Vue d'ensemble" : "Zoomer"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </>
      }
    >
      <div className={cx("grid h-full min-h-[60vh] gap-3 p-3 sm:p-4", shown.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : shown.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4")}>
        {shown.map((a) => {
          const isKeep = a.id === group.keepId;
          return (
            <figure key={a.id} className={cx("flex min-h-0 flex-col overflow-hidden rounded-xl border bg-canvas", isKeep ? "border-olive/50" : "border-line")}>
              <button
                type="button"
                aria-label={zoom ? `Dézoomer ${a.name}` : `Zoomer sur ${a.name}`}
                onClick={(e) => {
                  if (!zoom) move(e as unknown as React.PointerEvent<HTMLElement>);
                  setZoom(!zoom);
                }}
                onPointerMove={zoom ? move : undefined}
                className={cx("relative min-h-[180px] flex-1 overflow-hidden bg-night/90", zoom ? "cursor-zoom-out" : "cursor-zoom-in")}
              >
                {a.kind === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.urls.original}
                    alt={a.ai?.alt ?? a.name}
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-contain transition-transform duration-base"
                    style={{ transform: zoom ? `scale(${ZOOM})` : "none", transformOrigin: `${origin.x}% ${origin.y}%` }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.urls.poster ?? a.urls.thumb ?? ""} alt={a.name} className="absolute inset-0 h-full w-full object-contain" />
                )}
                {isKeep ? (
                  <span className="absolute left-2 top-2">
                    <Badge tone="olive">
                      <Check className="h-3 w-3" aria-hidden /> Conseillée
                    </Badge>
                  </span>
                ) : null}
              </button>
              <figcaption className="space-y-2 border-t border-line bg-surface px-3 py-2.5">
                <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-ink" title={a.name}>
                  {a.starred ? <Star className="h-3.5 w-3.5 shrink-0 fill-honey text-honey" aria-label="Favori" /> : null}
                  <span className="truncate">{a.name}</span>
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11.5px] text-muted">
                  <dt className="sr-only">Dimensions</dt>
                  <dd>{dimensions(a.width, a.height) || "—"}</dd>
                  <dt className="sr-only">Taille</dt>
                  <dd className="text-right">{formatBytes(a.sizeBytes)}</dd>
                  <dt className="sr-only">Netteté</dt>
                  <dd>Netteté {a.blurScore !== null ? Math.round(a.blurScore).toLocaleString("fr-FR") : "—"}</dd>
                  <dt className="sr-only">Date</dt>
                  <dd className="text-right">{formatDate(a.takenAt ?? a.createdAt)}</dd>
                </dl>
                <Button size="sm" variant={isKeep ? "accent" : "secondary"} className="w-full" icon={<Check className="h-3.5 w-3.5" />} onClick={() => onKeep(a.id)}>
                  Garder celle-ci
                </Button>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </Dialog>
  );
}

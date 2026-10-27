"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Film, ImageOff, ImagePlus, Play, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { MediaPickerDialog } from "@/components/library/MediaPickerDialog";
import { Panel } from "@/components/skills/controls";
import { api } from "@/lib/client/api";
import { useRefresh } from "@/lib/client/refresh";
import { formatDuration } from "@/lib/shared/format";
import type { Asset, AssetPage } from "@/lib/shared/types";

type Entry = Asset | "missing";

/** Vidéos et photos modèles rattachées au skill (l'agent s'en inspire). */
export function ReferenceMedia({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  const toast = useToast();
  const [cache, setCache] = useState<Map<string, Entry>>(new Map());
  const [loadError, setLoadError] = useState(false);
  const [picking, setPicking] = useState(false);
  const [preview, setPreview] = useState<Asset | null>(null);
  const inflight = useRef(new Set<string>());

  const load = useCallback(async (wanted: string[]) => {
    const todo = wanted.filter((id) => !inflight.current.has(id));
    if (todo.length === 0) return;
    todo.forEach((id) => inflight.current.add(id));
    try {
      const page = await api.get<AssetPage>(`/api/assets?ids=${todo.map(encodeURIComponent).join(",")}&limit=${Math.max(todo.length, 1)}`);
      setCache((prev) => {
        const m = new Map(prev);
        for (const id of todo) m.set(id, page.items.find((a) => a.id === id) ?? "missing");
        return m;
      });
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      todo.forEach((id) => inflight.current.delete(id));
    }
  }, []);

  useEffect(() => {
    const unknown = ids.filter((id) => !cache.has(id));
    if (unknown.length) void load(unknown);
  }, [ids, cache, load]);

  useRefresh(["assets"], () => {
    if (ids.length) void load(ids);
  });

  function remove(id: string) {
    const before = ids;
    onChange(ids.filter((x) => x !== id));
    const a = cache.get(id);
    toast(`${a && a !== "missing" ? `« ${a.ai?.title ?? a.name} »` : "Média"} retiré des références`, { action: { label: "Annuler", onClick: () => onChange(before) } });
  }

  return (
    <Panel
      title="Médias de référence"
      description="Des vidéos ou photos modèles : l'agent s'en inspire pour appliquer ce skill."
      icon={<Film />}
      actions={
        <Button size="sm" icon={<ImagePlus className="h-4 w-4" />} onClick={() => setPicking(true)}>
          Ajouter
        </Button>
      }
    >
      {ids.length === 0 ? (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-muted transition-colors hover:border-chestnut hover:bg-hover hover:text-ink"
        >
          <ImagePlus className="h-5 w-5 text-chestnut" aria-hidden />
          Choisir dans la médiathèque
          <span className="text-[12px] text-faint">Un Reel qui a bien marché, une ambiance à retrouver, une référence d'un autre studio…</span>
        </button>
      ) : (
        <>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2.5">
            {ids.map((id) => {
              const a = cache.get(id);
              return (
                <li key={id} className="group relative">
                  {a === undefined ? (
                    <div className="skeleton aspect-[4/5] w-full rounded-lg" />
                  ) : a === "missing" ? (
                    <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong bg-sunken/50 px-2 text-center text-[11px] text-muted">
                      <ImageOff className="h-4 w-4" aria-hidden />
                      Introuvable ou à la corbeille
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreview(a)}
                      className="relative block aspect-[4/5] w-full overflow-hidden rounded-lg bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chestnut focus-visible:ring-offset-2"
                      aria-label={`Voir ${a.ai?.title ?? a.name}`}
                    >
                      {a.urls.thumb || a.urls.poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.urls.thumb ?? a.urls.poster ?? ""} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-base group-hover:scale-[1.03]" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-faint">{a.kind === "video" ? <Film className="h-5 w-5" /> : <ImageOff className="h-5 w-5" />}</span>
                      )}
                      {a.kind === "video" ? (
                        <>
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-night/55 text-surface backdrop-blur-sm">
                              <Play className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden />
                            </span>
                          </span>
                          {a.durationS ? <span className="absolute bottom-1 right-1 rounded bg-night/70 px-1 text-[10.5px] font-semibold text-surface">{formatDuration(a.durationS)}</span> : null}
                        </>
                      ) : null}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    aria-label={`Retirer ${a && a !== "missing" ? a.ai?.title ?? a.name : "ce média"} des références`}
                    title="Retirer"
                    className={cx(
                      "absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/95 text-ink shadow-card transition-opacity hover:text-terracotta focus-visible:opacity-100",
                      "opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100",
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {a && a !== "missing" ? (
                    <p className="mt-1 truncate text-[11.5px] text-muted" title={a.name}>
                      {a.ai?.title ?? a.name}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {loadError ? <p className="mt-2 text-[12px] text-terracotta">Les aperçus n'ont pas pu être chargés.</p> : null}
        </>
      )}

      <MediaPickerDialog
        open={picking}
        onClose={() => setPicking(false)}
        title="Ajouter des médias de référence"
        kinds={["photo", "video"]}
        confirmLabel="Ajouter aux références"
        onPick={(assets) => {
          const fresh = assets.filter((a) => !ids.includes(a.id));
          if (fresh.length === 0) return;
          setCache((prev) => {
            const m = new Map(prev);
            for (const a of fresh) m.set(a.id, a);
            return m;
          });
          onChange([...ids, ...fresh.map((a) => a.id)]);
          toast(fresh.length > 1 ? `${fresh.length} médias ajoutés aux références` : "Média ajouté aux références");
        }}
      />

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.ai?.title ?? preview?.name} size="xl" dark>
        {preview ? (
          <div className="flex max-h-[78vh] items-center justify-center bg-night p-3">
            {preview.kind === "video" ? (
              <video key={preview.id} src={preview.urls.original} poster={preview.urls.poster ?? undefined} controls autoPlay playsInline className="max-h-[74vh] max-w-full rounded-lg">
                <track kind="captions" />
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.urls.original} alt={preview.ai?.alt ?? preview.name} className="max-h-[74vh] max-w-full rounded-lg object-contain" />
            )}
          </div>
        ) : null}
      </Dialog>
    </Panel>
  );
}

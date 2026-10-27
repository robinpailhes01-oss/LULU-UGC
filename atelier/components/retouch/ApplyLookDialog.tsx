"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Slider } from "@/components/ui/Slider";
import { useToast } from "@/components/ui/Toast";
import { LookStrip } from "@/components/retouch/LookStrip";
import { api, errorMessage, qs } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { loadImageElement, renderLookThumbnails } from "@/lib/client/retouch/source";
import { useResource } from "@/lib/client/use-resource";
import { plural } from "@/lib/shared/format";
import { NEUTRAL_PARAMS, applyLook } from "@/lib/shared/look";
import type { Asset, AssetPage, Look } from "@/lib/shared/types";

function isHeic(a: Asset): boolean {
  return /image\/hei[cf]/i.test(a.mime) || /\.(heic|heif)$/i.test(a.name);
}

interface BatchResult {
  created: Asset[];
  errors: { id: string; name: string | null; message: string }[];
  lookName: string | null;
}

/**
 * Fenêtre « Appliquer un look » sur une sélection de photos : crée une nouvelle version retouchée
 * à côté de chaque original (les originaux ne changent pas). Vignettes = première photo avec chaque look.
 */
export function ApplyLookDialog({
  open,
  onClose,
  assetIds,
  initialLookId,
  initialIntensity,
}: {
  open: boolean;
  onClose: () => void;
  assetIds: string[];
  /** Look présélectionné (depuis l'éditeur). */
  initialLookId?: string | null;
  initialIntensity?: number;
}) {
  const toast = useToast();
  const idsKey = assetIds.join(",");
  const assetsRes = useResource<AssetPage>(open && assetIds.length ? `/api/assets${qs({ ids: assetIds, limit: 1000 })}` : null, ["assets"]);
  const looksRes = useResource<{ looks: Look[] }>(open ? "/api/looks" : null, ["looks"]);
  const looks = looksRes.data?.looks;
  const [lookId, setLookId] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(1);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errors, setErrors] = useState<BatchResult["errors"]>([]);
  const stop = useRef(false);

  const photos = useMemo(() => {
    const byId = new Map((assetsRes.data?.items ?? []).map((a) => [a.id, a]));
    return assetIds.map((id) => byId.get(id)).filter((a): a is Asset => Boolean(a && a.kind === "photo" && a.status === "ready" && !isHeic(a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetsRes.data, idsKey]);
  const ignored = assetsRes.data ? assetIds.length - photos.length : 0;
  // Vignettes : première photo qui a un aperçu.
  const first = photos.find((p) => p.urls.thumb) ?? photos[0];
  const [summary, setSummary] = useState<{ created: Asset[]; lookName: string } | null>(null);

  // Réinitialise à l'ouverture.
  useEffect(() => {
    if (!open) return;
    setLookId(initialLookId ?? null);
    setIntensity(initialIntensity ?? 1);
    setErrors([]);
    setSummary(null);
    setProgress({ done: 0, total: 0 });
    stop.current = false;
  }, [open, initialLookId, initialIntensity]);

  // Choisit « June doré » par défaut.
  useEffect(() => {
    if (open && !lookId && looks?.length) setLookId(looks[0].id);
  }, [open, lookId, looks]);

  // Vignettes de la première photo avec chaque look.
  const lookKey = looks?.map((l) => `${l.id}:${JSON.stringify(l.params)}`).join("|") ?? "";
  const thumbUrl = first?.urls.thumb ?? first?.urls.original ?? null;
  useEffect(() => {
    if (!open || !thumbUrl || !looks) return;
    let alive = true;
    (async () => {
      try {
        const img = await loadImageElement(thumbUrl);
        const t = await renderLookThumbnails(
          img,
          looks.map((l) => ({ id: l.id, params: applyLook(NEUTRAL_PARAMS, l.params, 1) })),
          88,
        );
        if (alive) setThumbs(Object.keys(t).length ? t : Object.fromEntries(looks.map((l) => [l.id, thumbUrl])));
      } catch {
        if (alive) setThumbs(Object.fromEntries(looks.map((l) => [l.id, thumbUrl])));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, thumbUrl, lookKey]);

  const look = looks?.find((l) => l.id === lookId) ?? null;

  async function run() {
    if (!look || photos.length === 0 || running) return;
    setRunning(true);
    setErrors([]);
    stop.current = false;
    const created: Asset[] = [];
    const failed: BatchResult["errors"] = [];
    setProgress({ done: 0, total: photos.length });
    for (const [i, photo] of photos.entries()) {
      if (stop.current) break;
      try {
        // Une photo par appel : la progression est réelle et une erreur n'arrête pas le lot.
        const r = await api.post<BatchResult>("/api/retouch/batch", { assetIds: [photo.id], lookId: look.id, intensity });
        created.push(...r.created);
        failed.push(...r.errors);
      } catch (err) {
        failed.push({ id: photo.id, name: photo.name, message: errorMessage(err) });
      }
      setProgress({ done: i + 1, total: photos.length });
    }
    setRunning(false);
    if (created.length > 0) emitRefresh("assets", "stats");
    setErrors(failed);
    if (created.length === 0) return;
    if (failed.length > 0) {
      // La fenêtre reste ouverte pour lire les erreurs ; le bilan (et « Annuler ») s'affiche à la fermeture.
      setSummary({ created, lookName: look.name });
      return;
    }
    announce(created, look.name, 0);
    onClose();
  }

  function announce(created: Asset[], lookName: string, failures: number) {
    const ids = created.map((a) => a.id);
    toast(
      `${plural(created.length, "version créée", "versions créées")} avec « ${lookName} »${failures ? ` · ${plural(failures, "échec")}` : ""}`,
      {
        tone: failures ? "info" : "success",
        durationMs: 8000,
        action: {
          label: "Annuler",
          onClick: () => {
            api
              .post("/api/assets/bulk", { ids, op: { action: "trash" } })
              .then(() => {
                emitRefresh("assets", "stats");
                toast(`${plural(ids.length, "version")} mise${ids.length > 1 ? "s" : ""} à la corbeille`, { tone: "info" });
              })
              .catch((err) => toast(errorMessage(err), { tone: "error" }));
          },
        },
      },
    );
  }

  function close() {
    if (running) {
      stop.current = true;
      return;
    }
    if (summary) announce(summary.created, summary.lookName, errors.length);
    onClose();
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Appliquer un look"
      description={assetsRes.data ? `${plural(photos.length, "photo")} · une nouvelle version à côté de chaque original` : "Chargement de la sélection…"}
      size="lg"
      footer={
        <>
          {summary ? (
            <Button variant="primary" onClick={close}>
              Fermer
            </Button>
          ) : (
            <>
              {running ? (
                <Button variant="ghost" onClick={() => (stop.current = true)}>
                  Arrêter
                </Button>
              ) : (
                <Button variant="ghost" onClick={onClose}>
                  Annuler
                </Button>
              )}
              <Button variant="primary" loading={running} disabled={!look || photos.length === 0 || running} onClick={() => void run()}>
                {photos.length > 0 ? `Appliquer à ${plural(photos.length, "photo")}` : "Appliquer"}
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-5 px-5 py-4">
        {assetsRes.error ? (
          <p className="rounded-lg bg-terracotta-soft px-3 py-2 text-[13px] text-terracotta">
            La sélection n&apos;a pas pu être chargée.{" "}
            <button type="button" className="font-semibold underline" onClick={() => void assetsRes.reload()}>
              Réessayer
            </button>
          </p>
        ) : null}
        {ignored > 0 ? (
          <p className="flex items-start gap-2 rounded-lg bg-honey-soft/70 px-3 py-2 text-[13px] text-[#6b4a1f]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {plural(ignored, "média ignoré", "médias ignorés")} : les looks s&apos;appliquent aux photos JPEG, PNG ou WebP (pour une vidéo, passez par le montage ; une photo HEIC doit d&apos;abord être convertie en JPEG).
          </p>
        ) : null}
        {assetsRes.data && photos.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] text-muted">Aucune photo dans la sélection.</p>
        ) : (
          <>
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink">Look</p>
              <LookStrip
                layout="grid"
                hideOriginal
                looks={looks}
                error={looksRes.error}
                onRetry={() => void looksRes.reload()}
                thumbs={thumbs}
                selectedId={lookId}
                onSelect={(l) => l && !running && setLookId(l.id)}
              />
            </div>
            <Slider label="Intensité du look" value={Math.round(intensity * 100)} min={0} max={100} neutral={100} format={(v) => `${v} %`} onChange={(v) => setIntensity(v / 100)} />
            <div className="rounded-lg bg-sunken/70 px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">Sortie :</span> une nouvelle version JPEG pleine résolution, rangée à côté de chaque original et nommée « … – {look?.name ?? "look"} ». Les originaux ne sont pas modifiés ; une photo déjà retouchée repart de son original en gardant son recadrage.
            </div>
          </>
        )}
        {running || progress.done > 0 ? (
          <div aria-live="polite">
            <div className="mb-1.5 flex justify-between text-[12.5px]">
              <span className="text-ink">{running ? `Retouche de la photo ${Math.min(progress.done + 1, progress.total)} sur ${progress.total}…` : stop.current && progress.done < progress.total ? "Arrêté" : "Terminé"}</span>
              <span className="tabular-nums text-muted">{pct} %</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progression">
              <div className="h-full rounded-full bg-honey transition-[width] duration-base" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : null}
        {summary ? (
          <p className="text-[13px] font-semibold text-ink">
            {plural(summary.created.length, "version créée", "versions créées")} · {plural(errors.length, "échec")}
          </p>
        ) : null}
        {errors.length > 0 ? (
          <ul className="space-y-1 rounded-lg bg-terracotta-soft px-3 py-2 text-[12.5px] text-terracotta">
            {errors.map((e) => (
              <li key={e.id}>
                <span className="font-semibold">{e.name ?? "Photo"}</span> : {e.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Dialog>
  );
}

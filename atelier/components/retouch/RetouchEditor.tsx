"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Clapperboard, Columns2, Crop, ImageOff, Music, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMenu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { useScreenContext } from "@/components/shell/ShellContext";
import { MediaPickerDialog } from "@/components/library/MediaPickerDialog";
import { AdjustPanel } from "@/components/retouch/AdjustPanel";
import { ApplyLookDialog } from "@/components/retouch/ApplyLookDialog";
import { PreviewCanvas, type ZoomMode } from "@/components/retouch/PreviewCanvas";
import { SaveLookDialog } from "@/components/retouch/SaveLookDialog";
import { ApiError, api, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { useHistory } from "@/lib/client/retouch/history";
import { webgl2Available } from "@/lib/client/retouch/renderer";
import { PREVIEW_MAX, decodePhoto, fetchOriginal, renderLookThumbnails, type PhotoSource } from "@/lib/client/retouch/source";
import { useResource } from "@/lib/client/use-resource";
import { dimensions } from "@/lib/shared/format";
import {
  LOOK_KEYS,
  NEUTRAL_PARAMS,
  applyLook,
  aspectRatioOf,
  computeOutputGeometry,
  fitCropToAspect,
  lookToSvgFilter,
  paramsEqual,
  sanitizeParams,
  type LookKey,
} from "@/lib/shared/look";
import type { Asset, AspectPreset, CropRect, Look, RetouchParams } from "@/lib/shared/types";

interface EditorState {
  params: RetouchParams;
  lookId: string | null;
  intensity: number;
}

const stateEqual = (a: EditorState, b: EditorState) => a.lookId === b.lookId && Math.abs(a.intensity - b.intensity) < 1e-9 && paramsEqual(a.params, b.params);

const AUTO_KEYS: LookKey[] = ["exposure", "contrast", "highlights", "shadows", "whites", "blacks", "temperature", "tint", "vibrance"];

const EXPORT_SIZES: { value: number | null; label: string }[] = [
  { value: null, label: "Pleine résolution" },
  { value: 3840, label: "Grand · 3 840 px" },
  { value: 2048, label: "Web · 2 048 px" },
  { value: 1080, label: "Réseaux · 1 080 px" },
];

export function folderHref(folderId: string | null): string {
  return folderId ? `/mediatheque/dossier/${folderId}` : "/mediatheque";
}

function baseName(name: string): string {
  return name.replace(/\.[a-z0-9]{1,8}$/i, "").replace(/ \(retouche\)$/, "").trim() || "Photo";
}

function isHeic(a: Asset): boolean {
  return /image\/hei[cf]/i.test(a.mime) || /\.(heic|heif)$/i.test(a.name);
}

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.tagName === "INPUT") {
    const type = (el as HTMLInputElement).type;
    return type !== "range" && type !== "checkbox" && type !== "radio" && type !== "button";
  }
  return Boolean(el.closest("dialog[open]"));
}

/** Éditeur de retouche non destructive (/retouche/[id]). */
export function RetouchEditor({ assetId }: { assetId: string }) {
  useScreenContext({ page: "retouche", selectedAssetIds: [assetId] });
  const assetRes = useResource<Asset>(`/api/assets/${assetId}`, ["assets"]);
  const asset = assetRes.data;
  const parentId = asset && asset.source === "retouch" && asset.edit && asset.parentAssetId ? asset.parentAssetId : null;
  const parentRes = useResource<Asset>(parentId ? `/api/assets/${parentId}` : null, ["assets"]);

  if (!asset) {
    if (assetRes.error) {
      return (
        <EmptyState
          icon={<ImageOff className="h-6 w-6" />}
          title={assetRes.error.includes("introuvable") ? "Photo introuvable" : "La photo n'a pas pu être ouverte"}
          action={
            <div className="flex gap-2">
              <Link href="/mediatheque" className="inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-3.5 text-[13.5px] font-semibold hover:bg-hover">
                Retour à la médiathèque
              </Link>
              {!assetRes.error.includes("introuvable") ? (
                <Button variant="primary" onClick={() => void assetRes.reload()}>
                  Réessayer
                </Button>
              ) : null}
            </div>
          }
        >
          {assetRes.error}
        </EmptyState>
      );
    }
    return <EditorSkeleton />;
  }
  if (asset.kind !== "photo") {
    const video = asset.kind === "video";
    return (
      <div className="flex h-full flex-col">
        <EditorTopBarShell asset={asset} />
        <EmptyState
          icon={video ? <Clapperboard className="h-6 w-6" /> : <Music className="h-6 w-6" />}
          title={video ? "Les vidéos se travaillent au montage" : "Rien à retoucher ici"}
          action={
            video ? (
              <Link href="/montage" className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-[#3a2f26]">
                Ouvrir le montage
              </Link>
            ) : null
          }
        >
          {video
            ? "La retouche s'applique aux photos. Pour une vidéo, ouvrez le montage : vous pourrez y poser le même look « June » sur tous vos plans."
            : "La retouche s'applique aux photos uniquement."}
        </EmptyState>
      </div>
    );
  }
  if (parentId && !parentRes.data && !parentRes.error) return <EditorSkeleton />;
  const parent = parentId && parentRes.data && parentRes.data.kind === "photo" && !parentRes.data.trashedAt ? parentRes.data : null;
  const base = parent ?? asset;
  const initial = parent ? sanitizeParams(asset.edit) : { ...NEUTRAL_PARAMS };
  return <Editor key={`${asset.id}:${base.id}`} asset={asset} base={base} initialParams={initial} parentMissing={Boolean(parentId && !parent)} />;
}

function EditorTopBarShell({ asset }: { asset: Asset }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-canvas px-3 sm:px-4">
      <Link href={folderHref(asset.folderId)} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] font-semibold text-muted hover:bg-hover hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Médiathèque
      </Link>
      <span className="truncate text-[13.5px] font-semibold text-ink">{asset.name}</span>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Chargement de la retouche">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-4">
        <div className="skeleton h-5 w-28" />
        <div className="skeleton h-5 w-44" />
        <div className="ml-auto flex gap-2">
          <div className="skeleton h-8 w-8 rounded-full" />
          <div className="skeleton h-8 w-8 rounded-full" />
          <div className="skeleton h-8 w-36 rounded-full" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-[40vh] flex-1 items-center justify-center bg-[#E4DBCD] p-8">
          <div className="skeleton aspect-[4/3] w-full max-w-3xl rounded-none" />
        </div>
        <div className="space-y-5 border-line bg-surface p-4 lg:w-[320px] lg:border-l">
          <div className="flex gap-2.5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-[68px] w-[68px] rounded-xl" />
            ))}
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-1.5 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Editor({ asset, base, initialParams, parentMissing }: { asset: Asset; base: Asset; initialParams: RetouchParams; parentMissing: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const menu = useMenu();
  const history = useHistory<EditorState>({ params: initialParams, lookId: null, intensity: 1 }, stateEqual);
  const { params, lookId, intensity } = history.value;
  // Fonctions stables de l'historique (l'objet `history` change à chaque rendu).
  const { set: hSet, commit: hCommit, undo: hUndo, redo: hRedo } = history;
  const looksRes = useResource<{ looks: Look[] }>("/api/looks", ["looks"]);
  const looks = looksRes.data?.looks;
  const looksRef = useRef(looks);
  looksRef.current = looks;

  const heic = isHeic(base);
  const [glMode, setGlMode] = useState<"webgl" | "fallback">("webgl");
  const [source, setSource] = useState<PhotoSource | null>(null);
  const [hiSource, setHiSource] = useState<PhotoSource | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const blobRef = useRef<Blob | null>(null);
  const [zoom, setZoom] = useState<ZoomMode>("fit");
  const [cropMode, setCropMode] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [exportSize, setExportSize] = useState<number | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [pickOthers, setPickOthers] = useState(false);
  const [applyIds, setApplyIds] = useState<string[] | null>(null);
  const [hiLoading, setHiLoading] = useState(false);
  const [compact, setCompact] = useState(false);

  // Mise en page mobile (feuille de réglages sous l'aperçu).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!webgl2Available()) setGlMode("fallback");
  }, []);

  // Photo de l'aperçu (2048 px).
  useEffect(() => {
    if (heic || glMode === "fallback") return;
    const ctrl = new AbortController();
    let alive = true;
    setSourceError(null);
    (async () => {
      try {
        const blob = await fetchOriginal(base.urls.original, ctrl.signal);
        blobRef.current = blob;
        const src = await decodePhoto(blob, PREVIEW_MAX, { width: base.width, height: base.height });
        if (alive) setSource(src);
        else src.bitmap.close();
      } catch (err) {
        if (alive && (err as Error).name !== "AbortError") setSourceError(errorMessage(err));
      }
    })();
    return () => {
      alive = false;
      ctrl.abort();
    };
    // L'URL change à chaque mise à jour du média : seul l'identifiant compte ici.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.id, heic, glMode, reloadKey]);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Pleine définition, chargée une fois à la demande pour le zoom 100 %.
  const hiRequested = useRef(false);
  useEffect(() => {
    if (zoom !== "100" || !source || hiSource || hiRequested.current || !blobRef.current) return;
    if (Math.max(source.naturalWidth, source.naturalHeight) <= Math.max(source.width, source.height)) return;
    hiRequested.current = true;
    setHiLoading(true);
    const max = window.innerWidth < 768 ? 4096 : 8192;
    decodePhoto(blobRef.current, max, { width: source.naturalWidth, height: source.naturalHeight })
      .then((hi) => {
        if (mounted.current) setHiSource(hi);
        else hi.bitmap.close();
      })
      .catch(() => {
        hiRequested.current = false;
        if (mounted.current) toast("La pleine définition n'a pas pu être chargée : aperçu réduit conservé.", { tone: "info" });
      })
      .finally(() => {
        if (mounted.current) setHiLoading(false);
      });
  }, [zoom, source, hiSource, toast]);

  // Libère la mémoire graphique en quittant l'éditeur.
  const sourcesRef = useRef<(PhotoSource | null)[]>([]);
  sourcesRef.current = [source, hiSource];
  useEffect(() => () => sourcesRef.current.forEach((s) => s?.bitmap.close()), []);

  const displaySource = hiSource ?? source;
  const natW = displaySource?.naturalWidth ?? base.width ?? 0;
  const natH = displaySource?.naturalHeight ?? base.height ?? 0;
  const geometry = useMemo(() => (natW && natH ? computeOutputGeometry(natW, natH, params) : null), [natW, natH, params]);
  const ratio = geometry ? aspectRatioOf(params.aspect, geometry.rotW, geometry.rotH) : null;

  // Version retouchée : retrouve le look d'origine si les réglages correspondent exactement.
  const inferred = useRef(false);
  useEffect(() => {
    if (inferred.current || !looks) return;
    inferred.current = true;
    if (history.canUndo || history.value.lookId) return;
    const p = history.value.params;
    const match = looks.find((l) => {
      const q = applyLook(p, l.params, 1);
      return LOOK_KEYS.every((k) => Math.abs(q[k] - p[k]) < 1e-6);
    });
    if (match) history.reset({ ...history.value, lookId: match.id, intensity: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [looks]);

  // Vignettes des looks sur cette photo.
  const lookKey = looks?.map((l) => `${l.id}:${JSON.stringify(l.params)}`).join("|") ?? "";
  useEffect(() => {
    if (!source || !looks) return;
    let alive = true;
    const list = [{ id: "original", params: { ...NEUTRAL_PARAMS } }, ...looks.map((l) => ({ id: l.id, params: applyLook(NEUTRAL_PARAMS, l.params, 1) }))];
    renderLookThumbnails(source.bitmap, list, 68)
      .then((t) => alive && setThumbs(t))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, lookKey]);
  const stripThumbs = useMemo(() => {
    if (glMode === "webgl" || !base.urls.thumb) return thumbs;
    const t: Record<string, string> = { original: base.urls.thumb };
    for (const l of looks ?? []) t[l.id] = base.urls.thumb;
    return t;
  }, [glMode, thumbs, base.urls.thumb, looks]);

  // ---------------------------------------------------------------------------------------------
  // Modifications

  const change = useCallback(
    (patch: Partial<RetouchParams>, commit: boolean) => {
      const fn = (s: EditorState) => ({ ...s, params: { ...s.params, ...patch } });
      if (commit) hCommit(fn);
      else hSet(fn);
    },
    [hCommit, hSet],
  );

  const selectLook = useCallback(
    (look: Look | null) => {
      hCommit((s) => ({ params: applyLook(s.params, look?.params ?? {}, 1), lookId: look?.id ?? null, intensity: 1 }));
    },
    [hCommit],
  );

  const setIntensity = useCallback(
    (t: number, commit: boolean) => {
      const fn = (s: EditorState): EditorState => {
        const look = looksRef.current?.find((l) => l.id === s.lookId);
        if (!look) return s;
        const d = t - s.intensity;
        const p = { ...s.params };
        for (const k of LOOK_KEYS) {
          const v = look.params[k];
          if (typeof v === "number") p[k] = p[k] + (v - NEUTRAL_PARAMS[k]) * d;
        }
        return { ...s, params: sanitizeParams(p), intensity: t };
      };
      if (commit) hCommit(fn);
      else hSet(fn);
    },
    [hCommit, hSet],
  );

  const resetAll = useCallback(() => {
    hCommit({ params: { ...NEUTRAL_PARAMS }, lookId: null, intensity: 1 });
    setCropMode(false);
    toast("Réglages réinitialisés", { tone: "info", action: { label: "Annuler", onClick: () => hUndo() } });
  }, [hCommit, hUndo, toast]);

  const resetSection = useCallback(
    (keys: LookKey[]) => {
      hCommit((s) => {
        const p = { ...s.params };
        for (const k of keys) p[k] = NEUTRAL_PARAMS[k];
        return { ...s, params: p };
      });
    },
    [hCommit],
  );

  async function runAuto() {
    if (autoLoading) return;
    setAutoLoading(true);
    try {
      const { params: sugg } = await api.post<{ params: Partial<RetouchParams> }>(`/api/retouch/${base.id}/auto`);
      hCommit((s) => {
        const look = looksRef.current?.find((l) => l.id === s.lookId);
        const p = { ...s.params };
        // Auto = look choisi + corrections propres à cette photo (relancer donne le même résultat).
        for (const k of AUTO_KEYS) {
          const lv = look?.params[k];
          const lookPart = typeof lv === "number" ? NEUTRAL_PARAMS[k] + (lv - NEUTRAL_PARAMS[k]) * s.intensity : NEUTRAL_PARAMS[k];
          p[k] = lookPart + (sugg[k] ?? 0);
        }
        return { ...s, params: sanitizeParams(p) };
      });
      const n = Object.keys(sugg).length;
      toast(n ? "Réglages automatiques appliqués" : "Cette photo est déjà bien équilibrée", { tone: n ? "success" : "info", action: n ? { label: "Annuler", onClick: () => hUndo() } : undefined });
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setAutoLoading(false);
    }
  }

  // Recadrage
  const setAspect = useCallback(
    (a: AspectPreset) => {
      hCommit((s) => {
        const g = computeOutputGeometry(natW || 1, natH || 1, s.params);
        const r = aspectRatioOf(a, g.rotW, g.rotH);
        let crop: CropRect | null = g.crop;
        if (r) {
          // Le plus grand cadre au nouveau format, centré sur le cadre actuel.
          const full = fitCropToAspect(null, r, g.rotW, g.rotH);
          const cx = g.crop.x + g.crop.w / 2;
          const cy = g.crop.y + g.crop.h / 2;
          crop = { ...full, x: Math.min(1 - full.w, Math.max(0, cx - full.w / 2)), y: Math.min(1 - full.h, Math.max(0, cy - full.h / 2)) };
        }
        if (crop && crop.w > 0.9999 && crop.h > 0.9999) crop = null;
        return { ...s, params: { ...s.params, aspect: a, crop } };
      });
      setCropMode(true);
    },
    [hCommit, natW, natH],
  );

  const rotate = useCallback(() => hCommit((s) => ({ ...s, params: { ...s.params, rotate: ((s.params.rotate + 90) % 360) as RetouchParams["rotate"], crop: null } })), [hCommit]);
  const flip = useCallback(
    () =>
      hCommit((s) => {
        // Image en miroir de l'aperçu actuel : cadre symétrique et angle de redressement opposé.
        const c = s.params.crop;
        return { ...s, params: { ...s.params, flipH: !s.params.flipH, straighten: -s.params.straighten, crop: c ? { ...c, x: 1 - c.x - c.w } : null } };
      }),
    [hCommit],
  );
  const resetFrame = useCallback(() => hCommit((s) => ({ ...s, params: { ...s.params, rotate: 0, flipH: false, straighten: 0, aspect: "original", crop: null } })), [hCommit]);
  const onCropChange = useCallback(
    (crop: CropRect, commit: boolean) => {
      const c = crop.w > 0.9999 && crop.h > 0.9999 ? null : crop;
      const fn = (s: EditorState) => ({ ...s, params: { ...s.params, crop: c } });
      if (commit) hCommit(fn);
      else hSet(fn);
    },
    [hCommit, hSet],
  );

  // Looks enregistrés
  async function deleteLook(look: Look) {
    try {
      await api.del(`/api/looks/${look.id}`);
      looksRes.mutate((prev) => ({ looks: (prev?.looks ?? []).filter((l) => l.id !== look.id) }));
      emitRefresh("looks");
      if (lookId === look.id) hCommit((s) => ({ ...s, lookId: null, intensity: 1 }));
      toast(`Look « ${look.name} » supprimé`, {
        action: {
          label: "Annuler",
          onClick: () => {
            api
              .post<Look>("/api/looks", { name: look.name, params: look.params })
              .then(() => emitRefresh("looks"))
              .catch((err) => toast(errorMessage(err), { tone: "error" }));
          },
        },
      });
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    }
  }

  // Export
  const canExport = !heic && !asset.trashedAt && !exporting;
  const exportCopy = useCallback(async () => {
    if (!canExport) return;
    setExporting(true);
    try {
      const look = looksRef.current?.find((l) => l.id === lookId);
      const name = look ? `${baseName(base.name)} – ${look.name}` : undefined;
      const created = await api.post<Asset>(`/api/retouch/${base.id}/export`, { params, options: { name, maxSize: exportSize, folderId: asset.folderId } });
      emitRefresh("assets", "stats");
      toast(`Copie enregistrée : « ${created.name} »`, { durationMs: 8000, action: { label: "Ouvrir", onClick: () => router.push(folderHref(created.folderId)) } });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : `L'export a échoué : ${errorMessage(err)}`, { tone: "error" });
    } finally {
      setExporting(false);
    }
  }, [canExport, lookId, base.name, base.id, params, exportSize, asset.folderId, toast, router]);

  // Raccourcis clavier
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) hRedo();
        else hUndo();
      } else if (mod && key === "y") {
        e.preventDefault();
        hRedo();
      } else if (mod && key === "s") {
        e.preventDefault();
        void exportCopy();
      } else if (e.key === "\\" && !mod) {
        e.preventDefault();
        setBypass(true);
      } else if (!mod && !e.altKey && key === "c" && !(e.target instanceof HTMLButtonElement && e.target.getAttribute("role") === "radio")) {
        setCropMode((v) => !v);
      } else if (!mod && key === "z") {
        setZoom((z) => (z === "fit" ? "100" : "fit"));
      } else if (cropMode && (e.key === "Escape" || (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)))) {
        e.preventDefault();
        setCropMode(false);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "\\") setBypass(false);
    };
    const blur = () => setBypass(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [hUndo, hRedo, exportCopy, cropMode]);

  const look = looks?.find((l) => l.id === lookId) ?? null;
  const outSize = geometry ? (exportSize && Math.max(geometry.width, geometry.height) > exportSize ? scaleLabel(geometry.width, geometry.height, exportSize) : dimensions(geometry.width, geometry.height)) : "";
  const fallbackFilter = useMemo(() => (glMode === "fallback" ? lookToSvgFilter("rt-fallback", params) : ""), [glMode, params]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Barre du haut */}
      <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-line bg-canvas px-2 sm:gap-2 sm:px-3">
        <Link
          href={folderHref(asset.folderId)}
          aria-label="Retour à la médiathèque"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] font-semibold text-muted hover:bg-hover hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">Médiathèque</span>
        </Link>
        <span className="hidden h-5 w-px bg-line md:block" aria-hidden />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate text-[13.5px] font-semibold text-ink" title={asset.name}>
            {asset.name}
          </h1>
          {look ? (
            <Badge tone="honey" className="hidden shrink-0 sm:inline-flex">
              {look.name}
              {intensity < 0.995 ? ` · ${Math.round(intensity * 100)} %` : ""}
            </Badge>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <IconButton label="Annuler (Ctrl+Z)" onClick={hUndo} disabled={!history.canUndo}>
            <Undo2 className="h-4 w-4" />
          </IconButton>
          <IconButton label="Rétablir (Ctrl+Maj+Z)" onClick={hRedo} disabled={!history.canRedo}>
            <Redo2 className="h-4 w-4" />
          </IconButton>
          <button
            type="button"
            aria-pressed={bypass}
            title="Maintenir pour voir l'original (touche \)"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setBypass(true);
            }}
            onPointerUp={() => setBypass(false)}
            onPointerCancel={() => setBypass(false)}
            onLostPointerCapture={() => setBypass(false)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setBypass(true);
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") setBypass(false);
            }}
            onContextMenu={(e) => e.preventDefault()}
            className={cx(
              "inline-flex h-9 select-none items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold transition-colors [-webkit-touch-callout:none]",
              bypass ? "bg-ink text-surface" : "text-ink hover:bg-hover",
            )}
          >
            <Columns2 className="h-4 w-4" aria-hidden />
            <span className="hidden lg:inline">Avant / Après</span>
            <span className="sr-only lg:hidden">Avant / Après</span>
          </button>
          <Button variant="ghost" size="md" className="px-2.5" icon={<RotateCcw className="h-4 w-4" aria-hidden />} onClick={resetAll} title="Réinitialiser tous les réglages" aria-label="Réinitialiser">
            <span className="hidden xl:inline">Réinitialiser</span>
          </Button>
          <div className="ml-1 flex items-center">
            <Button variant="primary" className="rounded-r-none pr-3" loading={exporting} disabled={!canExport} onClick={() => void exportCopy()} title="Enregistrer une copie (Ctrl+S)">
              <span className="sm:hidden">Enregistrer</span>
              <span className="hidden sm:inline">Enregistrer une copie</span>
            </Button>
            <button
              type="button"
              aria-label="Taille de la copie"
              title="Taille de la copie"
              disabled={!canExport}
              onClick={(e) =>
                menu.openBelow(
                  e.currentTarget,
                  EXPORT_SIZES.map((s) => ({ label: s.label, icon: exportSize === s.value ? <Check /> : <span />, onSelect: () => setExportSize(s.value) })),
                  "right",
                )
              }
              className="inline-flex h-9 items-center rounded-r-full border-l border-surface/20 bg-ink pl-1.5 pr-2.5 text-surface hover:bg-[#3a2f26] disabled:opacity-60"
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {isVersionEdit(asset, base) ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-honey-soft/70 px-4 py-1.5 text-[12.5px] text-[#6b4a1f]">
          <span className="min-w-0 flex-1 truncate">
            Vous modifiez la retouche de « {base.name} » : les réglages de cette version sont chargés sur l&apos;original.
          </span>
          <Link href={`/retouche/${base.id}`} className="shrink-0 font-semibold underline-offset-2 hover:underline">
            Repartir de l&apos;original
          </Link>
        </div>
      ) : parentMissing ? (
        <div className="shrink-0 border-b border-line bg-honey-soft/70 px-4 py-1.5 text-[12.5px] text-[#6b4a1f]">L&apos;original de cette retouche n&apos;existe plus : vous repartez de cette version.</div>
      ) : null}
      {asset.trashedAt ? <div className="shrink-0 border-b border-line bg-terracotta-soft px-4 py-1.5 text-[12.5px] text-terracotta">Cette photo est dans la corbeille : restaurez-la pour enregistrer une copie.</div> : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Aperçu */}
        <div className="relative h-[46vh] shrink-0 bg-[#E4DBCD] lg:h-auto lg:min-w-0 lg:flex-1" style={{ backgroundImage: "radial-gradient(ellipse at 50% 40%, rgba(251,247,240,.55), transparent 70%)" }}>
          {heic ? (
            <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="Format HEIC non pris en charge" className="h-full justify-center py-6">
              Cette photo est au format HEIC (iPhone), que ni le navigateur ni le serveur ne savent encore retoucher. Convertissez-la en JPEG (Réglages › Appareil photo › Formats › « Le plus compatible ») puis importez-la à nouveau.
            </EmptyState>
          ) : sourceError ? (
            <EmptyState
              icon={<ImageOff className="h-6 w-6" />}
              title="La photo n'a pas pu être chargée"
              className="h-full justify-center py-6"
              action={
                <Button onClick={() => setReloadKey((k) => k + 1)} icon={<RotateCcw className="h-4 w-4" aria-hidden />}>
                  Réessayer
                </Button>
              }
            >
              {sourceError}
            </EmptyState>
          ) : glMode === "fallback" ? (
            <FallbackPreview base={base} params={params} filter={fallbackFilter} bypass={bypass} />
          ) : (
            <PreviewCanvas
              source={displaySource}
              params={params}
              geometry={geometry}
              cropMode={cropMode}
              bypass={bypass}
              zoom={zoom}
              onZoomChange={setZoom}
              ratio={ratio}
              onCropChange={onCropChange}
              onUnsupported={() => setGlMode("fallback")}
              topInset={44}
              bottomInset={compact ? 12 : 0}
            />
          )}
          {bypass && !heic ? <span className="pointer-events-none absolute bottom-6 left-3 rounded-full lg:bottom-3 bg-night/70 px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.12em] text-surface backdrop-blur">Avant</span> : null}
          {!heic && !sourceError && glMode === "webgl" ? (
            <div className="pointer-events-none absolute inset-x-0 top-2.5 flex justify-center px-3">
              <div className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-surface/95 p-1 shadow-card backdrop-blur">
                {glMode === "webgl" ? (
                  <div role="radiogroup" aria-label="Zoom" className="flex">
                    {(["fit", "100"] as const).map((z) => (
                      <button
                        key={z}
                        type="button"
                        role="radio"
                        aria-checked={zoom === z && !cropMode}
                        disabled={cropMode}
                        onClick={() => setZoom(z)}
                        className={cx("h-7 rounded-full px-3 text-[12px] font-semibold disabled:opacity-40", zoom === z && !cropMode ? "bg-ink text-surface" : "text-ink hover:bg-hover")}
                      >
                        {z === "fit" ? "Ajuster" : hiLoading && zoom === "100" ? "100 % …" : "100 %"}
                      </button>
                    ))}
                  </div>
                ) : null}
                <span className="mx-1 h-4 w-px bg-line" aria-hidden />
                <button
                  type="button"
                  aria-pressed={cropMode}
                  onClick={() => setCropMode((v) => !v)}
                  disabled={glMode !== "webgl"}
                  title="Recadrer (C)"
                  className={cx("inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold disabled:opacity-40", cropMode ? "bg-chestnut text-surface" : "text-ink hover:bg-hover")}
                >
                  <Crop className="h-3.5 w-3.5" aria-hidden />
                  {cropMode ? "Terminer" : "Recadrer"}
                </button>
                {outSize ? <span className="whitespace-nowrap px-2.5 text-[11.5px] tabular-nums text-muted">{outSize}</span> : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Réglages (panneau à droite, feuille du bas sur mobile) */}
        <aside
          aria-label="Réglages de retouche"
          className="relative z-[1] -mt-3 min-h-0 flex-1 overflow-y-auto rounded-t-[18px] border-t border-line bg-surface shadow-[0_-8px_24px_rgba(36,29,23,.08)] lg:mt-0 lg:w-[320px] lg:flex-none lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong lg:hidden" aria-hidden style={{ backgroundColor: "rgba(36,29,23,.18)" }} />
          <AdjustPanel
            params={params}
            onChange={change}
            looks={looks}
            looksError={looksRes.error}
            onRetryLooks={() => void looksRes.reload()}
            thumbs={stripThumbs}
            lookId={lookId}
            intensity={intensity}
            onSelectLook={selectLook}
            onIntensity={setIntensity}
            onDeleteLook={(l) => void deleteLook(l)}
            onSaveLook={() => setSaveOpen(true)}
            onApplyToOthers={() => setPickOthers(true)}
            onAuto={() => void runAuto()}
            autoLoading={autoLoading}
            cropMode={cropMode}
            onToggleCrop={() => setCropMode((v) => !v)}
            onAspect={setAspect}
            onRotate={rotate}
            onFlip={flip}
            onResetFrame={resetFrame}
            onResetSection={resetSection}
            disabled={heic}
          />
        </aside>
      </div>

      <MediaPickerDialog
        open={pickOthers}
        onClose={() => setPickOthers(false)}
        kinds={["photo"]}
        title={look ? `Appliquer « ${look.name} » à d'autres photos` : "Choisir des photos"}
        confirmLabel="Continuer"
        onPick={(picked) => setApplyIds(picked.map((a) => a.id))}
      />
      <ApplyLookDialog open={Boolean(applyIds)} onClose={() => setApplyIds(null)} assetIds={applyIds ?? []} initialLookId={lookId} initialIntensity={intensity} />
      <SaveLookDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        params={params}
        onSaved={(l) => {
          emitRefresh("looks");
          looksRes.mutate((prev) => ({ looks: [...(prev?.looks ?? []), l] }));
          hCommit((s) => ({ ...s, lookId: l.id, intensity: 1 }));
          toast(`Look « ${l.name} » enregistré`);
        }}
      />
    </div>
  );
}

function isVersionEdit(asset: Asset, base: Asset): boolean {
  return asset.id !== base.id;
}

function scaleLabel(w: number, h: number, max: number): string {
  const s = max / Math.max(w, h);
  return dimensions(Math.round(w * s), Math.round(h * s));
}

/** Sans WebGL2 : la photo avec un filtre SVG approché (pas de recadrage ni d'effets). */
function FallbackPreview({ base, params, filter, bypass }: { base: Asset; params: RetouchParams; filter: string; bypass: boolean }) {
  const transform = `rotate(${params.rotate + params.straighten}deg) scaleX(${params.flipH ? -1 : 1})`;
  return (
    <div className="flex h-full flex-col">
      <p role="status" className="mx-3 mt-3 rounded-lg bg-surface/90 px-3 py-2 text-[12.5px] text-muted shadow-card">
        L&apos;aperçu en direct n&apos;est pas disponible sur cet appareil (WebGL2). L&apos;aperçu ci-dessous est approché ; la copie enregistrée appliquera exactement vos réglages.
      </p>
      <svg width="0" height="0" className="absolute" aria-hidden dangerouslySetInnerHTML={{ __html: filter }} />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6 pb-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={base.urls.original}
          alt={base.ai?.alt ?? base.name}
          className="max-h-full max-w-full object-contain shadow-card"
          style={{ filter: bypass ? "none" : "url(#rt-fallback)", transform }}
        />
      </div>
    </div>
  );
}

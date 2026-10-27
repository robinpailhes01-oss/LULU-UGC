"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/client/api";
import { emitRefresh, useRefresh } from "@/lib/client/refresh";
import { computeTiming, type MontageTiming } from "@/lib/client/montage/timing";
import type { LintReport, MontageDetail } from "@/lib/client/montage/types";
import type { Asset, Montage, MontageSpec, RenderState } from "@/lib/shared/types";

export type SaveState = "saved" | "pending" | "saving" | "error";

/**
 * État de l'éditeur de montage : copie de travail de la spécification, enregistrement
 * automatique (PATCH différé), aperçu HyperFrames (composition demandée au serveur 600 ms après
 * la dernière modification, avant même l'enregistrement), vérification et suivi du rendu.
 */
export function useMontageEditor(id: string) {
  const [montage, setMontage] = useState<MontageDetail | null>(null);
  const [spec, setSpec] = useState<MontageSpec | null>(null);
  const [title, setTitleState] = useState("");
  const [assets, setAssets] = useState<Record<string, Asset>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lint, setLint] = useState<LintReport | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  /** Code en cours d'édition à prévisualiser sans l'enregistrer. */
  const [draftHtml, setDraftHtml] = useState<string | null>(null);

  const specRef = useRef<MontageSpec | null>(null);
  const titleRef = useRef("");
  const version = useRef(0);
  const savedVersion = useRef(0);
  const timer = useRef<number | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const dirty = () => version.current !== savedVersion.current;

  const adopt = useCallback((m: MontageDetail, opts: { force?: boolean } = {}) => {
    setMontage(m);
    setAssets((prev) => ({ ...prev, ...m.assets }));
    if (opts.force || version.current === savedVersion.current) {
      specRef.current = m.spec;
      titleRef.current = m.title;
      setSpec(m.spec);
      setTitleState(m.title);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const m = await api.get<MontageDetail>(`/api/montages/${id}`);
      adopt(m);
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, [id, adopt]);

  useEffect(() => {
    void load();
  }, [load]);

  // L'agent (ou un autre onglet) a modifié les montages : on recharge si rien n'est en attente.
  useRefresh(["montages"], () => {
    if (!dirty() && !inflight.current) void load();
  });
  useRefresh(["assets"], () => {
    if (!dirty() && !inflight.current) void load();
  });

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (inflight.current) await inflight.current;
    if (!dirty() || !specRef.current) return;
    const v = version.current;
    setSaveState("saving");
    const run = (async () => {
      try {
        const m = await api.patch<MontageDetail>(`/api/montages/${id}`, { title: titleRef.current, spec: specRef.current });
        savedVersion.current = Math.max(savedVersion.current, v);
        setMontage(m);
        setAssets((prev) => ({ ...prev, ...m.assets }));
        setSaveError(null);
        setSaveState(version.current === savedVersion.current ? "saved" : "pending");
      } catch (err) {
        setSaveState("error");
        setSaveError(errorMessage(err));
      }
    })();
    inflight.current = run;
    await run;
    inflight.current = null;
    if (dirty() && !timer.current) timer.current = window.setTimeout(() => void flush(), 700);
  }, [id]);

  const schedule = useCallback(() => {
    version.current += 1;
    setSaveState("pending");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 700);
  }, [flush]);

  /** Modifie la spécification (copie de travail) ; enregistrement automatique. */
  const updateSpec = useCallback(
    (fn: (s: MontageSpec) => MontageSpec) => {
      if (!specRef.current) return;
      const next = fn(specRef.current);
      if (next === specRef.current) return;
      specRef.current = next;
      setSpec(next);
      schedule();
    },
    [schedule],
  );

  const setTitle = useCallback(
    (t: string) => {
      titleRef.current = t;
      setTitleState(t);
      if (t.trim()) schedule();
    },
    [schedule],
  );

  const addAssets = useCallback((list: Asset[]) => setAssets((prev) => ({ ...prev, ...Object.fromEntries(list.map((a) => [a.id, a])) })), []);

  // Enregistre avant de quitter la page.
  useEffect(() => {
    const onUnload = () => {
      if (!dirty() || !specRef.current) return;
      void fetch(`/api/montages/${id}`, {
        method: "PATCH",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleRef.current, spec: specRef.current }),
      });
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      onUnload();
    };
  }, [id]);

  // --- Aperçu ------------------------------------------------------------------------------------
  const customHtml = montage?.customHtml ?? false;
  const specKey = useMemo(() => (spec ? JSON.stringify(spec) : ""), [spec]);
  const htmlKey = customHtml ? `${montage?.updatedAt}:${montage?.html?.length}` : "";
  const firstPreview = useRef(true);
  useEffect(() => {
    if (!specKey || !montage) return;
    const ctrl = new AbortController();
    const delay = firstPreview.current ? 0 : 600;
    firstPreview.current = false;
    const t = window.setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch(`/api/montages/${id}/composition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftHtml !== null ? { html: draftHtml } : customHtml ? {} : { spec: JSON.parse(specKey) }),
          signal: ctrl.signal,
        });
        const text = await res.text();
        if (!res.ok) {
          let message = `Erreur ${res.status}`;
          try {
            message = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? message;
          } catch {
            /* corps non JSON */
          }
          throw new Error(message);
        }
        setPreviewHtml(text);
        setPreviewError(null);
      } catch (err) {
        if (!ctrl.signal.aborted) setPreviewError(errorMessage(err));
      } finally {
        if (!ctrl.signal.aborted) setPreviewLoading(false);
      }
    }, delay);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, specKey, customHtml, htmlKey, previewNonce, draftHtml, Boolean(montage)]);

  // Les liens signés des médias expirent : on renouvelle l'aperçu toutes les 45 minutes.
  useEffect(() => {
    const t = window.setInterval(() => setPreviewNonce((n) => n + 1), 45 * 60_000);
    return () => window.clearInterval(t);
  }, []);

  const refreshPreview = useCallback(() => setPreviewNonce((n) => n + 1), []);

  // --- Vérification (après chaque enregistrement) -------------------------------------------------
  const updatedAt = montage?.updatedAt;
  const reloadLint = useCallback(async () => {
    try {
      setLint(await api.get<LintReport>(`/api/montages/${id}/lint`));
    } catch {
      /* la vérification est indicative */
    }
  }, [id]);
  useEffect(() => {
    if (!updatedAt) return;
    const t = window.setTimeout(() => void reloadLint(), 300);
    return () => window.clearTimeout(t);
  }, [updatedAt, reloadLint]);

  // --- Code personnalisé ------------------------------------------------------------------------------
  const saveHtml = useCallback(
    async (html: string | null) => {
      await flush();
      const m = await api.patch<MontageDetail>(`/api/montages/${id}`, { html });
      adopt(m, { force: true });
    },
    [id, flush, adopt],
  );

  // --- Style ------------------------------------------------------------------------------------------
  const applyStyle = useCallback(
    async (slug: string | null) => {
      await flush();
      const m = await api.post<MontageDetail>(`/api/montages/${id}/style`, { style: slug });
      adopt(m, { force: true });
      emitRefresh("montages");
    },
    [id, flush, adopt],
  );

  // --- Rendu ------------------------------------------------------------------------------------------
  const mergeRender = useCallback((m: Pick<Montage, "status" | "render" | "outputAssetId">) => {
    setMontage((prev) => (prev ? { ...prev, status: m.status, render: m.render, outputAssetId: m.outputAssetId } : prev));
  }, []);

  const startRender = useCallback(async (): Promise<RenderState> => {
    await flush();
    const { render } = await api.post<{ render: RenderState }>(`/api/montages/${id}/render`);
    mergeRender({ status: "rendering", render, outputAssetId: montage?.outputAssetId ?? null });
    return render;
  }, [id, flush, mergeRender, montage?.outputAssetId]);

  const cancelRender = useCallback(async () => {
    const m = await api.del<Montage>(`/api/montages/${id}/render`);
    mergeRender(m);
  }, [id, mergeRender]);

  const status = montage?.status;
  const [justFinished, setJustFinished] = useState<Montage["status"] | null>(null);
  useEffect(() => {
    if (status !== "rendering") return;
    let stop = false;
    const tick = async () => {
      try {
        const m = await api.get<Montage>(`/api/montages/${id}/render`);
        if (stop) return;
        mergeRender(m);
        if (m.status !== "rendering") {
          setJustFinished(m.status);
          emitRefresh("assets", "montages");
        }
      } catch {
        /* réessai au prochain tour */
      }
    };
    const t = window.setInterval(() => void tick(), 3000);
    void tick();
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [id, status, mergeRender]);

  const timing: MontageTiming | null = useMemo(() => (spec ? computeTiming(spec) : null), [spec]);

  return {
    montage,
    spec,
    title,
    assets,
    timing,
    loadError,
    reload: load,
    saveState,
    saveError,
    flush,
    updateSpec,
    setTitle,
    addAssets,
    previewHtml,
    previewError,
    previewLoading,
    refreshPreview,
    draftHtml,
    setDraftHtml,
    lint,
    reloadLint,
    saveHtml,
    applyStyle,
    startRender,
    cancelRender,
    justFinished,
    clearJustFinished: () => setJustFinished(null),
  };
}

export type MontageEditorApi = ReturnType<typeof useMontageEditor>;

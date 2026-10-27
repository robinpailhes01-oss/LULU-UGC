"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarDays, Check, Clapperboard, Loader2, PlayCircle, RefreshCw, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { MediaPickerDialog } from "@/components/library/MediaPickerDialog";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cx } from "@/components/ui/cx";
import { useToast } from "@/components/ui/Toast";
import { useScreenContext } from "@/components/shell/ShellContext";
import { CodeView } from "@/components/montage/editor/CodeView";
import { animationLabel, ClipInspector, MontageSettings, TextInspector } from "@/components/montage/editor/Inspector";
import { MediaBin } from "@/components/montage/editor/MediaBin";
import { OutputDialog } from "@/components/montage/editor/OutputDialog";
import { Player, type PlayerHandle } from "@/components/montage/editor/Player";
import { Timeline, type Selection } from "@/components/montage/editor/Timeline";
import { STATUS_TONE } from "@/components/montage/status";
import { errorMessage } from "@/lib/client/api";
import { defaultClip, FORMAT_LABEL, resolveStyle, shortId } from "@/lib/client/montage/style";
import { FORMAT_SIZE } from "@/lib/client/montage/timing";
import { useMontageEditor, type MontageEditorApi } from "@/lib/client/montage/use-montage-editor";
import { useResource } from "@/lib/client/use-resource";
import { MONTAGE_STATUS_LABEL } from "@/lib/shared/labels";
import type { Asset, Look, MontageClip, MontageText, Skill } from "@/lib/shared/types";

/** Éditeur de montage : aperçu HyperFrames, timeline, médias, réglages, code et rendu. */
export function MontageEditor({ montageId }: { montageId: string }) {
  useScreenContext({ page: "montage", montageId });
  const ed = useMontageEditor(montageId);
  const toast = useToast();
  const styles = useResource<{ skills: Skill[] }>("/api/skills?kind=montage", ["skills"]);
  const looksRes = useResource<unknown>("/api/looks", ["looks"]);
  const looks = useMemo(() => parseLooks(looksRes.data, looksRes.error), [looksRes.data, looksRes.error]);
  const player = useRef<PlayerHandle>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [tab, setTab] = useState<"apercu" | "code">("apercu");
  const [panel, setPanel] = useState<"plans" | "reglages">("reglages");
  const [picker, setPicker] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [rendering, setRendering] = useState(false);

  const { spec, timing, montage, assets } = ed;
  const style = useMemo(() => {
    const skill = styles.data?.skills.find((s) => s.slug === spec?.style);
    return resolveStyle(skill?.data ?? null, { slug: skill?.slug ?? null, name: skill?.name ?? null }).style;
  }, [styles.data, spec?.style]);

  const seek = useCallback((t: number) => {
    player.current?.seek(t);
    setTime(t);
  }, []);

  // Espace : lecture/pause (hors champs de saisie et boutons) ; Échap : désélectionner.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (typing) return;
      if (e.key === " " && !(t && (t.tagName === "BUTTON" || t.getAttribute("role") === "button" || t.getAttribute("role") === "radio"))) {
        e.preventDefault();
        player.current?.toggle();
      } else if (e.key === "Escape" && !document.querySelector("dialog[open]")) setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fin d'un rendu suivi depuis cet écran.
  const { justFinished, clearJustFinished } = ed;
  useEffect(() => {
    if (!justFinished) return;
    if (justFinished === "rendered") toast("Vidéo prête : elle est dans la médiathèque", { action: { label: "Voir", onClick: () => setOutputOpen(true) }, durationMs: 8000 });
    else if (justFinished === "failed") toast(montage?.render?.error ?? "Le rendu a échoué.", { tone: "error", durationMs: 10000 });
    clearJustFinished();
  }, [justFinished, clearJustFinished, toast, montage?.render?.error]);

  if (ed.loadError && !montage) {
    return (
      <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="Montage indisponible" action={<Button onClick={() => void ed.reload()} icon={<RefreshCw className="h-4 w-4" />}>Réessayer</Button>}>
        {ed.loadError}{" "}
        <Link href="/montage" className="font-semibold text-chestnut hover:underline">
          Retour aux montages
        </Link>
      </EmptyState>
    );
  }
  if (!montage || !spec || !timing) return <EditorSkeleton />;

  const size = FORMAT_SIZE[spec.format];

  // --- Opérations ------------------------------------------------------------------------------
  const reorder = (from: number, to: number) =>
    ed.updateSpec((s) => {
      const clips = [...s.clips];
      const [c] = clips.splice(from, 1);
      clips.splice(to, 0, c);
      return { ...s, clips };
    });

  const removeClip = (id: string) => {
    const index = spec.clips.findIndex((c) => c.id === id);
    const clip = spec.clips[index];
    if (!clip) return;
    ed.updateSpec((s) => ({ ...s, clips: s.clips.filter((c) => c.id !== id) }));
    if (selection?.kind === "clip" && selection.id === id) setSelection(null);
    toast(`Plan ${index + 1} retiré`, {
      action: {
        label: "Annuler",
        onClick: () =>
          ed.updateSpec((s) => {
            const clips = [...s.clips];
            clips.splice(Math.min(index, clips.length), 0, clip);
            return { ...s, clips };
          }),
      },
    });
  };

  const updateClip = (id: string, patch: Partial<MontageClip>) => ed.updateSpec((s) => ({ ...s, clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const updateText = (id: string, patch: Partial<MontageText>) => ed.updateSpec((s) => ({ ...s, texts: s.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));

  const removeText = (id: string) => {
    const index = spec.texts.findIndex((t) => t.id === id);
    const text = spec.texts[index];
    if (!text) return;
    ed.updateSpec((s) => ({ ...s, texts: s.texts.filter((t) => t.id !== id) }));
    if (selection?.kind === "text" && selection.id === id) setSelection(null);
    toast("Texte retiré", { action: { label: "Annuler", onClick: () => ed.updateSpec((s) => ({ ...s, texts: [...s.texts.slice(0, index), text, ...s.texts.slice(index)] })) } });
  };

  const addText = () => {
    const first = spec.texts.length === 0;
    const start = first ? 0.2 : Math.min(Math.max(0, Math.round(time * 10) / 10), Math.max(0, timing.durationS - 1));
    const t: MontageText = {
      id: shortId("t"),
      startS: start,
      endS: Math.round(Math.min(timing.durationS, start + (first ? 2.6 : 2.5)) * 10) / 10,
      text: first ? "Votre accroche" : "Nouveau texte",
      position: first ? style.textPlacement : style.captions ? "bottom" : style.textPlacement,
      style: first ? "hook" : "caption",
    };
    ed.updateSpec((s) => ({ ...s, texts: [...s.texts, t] }));
    setSelection({ kind: "text", id: t.id });
    setPanel("reglages");
    seek(start + 0.6);
  };

  const addMedia = (list: Asset[]) => {
    ed.addAssets(list);
    const visual = list.filter((a) => a.kind !== "audio");
    const audio = list.find((a) => a.kind === "audio");
    ed.updateSpec((s) => ({
      ...s,
      clips: [...s.clips, ...visual.map((a, i) => defaultClip(a, style, s.clips.length + i))],
      musicAssetId: audio && !s.musicAssetId ? audio.id : s.musicAssetId,
    }));
    if (visual.length) toast(`${visual.length} plan${visual.length > 1 ? "s" : ""} ajouté${visual.length > 1 ? "s" : ""}`);
  };

  const startRender = async () => {
    setRendering(true);
    try {
      await ed.startRender();
      toast("Rendu lancé : vous pouvez continuer à travailler.", { tone: "info" });
    } catch (err) {
      toast(errorMessage(err), { tone: "error", durationMs: 10000 });
    } finally {
      setRendering(false);
    }
  };

  // --- Inspecteur -----------------------------------------------------------------------------
  const selClip = selection?.kind === "clip" ? spec.clips.findIndex((c) => c.id === selection.id) : -1;
  const selText = selection?.kind === "text" ? spec.texts.find((t) => t.id === selection.id) : undefined;
  const inspector = (
    <div>
      {selection ? (
        <div className="sticky top-0 z-10 flex items-center border-b border-line bg-surface/95 px-2 py-1.5 backdrop-blur">
          <Button size="sm" variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setSelection(null)}>
            Réglages du montage
          </Button>
        </div>
      ) : null}
      {selClip >= 0 ? (
        <ClipInspector
          clip={spec.clips[selClip]}
          index={selClip}
          count={spec.clips.length}
          asset={assets[spec.clips[selClip].assetId]}
          startS={timing.clips[selClip]?.startS ?? 0}
          updateClip={(p) => updateClip(spec.clips[selClip].id, p)}
          onRemove={() => removeClip(spec.clips[selClip].id)}
          onMove={(to) => reorder(selClip, to)}
          onSeek={seek}
        />
      ) : selText ? (
        <TextInspector text={selText} durationS={timing.durationS} currentTime={time} animation={animationLabel(montage.styleGuide)} updateText={(p) => updateText(selText.id, p)} onRemove={() => removeText(selText.id)} />
      ) : (
        <MontageSettings
          spec={spec}
          title={ed.title}
          timing={timing}
          assets={assets}
          guide={montage.styleGuide}
          styles={styles.data?.skills ?? null}
          looks={looks}
          updateSpec={ed.updateSpec}
          onApplyStyle={async (slug) => {
            try {
              await ed.applyStyle(slug);
              toast(slug ? "Style appliqué" : "Style retiré");
            } catch (err) {
              toast(errorMessage(err), { tone: "error" });
            }
          }}
          onSelect={setSelection}
          onAddAssets={ed.addAssets}
          focus={selection?.kind === "end" ? "end" : selection?.kind === "music" ? "music" : null}
        />
      )}
    </div>
  );

  const bin = (
    <MediaBin spec={spec} timing={timing} assets={assets} selection={selection} onSelect={setSelection} onSeek={seek} onAddMedia={() => setPicker(true)} onAddText={addText} />
  );

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <EditorTopBar ed={ed} tab={tab} setTab={setTab} onRender={startRender} rendering={rendering} onOpenOutput={() => setOutputOpen(true)} />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)_320px] lg:grid-rows-[minmax(0,1fr)_214px]">
        {tab === "code" ? (
          <section className="min-h-[70vh] border-line lg:col-span-3 lg:row-span-2 lg:min-h-0" aria-label="Code de la composition">
            <CodeView
              montageId={montage.id}
              html={montage.html}
              customHtml={montage.customHtml}
              lint={ed.lint}
              onSave={async (html) => {
                await ed.saveHtml(html);
                ed.setDraftHtml(null);
              }}
              onReset={async () => {
                await ed.saveHtml(null);
                ed.setDraftHtml(null);
              }}
              onPreviewDraft={(h) => {
                ed.setDraftHtml(h);
                if (h) setTab("apercu");
              }}
            />
          </section>
        ) : (
          <>
            <aside className="hidden min-h-0 border-r border-line bg-surface lg:block" aria-label="Plans et textes">
              {bin}
            </aside>
            <section className="relative flex h-[min(62vh,640px)] min-h-[320px] flex-col bg-sunken/60 lg:h-auto lg:min-h-0" aria-label="Aperçu">
              {ed.draftHtml !== null ? (
                <div className="flex items-center gap-2 border-b border-line bg-honey-soft px-3 py-1.5 text-[12.5px] text-[#6b4519]">
                  Aperçu du code non enregistré.
                  <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => setTab("code")}>
                    Revenir au code
                  </button>
                  <button type="button" className="ml-auto font-semibold underline-offset-2 hover:underline" onClick={() => ed.setDraftHtml(null)}>
                    Quitter l'aperçu
                  </button>
                </div>
              ) : null}
              <div className="min-h-0 flex-1 p-3 sm:p-5">
                <Player ref={player} html={ed.previewHtml} width={size.width} height={size.height} loading={ed.previewLoading} error={ed.previewError} onTime={setTime} onPlayingChange={setPlaying} />
              </div>
            </section>
            <aside className="order-last min-h-0 border-l border-line bg-surface lg:order-none lg:row-span-2 lg:overflow-y-auto" aria-label="Réglages">
              <div className="flex border-b border-line lg:hidden" role="tablist" aria-label="Panneau">
                {(["plans", "reglages"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="tab"
                    aria-selected={panel === p}
                    onClick={() => setPanel(p)}
                    className={cx("h-11 flex-1 text-[13px] font-semibold", panel === p ? "border-b-2 border-chestnut text-chestnut" : "text-muted")}
                  >
                    {p === "plans" ? "Plans et textes" : "Réglages"}
                  </button>
                ))}
              </div>
              <div className={cx(panel === "plans" ? "block" : "hidden", "lg:hidden")}>{bin}</div>
              <div className={cx(panel === "reglages" ? "block" : "hidden", "lg:block")}>{inspector}</div>
            </aside>
            <div className="h-[214px] border-t border-line lg:col-span-2 lg:h-auto">
              <Timeline
                spec={spec}
                timing={timing}
                assets={assets}
                currentTime={time}
                playing={playing}
                selection={selection}
                onSelect={(s) => {
                  setSelection(s);
                  setPanel("reglages");
                  // Un plan choisi hors de la tête de lecture : l'aperçu montre ce plan.
                  const c = s?.kind === "clip" ? timing.clips.find((x) => x.id === s.id) : undefined;
                  if (c && (time < c.startS || time >= c.endS)) seek(c.startS + Math.min(0.1, c.durationS / 4));
                }}
                onSeek={seek}
                onTogglePlay={() => player.current?.toggle()}
                onReorder={reorder}
                onRemoveClip={removeClip}
                onTextTiming={(id, startS, endS) => updateText(id, { startS, endS })}
                onRemoveText={removeText}
              />
            </div>
          </>
        )}
      </div>

      <MediaPickerDialog open={picker} onClose={() => setPicker(false)} kinds={["photo", "video"]} title="Ajouter des médias au montage" confirmLabel="Ajouter au montage" onPick={addMedia} />
      <OutputDialog assetId={montage.outputAssetId} open={outputOpen} onClose={() => setOutputOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function EditorTopBar({ ed, tab, setTab, onRender, rendering, onOpenOutput }: { ed: MontageEditorApi; tab: "apercu" | "code"; setTab: (t: "apercu" | "code") => void; onRender: () => void; rendering: boolean; onOpenOutput: () => void }) {
  const m = ed.montage!;
  const spec = ed.spec!;
  const r = m.render;
  const isRendering = m.status === "rendering";
  const pct = r?.progress != null ? Math.round(r.progress * 100) : null;
  const toast = useToast();
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-line bg-canvas px-3 py-2 sm:px-4">
      <Link href="/montage" className="inline-flex h-8 items-center gap-1 rounded-full pl-1.5 pr-2.5 text-[13px] font-semibold text-muted hover:bg-hover hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Montage
      </Link>
      <input
        value={ed.title}
        onChange={(e) => ed.setTitle(e.target.value)}
        aria-label="Titre du montage"
        maxLength={200}
        title={ed.title}
        className="h-9 min-w-0 flex-1 basis-48 truncate rounded-lg border border-transparent bg-transparent px-2 font-display text-[1.2rem] font-[400] tracking-[-0.01em] text-ink hover:border-line focus:border-chestnut focus:bg-surface focus:outline-none xl:max-w-[440px]"
        style={{ fontVariationSettings: "'opsz' 72, 'SOFT' 30" }}
      />
      <span className="flex items-center gap-2">
        <Badge tone={STATUS_TONE[m.status]}>{MONTAGE_STATUS_LABEL[m.status]}</Badge>
        <span className="hidden 2xl:inline">
          <Badge tone="chestnut">{FORMAT_LABEL[spec.format]}</Badge>
        </span>
        <SaveIndicator ed={ed} />
      </span>

      <div className="flex w-full flex-wrap items-center gap-2 lg:ml-auto lg:w-auto">
        <div role="tablist" aria-label="Vue" className="flex rounded-full bg-sunken p-0.5">
          {(["apercu", "code"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cx("h-7 rounded-full px-3 text-[12.5px] font-semibold", tab === t ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink")}
            >
              {t === "apercu" ? "Aperçu" : "Code"}
            </button>
          ))}
        </div>
        <LintBadge ed={ed} onClick={() => setTab("code")} />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {isRendering ? (
            <div className="flex items-center gap-2 rounded-full bg-honey-soft py-1 pl-3 pr-1 text-[12.5px] font-semibold text-[#6b4519]" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span className="max-w-[220px] truncate">{r?.message ?? "Rendu en cours…"}</span>
              {pct !== null ? (
                <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-surface/70" aria-hidden>
                  <span className="absolute inset-y-0 left-0 rounded-full bg-honey transition-[width] duration-base" style={{ width: `${pct}%` }} />
                </span>
              ) : null}
              <IconButton
                label="Annuler le rendu"
                size="sm"
                onClick={async () => {
                  try {
                    await ed.cancelRender();
                    toast("Rendu annulé");
                  } catch (err) {
                    toast(errorMessage(err), { tone: "error" });
                  }
                }}
              >
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          ) : (
            <>
              {m.outputAssetId ? (
                <Button size="sm" variant="ghost" icon={<PlayCircle className="h-4 w-4" />} onClick={onOpenOutput} aria-label="Voir la vidéo rendue" title="Voir la vidéo rendue">
                  <span className="hidden xl:inline">Voir la vidéo</span>
                </Button>
              ) : null}
              {m.status === "rendered" && m.outputAssetId ? (
                <>
                  <Button size="sm" variant="secondary" icon={<Clapperboard className="h-4 w-4" />} loading={rendering} onClick={onRender} aria-label="Rendre à nouveau" title="Rendre à nouveau">
                    <span className="hidden xl:inline">Rendre à nouveau</span>
                  </Button>
                  <Link href={`/programmation?nouveau=1&assets=${m.outputAssetId}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-[13px] font-semibold text-surface hover:bg-[#3a2f26]">
                    <CalendarDays className="h-4 w-4" aria-hidden /> Programmer
                  </Link>
                </>
              ) : (
                <Button size="sm" variant="primary" icon={<Clapperboard className="h-4 w-4" />} loading={rendering} onClick={onRender} disabled={spec.clips.length === 0 && !m.customHtml}>
                  Rendre la vidéo
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {m.status === "failed" && r?.error ? (
        <p role="alert" className="flex w-full items-start gap-2 rounded-lg bg-terracotta-soft px-3 py-1.5 text-[12.5px] text-terracotta">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="line-clamp-2">{r.error}</span>
        </p>
      ) : null}
    </header>
  );
}

function SaveIndicator({ ed }: { ed: MontageEditorApi }) {
  if (ed.saveState === "error") {
    return (
      <button type="button" onClick={() => void ed.flush()} className="inline-flex items-center gap-1 text-[12px] font-semibold text-terracotta hover:underline" title={ed.saveError ?? undefined}>
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Non enregistré · Réessayer
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-muted" aria-live="polite">
      {ed.saveState === "saved" ? <Check className="h-3.5 w-3.5 text-olive" aria-hidden /> : <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {ed.saveState === "saved" ? "Enregistré" : "Enregistrement…"}
    </span>
  );
}

function LintBadge({ ed, onClick }: { ed: MontageEditorApi; onClick: () => void }) {
  const l = ed.lint;
  if (!l) return null;
  const label = !l.ok ? `${l.errorCount} erreur${l.errorCount > 1 ? "s" : ""}` : l.warningCount ? `${l.warningCount} remarque${l.warningCount > 1 ? "s" : ""}` : "Vérifié";
  return (
    <button
      type="button"
      onClick={onClick}
      title="Vérification HyperFrames de la composition"
      className={cx(
        "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold",
        !l.ok ? "bg-terracotta-soft text-terracotta" : l.warningCount ? "bg-honey-soft text-[#7a5220]" : "bg-olive-soft text-olive",
      )}
    >
      {l.ok ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> : <ShieldAlert className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </button>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Chargement du montage">
      <div className="flex h-14 items-center gap-3 border-b border-line px-4">
        <div className="skeleton h-6 w-24" />
        <div className="skeleton h-7 w-56" />
        <div className="skeleton ml-auto h-8 w-36 rounded-full" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[232px_1fr_320px]">
        <div className="hidden space-y-2 border-r border-line p-3 lg:block">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12" />
          ))}
        </div>
        <div className="flex items-center justify-center p-6">
          <div className="skeleton aspect-[9/16] h-[60vh] max-h-full rounded-[10px]" />
        </div>
        <div className="hidden space-y-3 border-l border-line p-4 lg:block">
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-9" />
          <div className="skeleton h-28" />
        </div>
      </div>
    </div>
  );
}

/** /api/looks peut renvoyer { looks } ou une liste ; absent = pas de choix de look. */
function parseLooks(data: unknown, error: string | null): Look[] | null {
  if (error || !data) return null;
  const list = Array.isArray(data) ? data : Array.isArray((data as { looks?: unknown }).looks) ? (data as { looks: unknown[] }).looks : null;
  if (!list) return null;
  return list.filter((l): l is Look => typeof l === "object" && l !== null && typeof (l as Look).id === "string" && typeof (l as Look).name === "string");
}


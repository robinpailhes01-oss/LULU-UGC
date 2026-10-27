"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Braces,
  ChevronDown,
  CircleHelp,
  Clapperboard,
  CloudDownload,
  Copy,
  Ellipsis,
  FolderGit2,
  History,
  Library,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Textarea } from "@/components/ui/Field";
import { useMenu, type MenuEntry } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { useScreenContext, useShell } from "@/components/shell/ShellContext";
import { AnnexFiles } from "@/components/skills/AnnexFiles";
import { CodeTextarea } from "@/components/skills/CodeTextarea";
import { CompareRepoDialog } from "@/components/skills/CompareRepoDialog";
import { Panel, Popover, Segmented, Switch } from "@/components/skills/controls";
import { HistoryDrawer } from "@/components/skills/HistoryDrawer";
import { JsonDataEditor } from "@/components/skills/JsonDataEditor";
import { MontageStyleForm } from "@/components/skills/MontageStyleForm";
import { ReferenceMedia } from "@/components/skills/ReferenceMedia";
import { KindBadge, SourceBadge, StateBadges } from "@/components/skills/SkillBadges";
import { api, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { useResource } from "@/lib/client/use-resource";
import { describeChanges, draftFromSkill, draftPatch, rebaseDraft, type SkillDraft } from "@/lib/client/skills/draft";
import { IMPROVE_SUGGESTIONS, lastChangeLabel } from "@/lib/client/skills/kinds";
import { Markdown } from "@/lib/client/skills/markdown";
import { validateMontageData } from "@/lib/client/skills/montage-style";
import { formatRelative } from "@/lib/shared/format";
import type { MontageStyleData, Skill, SkillVersion } from "@/lib/shared/types";

/** Version du dépôt renvoyée par GET /api/skills/[slug] quand une mise à jour est disponible. */
interface RepoVersion {
  slug: string;
  name: string;
  description: string;
  body: string;
  data: Record<string, unknown> | null;
  files: Record<string, string>;
}

interface SkillResponse {
  skill: Skill;
  repoVersion: RepoVersion | null;
}

/** Écran /skills/[slug] : lire, modifier et améliorer un skill, avec historique et retour arrière. */
export function SkillEditor({ slug }: { slug: string }) {
  useScreenContext({ page: "skills", skillSlug: slug });
  const res = useResource<SkillResponse>(`/api/skills/${encodeURIComponent(slug)}`, ["skills"]);

  if (res.error && !res.data) {
    const missing = /introuvable/i.test(res.error);
    return (
      <div className="px-4 py-10">
        <EmptyState
          icon={<Library className="h-6 w-6" />}
          title={missing ? "Ce skill n'existe pas (ou plus)" : "Le skill n'a pas pu être chargé"}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {missing ? null : (
                <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => void res.reload()}>
                  Réessayer
                </Button>
              )}
              <Link href="/skills" className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-semibold text-ink hover:bg-hover">
                <ArrowLeft className="h-4 w-4" /> Tous les skills
              </Link>
            </div>
          }
        >
          {missing ? "Il a peut-être été supprimé ou renommé." : res.error}
        </EmptyState>
      </div>
    );
  }
  if (!res.data) return <EditorSkeleton />;
  return <EditorBody key={slug} slug={slug} server={res.data} reload={res.reload} />;
}

// ---------------------------------------------------------------------------------------------

function useContainerWide(min: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWide(el.getBoundingClientRect().width >= min);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return { ref, wide };
}

function useTick(ms: number) {
  const [, setN] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setN((n) => n + 1), ms);
    return () => window.clearInterval(t);
  }, [ms]);
}

function EditorBody({ slug, server, reload }: { slug: string; server: SkillResponse; reload: () => Promise<void> }) {
  const router = useRouter();
  const toast = useToast();
  const menu = useMenu();
  const { askAgent } = useShell();
  const ids = useId();
  useTick(60_000);

  const [saved, setSaved] = useState<Skill>(server.skill);
  const [draft, setDraft] = useState<SkillDraft>(() => draftFromSkill(server.skill));
  const [conflict, setConflict] = useState<Skill | null>(null);
  const [jsonValid, setJsonValid] = useState(true);
  const [revealAll, setRevealAll] = useState(false);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [showHelp, setShowHelp] = useState(false);
  const [paramTab, setParamTab] = useState<"form" | "json">("form");
  const [paramsOpen, setParamsOpen] = useState(server.skill.data !== null);

  const [saveOpen, setSaveOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [ask, setAsk] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [pendingRevert, setPendingRevert] = useState<SkillVersion | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const bypassGuard = useRef(false);
  const noteRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const base = useMemo(() => draftFromSkill(saved), [saved]);
  const patch = useMemo(() => draftPatch(base, draft), [base, draft]);
  const dirty = Object.keys(patch).length > 0;
  /** Modifications en cours, y compris un JSON en cours de saisie qui ne se lit pas encore. */
  const pending = dirty || !jsonValid;
  const issues = useMemo(() => (saved.kind === "montage" ? validateMontageData(draft.data) : []), [saved.kind, draft.data]);
  const autoNote = useMemo(() => (dirty ? describeChanges(base, draft) : ""), [dirty, base, draft]);
  const repo = server.repoVersion;
  const { ref: layoutRef, wide } = useContainerWide(960);

  const looksRes = useResource<unknown>(saved.kind === "montage" ? "/api/looks" : null, ["looks"]);
  const lookNames = useMemo(() => {
    const raw = looksRes.data as { looks?: { name: string }[] } | { name: string }[] | undefined;
    const list = Array.isArray(raw) ? raw : raw?.looks;
    return Array.isArray(list) ? list.map((l) => l.name).filter((n): n is string => typeof n === "string") : null;
  }, [looksRes.data]);

  const adopt = useCallback((s: Skill) => {
    setSaved(s);
    setDraft(draftFromSkill(s));
    setConflict(null);
    setRevealAll(false);
  }, []);

  // Le serveur a changé (agent, autre écran, autre personne) : on suit, sauf modifications en cours.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const savedRef = useRef(saved);
  savedRef.current = saved;
  useEffect(() => {
    const s = server.skill;
    const cur = savedRef.current;
    if (s.version === cur.version) setSaved(s);
    else if (s.version > cur.version) {
      if (dirtyRef.current) setConflict(s);
      else adopt(s);
    }
  }, [server, adopt]);

  // ------------------------------------------------------------------------------------------
  // Actions

  const revertTo = useCallback(
    async (version: number, opts: { undo?: boolean } = {}) => {
      setReverting(true);
      const prev = saved.version;
      try {
        const s = await api.post<Skill>(`/api/skills/${encodeURIComponent(slug)}/revert`, { version });
        adopt(s);
        emitRefresh("skills");
        if (opts.undo) toast(`Modification annulée — version ${s.version}`);
        else
          toast(`Revenu à la version ${version} (enregistrée comme v${s.version})`, {
            action: { label: "Annuler", onClick: () => void revertToRef.current(prev, { undo: true }) },
          });
        return true;
      } catch (err) {
        toast(errorMessage(err), { tone: "error" });
        return false;
      } finally {
        setReverting(false);
      }
    },
    [slug, saved.version, adopt, toast],
  );
  const revertToRef = useRef(revertTo);
  revertToRef.current = revertTo;

  const save = useCallback(
    async (noteText?: string) => {
      if (saving) return;
      if (!jsonValid) {
        setSaveOpen(false);
        toast("Le JSON des paramètres contient une erreur : corrigez-la avant d'enregistrer.", { tone: "error" });
        return;
      }
      if (!dirty) {
        toast("Rien à enregistrer : aucune modification.", { tone: "info" });
        setSaveOpen(false);
        return;
      }
      if (!draft.name.trim()) {
        toast("Donnez un nom au skill avant d'enregistrer.", { tone: "error" });
        nameRef.current?.focus();
        return;
      }
      if (issues.length > 0) {
        setRevealAll(true);
        setSaveOpen(false);
        toast(issues.length === 1 ? "Une valeur est à corriger avant d'enregistrer." : `${issues.length} valeurs sont à corriger avant d'enregistrer.`, { tone: "error" });
        window.setTimeout(() => {
          const el = document.querySelector<HTMLElement>('[data-skill-editor] [aria-invalid="true"]');
          el?.scrollIntoView({ block: "center", behavior: "smooth" });
          el?.focus({ preventScroll: true });
        }, 60);
        return;
      }
      const prev = saved.version;
      setSaving(true);
      try {
        const s = await api.patch<Skill>(`/api/skills/${encodeURIComponent(slug)}`, { ...patch, note: noteText?.trim() || autoNote || undefined });
        adopt(s);
        setSaveOpen(false);
        setNote("");
        emitRefresh("skills");
        toast(`Enregistré — version ${s.version}`, { action: { label: "Annuler", onClick: () => void revertToRef.current(prev, { undo: true }) } });
      } catch (err) {
        toast(errorMessage(err), { tone: "error" });
      } finally {
        setSaving(false);
      }
    },
    [saving, dirty, draft.name, jsonValid, issues.length, saved.version, slug, patch, autoNote, adopt, toast],
  );

  const saveRef = useRef(save);
  saveRef.current = save;
  const saveOpenRef = useRef(saveOpen);
  saveOpenRef.current = saveOpen;
  const noteValueRef = useRef(note);
  noteValueRef.current = note;

  // Ctrl/Cmd + S : enregistrer (avec la note si le champ est ouvert).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current(saveOpenRef.current ? noteValueRef.current : undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Garde-fou : modifications non enregistrées (fermeture de l'onglet, liens de l'application).
  useEffect(() => {
    if (!pending) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (bypassGuard.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (bypassGuard.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [pending]);

  async function setEnabled(v: boolean) {
    setToggling(true);
    try {
      const s = await api.patch<Skill>(`/api/skills/${encodeURIComponent(slug)}`, { enabled: v });
      setSaved(s);
      emitRefresh("skills");
      toast(v ? "Skill activé : l'agent peut de nouveau l'utiliser." : "Skill désactivé : l'agent ne l'utilise plus.", { action: { label: "Annuler", onClick: () => void setEnabledRef.current(!v) } });
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setToggling(false);
    }
  }
  const setEnabledRef = useRef(setEnabled);
  setEnabledRef.current = setEnabled;

  async function resetToRepo() {
    setResetting(true);
    const prev = saved.version;
    try {
      const s = await api.post<Skill>(`/api/skills/${encodeURIComponent(slug)}/reset`);
      adopt(s);
      setConfirmReset(false);
      setCompareOpen(false);
      emitRefresh("skills");
      void reload();
      toast(`Version du dépôt récupérée (v${s.version})`, { action: { label: "Annuler", onClick: () => void revertToRef.current(prev, { undo: true }) } });
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setResetting(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api.del(`/api/skills/${encodeURIComponent(slug)}`);
      bypassGuard.current = true;
      emitRefresh("skills");
      toast(`Skill « ${saved.name} » supprimé`);
      router.push("/skills");
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function askForRevert(v: SkillVersion) {
    if (dirty) setPendingRevert(v);
    else void revertTo(v.version);
  }

  function sendToAgent(e?: React.FormEvent) {
    e?.preventDefault();
    const what = ask.trim() || "relis-le et propose-moi des améliorations concrètes, sans rien enregistrer avant mon accord.";
    askAgent(`Améliore le skill « ${saved.name} » (${slug}) : ${what}`);
    setAgentOpen(false);
    setAsk("");
  }

  const setField = <K extends keyof SkillDraft>(k: K, v: SkillDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const montageData = (draft.data ?? {}) as MontageStyleData;

  // ------------------------------------------------------------------------------------------
  // Rendu

  const topBar = (
    <div className="z-panel border-b border-line bg-canvas/95 px-3 py-2.5 sm:sticky sm:top-0 sm:px-5 sm:backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link href="/skills" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full pl-2 pr-3 text-[13px] font-semibold text-muted transition-colors hover:bg-hover hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Skills
        </Link>
        <div className="min-w-[180px] flex-1">
          <input
            ref={nameRef}
            value={draft.name}
            onChange={(e) => setField("name", e.target.value)}
            maxLength={120}
            aria-label="Nom du skill"
            aria-invalid={!draft.name.trim() ? true : undefined}
            className="h-9 w-full min-w-0 truncate rounded-lg border border-transparent bg-transparent px-2 font-display text-[1.3rem] font-[400] tracking-[-0.01em] text-ink transition-colors hover:border-line focus:border-chestnut focus:bg-surface focus:outline-none focus:ring-2 focus:ring-chestnut/20 aria-[invalid=true]:border-terracotta"
            style={{ fontVariationSettings: "'opsz' 72, 'SOFT' 30" }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <KindBadge kind={saved.kind} />
          <SourceBadge source={saved.source} />
          <span className="font-mono text-[11.5px] font-semibold text-muted" title="Numéro de version">
            v{saved.version}
          </span>
        </div>
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto">
          <Switch
            checked={saved.enabled}
            onChange={(v) => void setEnabled(v)}
            disabled={toggling}
            label="Actif"
            className="mr-1.5"
          />
          <IconButton
            label="Plus d'actions"
            onClick={(e) => {
              const items: MenuEntry[] = [];
              if (saved.source === "repo" && saved.appEdited) items.push({ label: "Revenir à la version du dépôt", icon: <FolderGit2 />, onSelect: () => setConfirmReset(true) });
              items.push({
                label: "Copier l'identifiant",
                icon: <Copy />,
                onSelect: () => {
                  const done = () => toast(`Identifiant « ${slug} » copié`);
                  const fail = () => toast(`Identifiant : ${slug}`, { tone: "info" });
                  if (navigator.clipboard) navigator.clipboard.writeText(slug).then(done, fail);
                  else fail();
                },
              });
              if (saved.source === "app") items.push("separator", { label: "Supprimer ce skill", icon: <Trash2 />, danger: true, onSelect: () => setConfirmDelete(true) });
              menu.openBelow(e.currentTarget, items, "right");
            }}
          >
            <Ellipsis className="h-5 w-5" />
          </IconButton>
          <Button size="sm" icon={<History className="h-4 w-4" />} onClick={() => setHistoryOpen(true)} aria-label="Historique des versions" title="Historique des versions">
            <span className="hidden sm:inline">Historique</span>
          </Button>
          <div className="relative">
            <Button size="sm" data-popover-anchor aria-label="Améliorer avec l'agent" title="Améliorer avec l'agent" icon={<Sparkles className="h-4 w-4 text-chestnut" />} onClick={() => {
                setSaveOpen(false);
                setAgentOpen((o) => !o);
              }} aria-expanded={agentOpen}>
              <span className="hidden sm:inline">Améliorer avec l'agent</span>
            </Button>
            <Popover open={agentOpen} onClose={() => setAgentOpen(false)} label="Améliorer avec l'agent">
              <form onSubmit={sendToAgent} className="space-y-2.5">
                <label htmlFor={`${ids}-ask`} className="block text-[13px] font-semibold text-ink">
                  Que faut-il améliorer ?
                </label>
                <Textarea
                  id={`${ids}-ask`}
                  autoFocus
                  rows={3}
                  value={ask}
                  onChange={(e) => setAsk(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) sendToAgent(e);
                  }}
                  placeholder="ex. rends le rythme plus lent, ajoute un plan de respiration…"
                  className="min-h-0 text-[13px]"
                />
                <div className="flex flex-wrap gap-1.5">
                  {IMPROVE_SUGGESTIONS[saved.kind].map((s) => (
                    <button key={s} type="button" onClick={() => setAsk(s)} className="rounded-full bg-sunken px-2.5 py-1 text-left text-[11.5px] text-ink hover:bg-select">
                      {s}
                    </button>
                  ))}
                </div>
                {dirty ? <p className="text-[11.5px] text-[#7a5220]">L'agent lit la version enregistrée : enregistrez d'abord vos modifications.</p> : null}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setAgentOpen(false)}>
                    Annuler
                  </Button>
                  <Button variant="accent" size="sm" type="submit" icon={<Sparkles className="h-4 w-4" />}>
                    Demander à l'agent
                  </Button>
                </div>
              </form>
            </Popover>
          </div>
          <div className="relative">
            <Button
              variant="primary"
              size="sm"
              data-popover-anchor
              icon={<Save className="h-4 w-4" />}
              loading={saving}
              aria-expanded={saveOpen}
              onClick={() => {
                if (!dirty) {
                  toast("Rien à enregistrer : aucune modification.", { tone: "info" });
                  return;
                }
                setAgentOpen(false);
                setSaveOpen((o) => !o);
              }}
            >
              Enregistrer
            </Button>
            <Popover open={saveOpen} onClose={() => setSaveOpen(false)} label="Enregistrer une nouvelle version">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void save(note);
                }}
                className="space-y-2.5"
              >
                <label htmlFor={`${ids}-note`} className="block text-[13px] font-semibold text-ink">
                  Ce qui change <span className="font-normal text-muted">(facultatif)</span>
                </label>
                <input
                  ref={noteRef}
                  id={`${ids}-note`}
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  placeholder={autoNote || "ex. Rythme plus lent, nouvelles couleurs"}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13.5px] text-ink placeholder:text-faint focus:border-chestnut focus:outline-none focus:ring-2 focus:ring-chestnut/20 focus-visible:outline-none"
                />
                <p className="text-[11.5px] text-muted">Visible dans l'historique. Sans note : « {autoNote || "Modifié"} ».</p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSaveOpen(false)}>
                    Annuler
                  </Button>
                  <Button variant="primary" size="sm" type="submit" loading={saving}>
                    Enregistrer la version {saved.version + 1}
                  </Button>
                </div>
              </form>
            </Popover>
          </div>
        </div>
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-[12px] text-muted">
        <span>{lastChangeLabel(saved, (iso) => formatRelative(iso))}</span>
        {!draft.name.trim() ? (
          <span role="alert" className="font-semibold text-terracotta">
            Le nom est obligatoire.
          </span>
        ) : null}
        <StateBadges skill={{ ...saved, enabled: true, repoUpdateAvailable: false }} />
        {pending ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#7a5220]" role="status">
            <span className="h-2 w-2 rounded-full bg-honey" aria-hidden />
            Modifications non enregistrées
          </span>
        ) : null}
        <span className="ml-auto hidden text-faint md:inline">Ctrl + S pour enregistrer</span>
      </p>
    </div>
  );

  /** Sur téléphone, la barre du haut défile : l'enregistrement reste à portée de pouce. */
  const mobileSaveBar = pending ? (
    <div className="fixed inset-x-3 bottom-3 z-panel flex items-center gap-3 rounded-2xl bg-ink py-2 pl-4 pr-2 text-surface shadow-pop sm:hidden">
      <span className="h-2 w-2 shrink-0 rounded-full bg-honey" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[13px]">Modifications non enregistrées</span>
      <button type="button" onClick={() => void save()} disabled={saving} className="h-9 shrink-0 rounded-full bg-surface px-4 text-[13px] font-semibold text-ink disabled:opacity-60">
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  ) : null;

  const banners = (
    <div className="space-y-2 px-3 pt-3 empty:hidden sm:px-5">
      {conflict ? (
        <div role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-honey/50 bg-honey-soft/70 px-4 py-3 text-[13px] text-ink">
          <TriangleAlert className="h-4 w-4 shrink-0 text-[#7a5220]" aria-hidden />
          <p className="min-w-0 flex-1">
            Une nouvelle version (v{conflict.version}) vient d'être enregistrée{conflict.updatedBy ? ` par ${conflict.updatedBy}` : ""}, peut-être par l'agent. Vos modifications ne sont pas encore enregistrées.
            <span className="block text-[12px] text-muted">« Garder mes modifications » les réapplique sur la nouvelle version, sans effacer le reste.</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                setDraft((d) => rebaseDraft(base, d, draftFromSkill(conflict)));
                setSaved(conflict);
                setConflict(null);
              }}
            >
              Garder mes modifications
            </Button>
            <Button size="sm" variant="ghost" onClick={() => adopt(conflict)}>
              Abandonner mes modifications
            </Button>
          </div>
        </div>
      ) : null}
      {saved.repoUpdateAvailable ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-honey/50 bg-honey-soft/60 px-4 py-3 text-[13px] text-ink">
          <CloudDownload className="h-4 w-4 shrink-0 text-[#7a5220]" aria-hidden />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">Le dépôt contient une version plus récente de ce skill.</span> Vos modifications faites ici sont gardées tant que vous ne la récupérez pas.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setCompareOpen(true)} disabled={!repo}>
              Comparer
            </Button>
            <Button size="sm" variant="accent" icon={<CloudDownload className="h-4 w-4" />} onClick={() => setConfirmReset(true)}>
              Récupérer la version du dépôt
            </Button>
          </div>
        </div>
      ) : null}
      {!saved.enabled ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-sunken/60 px-4 py-2.5 text-[13px] text-muted">
          <CircleHelp className="h-4 w-4 shrink-0" aria-hidden />
          Ce skill est désactivé : l'agent ne le lit plus. Réactivez-le avec l'interrupteur « Actif ».
        </div>
      ) : null}
    </div>
  );

  const left = (
    <>
      <Panel title="Description" description="C'est ce que lit l'agent pour savoir quand utiliser ce skill.">
        <CodeTextarea
          code={false}
          minHeight={64}
          value={draft.description}
          onChange={(v) => setField("description", v)}
          maxLength={1000}
          aria-label="Description du skill"
          placeholder="Quand utiliser ce skill, en une à trois phrases."
          className="!px-3 !py-2 !leading-relaxed"
        />
        <p className="mt-1 text-right text-[11px] tabular-nums text-faint">{draft.description.length}/1000</p>
      </Panel>

      <Panel
        title="Consignes"
        description="Ce que l'agent lit et applique, écrit en Markdown."
        actions={
          <>
            <IconButton label="Aide de mise en forme" size="sm" active={showHelp} aria-expanded={showHelp} onClick={() => setShowHelp((v) => !v)}>
              <CircleHelp className="h-4 w-4" />
            </IconButton>
            <Segmented
              label="Mode d'affichage des consignes"
              size="sm"
              options={[
                { id: "write", label: "Écrire" },
                { id: "preview", label: "Aperçu" },
              ]}
              value={mode}
              onChange={setMode}
            />
          </>
        }
      >
        {showHelp ? (
          <div className="mb-3 grid gap-x-4 gap-y-1 rounded-lg bg-canvas px-3 py-2.5 font-mono text-[11.5px] text-muted sm:grid-cols-2">
            <span># Titre · ## Sous-titre</span>
            <span>- élément de liste · 1. étape</span>
            <span>**gras** · *italique*</span>
            <span>`mot-clé` · &gt; citation</span>
            <span>[texte du lien](https://…)</span>
            <span>| tableau | simple |</span>
          </div>
        ) : null}
        {mode === "write" ? (
          <>
            <CodeTextarea
              value={draft.body}
              onChange={(v) => setField("body", v)}
              minHeight={wide ? 460 : 320}
              aria-label="Consignes du skill, en Markdown"
              maxLength={100_000}
              placeholder={"# Titre\n\nLes consignes que l'agent doit suivre…"}
            />
            <p className="mt-1.5 text-[11px] text-faint">Tab : indenter · Échap puis Tab : quitter le champ</p>
          </>
        ) : (
          <div className="min-h-[320px] rounded-lg border border-line bg-canvas/40 px-5 py-4">
            {draft.body.trim() ? <Markdown source={draft.body} /> : <p className="text-[13px] italic text-faint">Pas encore de consignes.</p>}
          </div>
        )}
      </Panel>
    </>
  );

  const right = (
    <>
      {saved.kind === "montage" ? (
        <Panel
          id={`${ids}-style`}
          title="Paramètres du style"
          icon={<SlidersHorizontal />}
          description="Les valeurs par défaut des montages créés avec ce style."
          actions={
            <>
              <Segmented
                label="Mode d'édition des paramètres"
                size="sm"
                options={[
                  { id: "form", label: "Formulaire" },
                  { id: "json", label: "JSON" },
                ]}
                value={paramTab}
                onChange={(v) => {
                  if (v === "form" && !jsonValid) {
                    toast("Le JSON contient une erreur : corrigez-la pour revenir au formulaire.", { tone: "error" });
                    return;
                  }
                  setParamTab(v);
                }}
              />
              <Link
                href={`/montage?nouveau=1&style=${encodeURIComponent(slug)}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 text-[12px] font-semibold text-ink hover:bg-hover"
                title={dirty ? "Enregistrez d'abord pour essayer vos changements" : undefined}
              >
                <Clapperboard className="h-3.5 w-3.5 text-chestnut" aria-hidden />
                Essayer ce style
              </Link>
            </>
          }
        >
          {paramTab === "form" ? (
            <MontageStyleForm
              data={montageData}
              onChange={(d) => setField("data", Object.keys(d).length ? (d as Record<string, unknown>) : null)}
              issues={issues}
              looks={looksRes.error ? null : lookNames}
              revealAll={revealAll}
            />
          ) : (
            <JsonDataEditor
              value={draft.data}
              onChange={(v) => setField("data", v)}
              validate={validateMontageData}
              onValidity={setJsonValid}
              allowEmpty
              minHeight={wide ? 520 : 360}
              label="Paramètres du style en JSON"
            />
          )}
        </Panel>
      ) : (
        <section className="rounded-card border border-line bg-surface">
          <button
            type="button"
            aria-expanded={paramsOpen}
            onClick={() => {
              if (paramsOpen && !jsonValid) {
                toast("Le JSON contient une erreur : corrigez-la ou videz le champ avant de replier.", { tone: "error" });
                return;
              }
              setParamsOpen((o) => !o);
            }}
            className="flex w-full items-center gap-2 rounded-card px-4 py-3 text-left hover:bg-hover"
          >
            <Braces className="h-4 w-4 text-chestnut" aria-hidden />
            <span className="flex-1">
              <span className="block text-[13.5px] font-semibold text-ink">Paramètres (JSON)</span>
              <span className="block text-[12px] text-muted">{draft.data ? `${Object.keys(draft.data).length} paramètre${Object.keys(draft.data).length > 1 ? "s" : ""}` : "Facultatif : des valeurs structurées que l'agent peut lire."}</span>
            </span>
            <ChevronDown className={cx("h-4 w-4 text-muted transition-transform", paramsOpen && "rotate-180")} aria-hidden />
          </button>
          {paramsOpen ? (
            <div className="border-t border-line p-4">
              <JsonDataEditor value={draft.data} onChange={(v) => setField("data", v)} onValidity={setJsonValid} allowEmpty minHeight={180} label="Paramètres en JSON" />
              <p className="mt-1.5 text-[11px] text-faint">Laissez vide pour ne pas avoir de paramètres.</p>
            </div>
          ) : null}
        </section>
      )}

      <ReferenceMedia ids={draft.referenceAssetIds} onChange={(v) => setField("referenceAssetIds", v)} />
      <AnnexFiles files={draft.files} onChange={(v) => setField("files", v)} />
    </>
  );

  return (
    <div data-skill-editor className={cx("flex flex-col", wide ? "h-full" : "min-h-full")}>
      {topBar}
      {banners}
      <div ref={layoutRef} className={cx("min-h-0 flex-1", wide ? "grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-5 overflow-hidden px-5 pt-4" : "space-y-4 px-3 pb-24 pt-3 sm:px-5 sm:pb-10")}>
        {wide ? (
          <>
            <div className="min-h-0 space-y-4 overflow-y-auto pb-10 pl-px pr-1">{left}</div>
            <div className="min-h-0 space-y-4 overflow-y-auto pb-10 pl-px pr-1">{right}</div>
          </>
        ) : (
          <>
            {left}
            {right}
          </>
        )}
      </div>
      {mobileSaveBar}

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} skill={saved} onRevert={askForRevert} reverting={reverting} />

      <CompareRepoDialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        current={saved}
        repo={repo}
        onRecover={() => setConfirmReset(true)}
      />

      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={() => void resetToRepo()} title="Récupérer la version du dépôt ?" confirmLabel="Récupérer" loading={resetting}>
        Le contenu de ce skill sera remplacé par celui du dépôt. Vos modifications restent dans l'historique : vous pourrez y revenir à tout moment.
        {dirty ? <span className="mt-2 block font-semibold text-terracotta">Les modifications non enregistrées seront perdues.</span> : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(pendingRevert)}
        onClose={() => setPendingRevert(null)}
        onConfirm={() => {
          const v = pendingRevert;
          setPendingRevert(null);
          if (v) void revertTo(v.version);
        }}
        title={`Revenir à la version ${pendingRevert?.version ?? ""} ?`}
        confirmLabel="Revenir à cette version"
      >
        Vos modifications non enregistrées seront perdues. La version actuelle reste dans l'historique.
      </ConfirmDialog>

      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => void remove()} title={`Supprimer « ${saved.name} » ?`} confirmLabel="Supprimer" danger loading={deleting}>
        Le skill et tout son historique seront supprimés. L'agent ne pourra plus l'utiliser. Pour le mettre seulement de côté, désactivez-le plutôt.
      </ConfirmDialog>

      <ConfirmDialog
        open={leaveTo !== null}
        onClose={() => setLeaveTo(null)}
        onConfirm={() => {
          const to = leaveTo;
          setLeaveTo(null);
          bypassGuard.current = true;
          if (to) router.push(to);
        }}
        title="Quitter sans enregistrer ?"
        confirmLabel="Quitter sans enregistrer"
        danger
      >
        Vos modifications de « {saved.name} » ne sont pas enregistrées. Pour les garder, restez sur la page et cliquez sur « Enregistrer ».
      </ConfirmDialog>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement du skill">
      <div className="border-b border-line px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="skeleton h-8 w-20 rounded-full" />
          <div className="skeleton h-7 w-64" />
          <div className="ml-auto flex gap-2">
            <div className="skeleton h-8 w-24 rounded-full" />
            <div className="skeleton h-8 w-28 rounded-full" />
          </div>
        </div>
        <div className="skeleton mt-2 h-3 w-48" />
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="skeleton h-32 rounded-card" />
          <div className="skeleton h-[420px] rounded-card" />
        </div>
        <div className="space-y-4">
          <div className="skeleton h-[380px] rounded-card" />
          <div className="skeleton h-40 rounded-card" />
        </div>
      </div>
    </div>
  );
}

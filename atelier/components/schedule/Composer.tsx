"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Copy, ExternalLink, RefreshCw, RotateCw, Sparkles, Trash2, TriangleAlert, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { MediaPickerDialog } from "@/components/library/MediaPickerDialog";
import { IssueList, Section, Segmented, Toggle } from "@/components/schedule/controls";
import { MediaStrip, PhonePreview } from "@/components/schedule/ComposerParts";
import { PlatformGlyph } from "@/components/schedule/PlatformGlyph";
import { StatusBadge } from "@/components/schedule/status";
import { addDays, isWeekend, todayDay, whenLabel, zoned, zonedToIso } from "@/components/schedule/dates";
import type { AccountInfo, AccountsResponse } from "@/components/schedule/shared";
import { api, ApiError, errorMessage } from "@/lib/client/api";
import { useResource } from "@/lib/client/use-resource";
import {
  CAPTION_LIMIT,
  checkPost,
  countHashtags,
  DEFAULT_RULES,
  fr,
  instagramTypeFor,
  platformLabel,
  TIKTOK_PRIVACY,
  type PostIssue,
  type TikTokCommercial,
} from "@/lib/server/zernio/rules";
import type { ZTikTokCreatorInfo } from "@/lib/server/zernio/types";
import type { Asset, AssetPage, PostOptions, ScheduledPost } from "@/lib/shared/types";

export interface ComposerInitial {
  day?: string | null;
  time?: string | null;
  assetIds?: string[];
  caption?: string;
  firstComment?: string | null;
  targets?: ScheduledPost["targets"];
  options?: PostOptions;
}

export interface ComposerProps {
  open: boolean;
  onClose: () => void;
  /** Publication modifiée (null = nouvelle). */
  post: ScheduledPost | null;
  knownAssets: Record<string, Asset>;
  initial: ComposerInitial | null;
  accounts: AccountsResponse | undefined;
  onReloadAccounts: () => void;
  /** Après une action réussie : publication à jour (null si supprimée) et message du toast. */
  onDone: (post: ScheduledPost | null, message: string, undo?: () => Promise<void>) => void;
  onDuplicate: (post: ScheduledPost) => void;
}

type IgType = "feed" | "reel" | "story";
type When = "date" | "queue";

/** Compositeur de publication : médias, comptes, légende, format, TikTok, date, puis brouillon ou programmation. */
export function Composer(props: ComposerProps) {
  const { open, onClose, post } = props;
  const title = post ? (post.status === "published" || post.status === "publishing" ? "Publication" : "Modifier la publication") : "Nouvelle publication";
  return (
    <Dialog open={open} onClose={onClose} title={title} description={post ? <StatusLine post={post} /> : "Instagram, Facebook et TikTok, à l'heure de Paris."} size="xl">
      {open ? <ComposerBody {...props} /> : null}
    </Dialog>
  );
}

function StatusLine({ post }: { post: ScheduledPost }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusBadge post={post} />
      {post.scheduledFor ? <span>{post.status === "draft" ? "Prévue" : post.status === "published" ? "Publiée" : "Programmée"} {whenLabel(post.scheduledFor)}</span> : <span>Sans date</span>}
    </span>
  );
}

function defaultDay(initialDay: string | null | undefined, now = todayDay()): string {
  return initialDay && initialDay >= now ? initialDay : addDays(now, 1);
}

function ComposerBody({ post, knownAssets, initial, accounts, onReloadAccounts, onDone, onClose, onDuplicate }: ComposerProps) {
  const rules = accounts?.rules ?? DEFAULT_RULES;
  const configured = accounts?.configured ?? false;
  const accountList = useMemo(() => accounts?.accounts ?? [], [accounts]);
  const readOnly = post?.status === "published" || post?.status === "publishing";
  const src = post ?? null;
  const opt: PostOptions = src?.options ?? initial?.options ?? {};

  // --- état -----------------------------------------------------------------------------------
  const initialIds = src?.assetIds ?? initial?.assetIds ?? [];
  const [media, setMedia] = useState<Asset[]>(() => initialIds.map((id) => knownAssets[id]).filter((a): a is Asset => Boolean(a)));
  const [mediaLoading, setMediaLoading] = useState(initialIds.some((id) => !knownAssets[id]));
  const [caption, setCaption] = useState(src?.caption ?? initial?.caption ?? "");
  const [firstComment, setFirstComment] = useState(src?.firstComment ?? initial?.firstComment ?? "");
  const [selected, setSelected] = useState<string[]>(() => (src?.targets ?? initial?.targets)?.map((t) => t.accountId) ?? []);
  const [igType, setIgType] = useState<IgType>((opt.instagramType as IgType) ?? "feed");
  const [igTouched, setIgTouched] = useState(Boolean(opt.instagramType));
  const [shareToFeed, setShareToFeed] = useState(opt.shareToFeed !== false);
  const [fbType, setFbType] = useState<IgType>(opt.facebookType === "reel" || opt.facebookType === "story" ? opt.facebookType : "feed");
  const [ttPrivacy, setTtPrivacy] = useState<string>(opt.tiktokPrivacy ?? "");
  const [ttComment, setTtComment] = useState(opt.tiktokAllowComment === true);
  const [ttDuet, setTtDuet] = useState(opt.tiktokAllowDuet === true);
  const [ttStitch, setTtStitch] = useState(opt.tiktokAllowStitch === true);
  const initialCommercial = (opt.tiktokCommercial as TikTokCommercial | null | undefined) ?? null;
  const [ttCommercialOn, setTtCommercialOn] = useState(Boolean(initialCommercial));
  const [ttOwn, setTtOwn] = useState(Boolean(initialCommercial?.own));
  const [ttBranded, setTtBranded] = useState(Boolean(initialCommercial?.branded));
  // Date : celle de la publication, sauf si l'écran en propose une autre (brouillon déposé sur un jour).
  const z0 = src?.scheduledFor && !initial?.day ? zoned(src.scheduledFor) : null;
  const startDay = z0 ? z0.day : defaultDay(initial?.day);
  const [day, setDay] = useState(startDay);
  const [time, setTime] = useState(z0?.time ?? initial?.time ?? (isWeekend(startDay) ? rules.defaultTime.weekend : rules.defaultTime.weekday));
  const [when, setWhen] = useState<When>("date");
  const [picker, setPicker] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [server, setServer] = useState<{ key: string; errors: PostIssue[]; warnings: PostIssue[] } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "draft" | "validate" | "schedule" | "cancel" | "delete" | "retry">(null);
  const [confirm, setConfirm] = useState<null | "schedule" | "cancel" | "delete">(null);
  const [suggest, setSuggest] = useState<{ loading: boolean; items: string[]; error: string | null; previous: string | null } | null>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const scrollToFirstError = () => {
    const el = summaryRef.current?.closest("dialog")?.querySelector<HTMLElement>("[data-issue='error']");
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.closest("section")?.querySelector<HTMLElement>("input, textarea, select, button")?.focus({ preventScroll: true });
    } else summaryRef.current?.focus();
  };

  // Médias absents du cache de l'écran (lien profond ?assets=…)
  useEffect(() => {
    const missing = initialIds.filter((id) => !knownAssets[id]);
    if (missing.length === 0) return;
    let alive = true;
    api
      .get<AssetPage>(`/api/assets?ids=${missing.join(",")}&limit=${missing.length}`)
      .then((page) => {
        if (!alive) return;
        const byId = new Map([...Object.values(knownAssets), ...page.items].map((a) => [a.id, a]));
        setMedia(initialIds.map((id) => byId.get(id)).filter((a): a is Asset => Boolean(a)));
      })
      .catch(() => undefined)
      .finally(() => alive && setMediaLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nouveau : on coche d'office les comptes Instagram (cas le plus courant).
  useEffect(() => {
    if (src || initial?.targets || selected.length || accountList.length === 0) return;
    setSelected(accountList.filter((a) => a.platform === "instagram" && !a.needsReconnection).map((a) => a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountList]);

  // Une vidéo seule part en Reel : on l'indique d'office tant que le type n'a pas été choisi.
  useEffect(() => {
    if (igTouched) return;
    setIgType(media.length === 1 && media[0].kind === "video" ? "reel" : "feed");
  }, [media, igTouched]);

  const targets: AccountInfo[] = selected.map((id) => accountList.find((a) => a.id === id)).filter((a): a is AccountInfo => Boolean(a));
  // Comptes enregistrés mais absents de Zernio (clé retirée, compte déconnecté) : gardés tels quels.
  const orphanTargets = (src?.targets ?? []).filter((t) => selected.includes(t.accountId) && !accountList.some((a) => a.id === t.accountId));
  const allTargets = [...targets.map((a) => ({ platform: a.platform, accountId: a.id, username: a.username })), ...orphanTargets];
  const platforms = [...new Set(allTargets.map((t) => t.platform))];
  const hasIg = platforms.includes("instagram");
  const hasFb = platforms.includes("facebook");
  const ttAccount = targets.find((a) => a.platform === "tiktok") ?? null;
  const hasTt = platforms.includes("tiktok");
  const isVideo = media.some((m) => m.kind === "video");
  const effectiveIg = instagramTypeFor({ instagramType: igType }, media);

  const commercial: TikTokCommercial | null = hasTt && ttCommercialOn ? { own: ttOwn, branded: ttBranded } : null;
  const options: PostOptions = {
    ...(hasIg ? { instagramType: igType, shareToFeed } : {}),
    ...(hasFb ? { facebookType: fbType } : {}),
    ...(hasTt
      ? {
          tiktokPrivacy: (ttPrivacy || undefined) as PostOptions["tiktokPrivacy"],
          tiktokAllowComment: ttComment,
          tiktokAllowDuet: isVideo ? ttDuet : false,
          tiktokAllowStitch: isVideo ? ttStitch : false,
          tiktokCommercial: commercial,
        }
      : {}),
  };
  if (src?.options?.coverTimeS !== undefined) options.coverTimeS = src.options.coverTimeS;

  const scheduledIso = when === "queue" ? "next-slot" : day && time ? zonedToIso(day, time) : null;
  const payload = {
    caption,
    assetIds: media.map((m) => m.id),
    targets: allTargets,
    firstComment: firstComment.trim() ? firstComment : null,
    options,
  };
  const payloadKey = JSON.stringify({ ...payload, scheduledIso });

  const local = checkPost({ caption, firstComment: payload.firstComment, targets: allTargets, media: media.map((m) => ({ id: m.id, name: m.name, kind: m.kind, mime: m.mime, durationS: m.durationS })), options, scheduling: true }, rules);
  const fresh = server && server.key === payloadKey ? server : null;
  const merge = (a: PostIssue[], b: PostIssue[]) => [...a, ...b.filter((x) => !a.some((y) => y.message === x.message))];
  const errors = attempted ? merge(local.errors, fresh?.errors ?? []) : [];
  const warnings = merge(local.warnings, fresh?.warnings ?? []);
  const errs = (field: PostIssue["field"] | PostIssue["field"][]) => errors.filter((e) => (Array.isArray(field) ? field.includes(e.field) : e.field === field));
  const warns = (field: PostIssue["field"]) => warnings.filter((e) => e.field === field);

  // --- TikTok ---------------------------------------------------------------------------------
  const ttInfo = useResource<ZTikTokCreatorInfo>(ttAccount && configured ? `/api/social/tiktok/${encodeURIComponent(ttAccount.id)}?mediaType=${isVideo ? "video" : "photo"}` : null);
  const privacyOptions = useMemo(() => {
    const known = TIKTOK_PRIVACY.map((p) => p.value as string);
    const fromApi = ttInfo.data?.privacyLevels?.filter((p) => known.includes(p.value));
    return fromApi?.length ? fromApi.map((p) => ({ value: p.value, label: TIKTOK_PRIVACY.find((k) => k.value === p.value)?.label ?? p.label })) : TIKTOK_PRIVACY;
  }, [ttInfo.data]);
  const interaction = ttInfo.data?.postingLimits?.interactionSettings;
  const disabledByCreator = (k: "allow_comment" | "allow_duet" | "allow_stitch") => interaction?.[k]?.enabled === false;
  const maxTt = ttInfo.data?.postingLimits?.maxVideoDurationSec;
  const ttTooLong = hasTt && maxTt && media.some((m) => m.kind === "video" && (m.durationS ?? 0) > maxTt);

  // --- prochain créneau -----------------------------------------------------------------------
  const slot = useResource<{ slot: { nextSlot: string; timezone: string; queueName: string | null } | null }>(
    configured && when === "queue" ? `/api/social/next-slot?accountId=${encodeURIComponent(allTargets[0]?.accountId ?? "")}` : null,
  );

  // --- actions --------------------------------------------------------------------------------
  const body = (scheduledFor: string | null) => ({ ...payload, scheduledFor });

  async function save(scheduledFor: string | null, consent: boolean): Promise<ScheduledPost> {
    const b = body(scheduledFor);
    if (consent && hasTt) b.options = { ...b.options, tiktokConsent: true };
    return src ? api.patch<ScheduledPost>(`/api/posts/${src.id}`, b) : api.post<ScheduledPost>("/api/posts", b);
  }

  async function saveDraft() {
    setBusy("draft");
    setSubmitError(null);
    try {
      const out = await save(null, false);
      onDone(out, src?.status === "scheduled" ? "Programmation retirée : la publication est en brouillon." : "Brouillon enregistré.");
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function startSchedule() {
    setSubmitError(null);
    if (!configured) {
      setSubmitError("not_configured");
      return;
    }
    setAttempted(true);
    if (local.errors.length || ttTooLong || (hasTt && ttInfo.data?.creator?.canPostMore === false)) {
      requestAnimationFrame(scrollToFirstError);
      return;
    }
    if (!scheduledIso) {
      setSubmitError("Choisissez une date et une heure.");
      return;
    }
    setBusy("validate");
    try {
      const v = await api.post<{ valid: boolean; errors: PostIssue[]; warnings: PostIssue[] }>("/api/posts/validate", { ...body(scheduledIso), options: { ...options, tiktokConsent: true }, postId: src?.id });
      setServer({ key: payloadKey, errors: v.errors, warnings: v.warnings });
      if (!v.valid) {
        requestAnimationFrame(scrollToFirstError);
        return;
      }
      setConfirm("schedule");
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function doSchedule() {
    if (!scheduledIso) return;
    setBusy("schedule");
    try {
      const out = await save(scheduledIso, true);
      setConfirm(null);
      const tail = hasTt ? " Après publication, TikTok peut mettre quelques minutes à afficher la vidéo sur le profil." : "";
      onDone(out, out.scheduledFor ? `Programmé ${whenLabel(out.scheduledFor)}.${tail}` : `Publication programmée.${tail}`);
    } catch (err) {
      setConfirm(null);
      setSubmitError(err instanceof ApiError && err.code === "not_configured" ? "not_configured" : errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function doCancel() {
    if (!src) return;
    setBusy("cancel");
    try {
      const out = await api.post<ScheduledPost>(`/api/posts/${src.id}/cancel`);
      setConfirm(null);
      onDone(out, "Programmation annulée : la publication est revenue en brouillon.");
    } catch (err) {
      setConfirm(null);
      setSubmitError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function doDelete() {
    if (!src) return;
    setBusy("delete");
    try {
      await api.del(`/api/posts/${src.id}`);
      setConfirm(null);
      onDone(null, "Publication supprimée.");
    } catch (err) {
      setConfirm(null);
      setSubmitError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function doRetry() {
    if (!src) return;
    setBusy("retry");
    try {
      const out = await api.post<ScheduledPost>(`/api/posts/${src.id}/retry`);
      onDone(out, "Publication relancée chez Zernio.");
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function suggestCaptions() {
    setSuggest((s) => ({ loading: true, items: [], error: null, previous: s?.previous ?? null }));
    try {
      const out = await api.post<{ captions: string[] }>("/api/ai/captions", { assetIds: media.map((m) => m.id).slice(0, 20), platform: platforms[0] ?? "instagram" });
      setSuggest((s) => ({ loading: false, items: out.captions ?? [], error: null, previous: s?.previous ?? null }));
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 503 ? `L'agent n'est pas branché : ${err.message}` : `Suggestions indisponibles : ${errorMessage(err)}`;
      setSuggest((s) => ({ loading: false, items: [], error: msg, previous: s?.previous ?? null }));
    }
  }

  function applySuggestion(text: string) {
    setSuggest((s) => (s ? { ...s, previous: caption } : s));
    setCaption(text);
    captionRef.current?.focus();
  }

  // --- rendu ----------------------------------------------------------------------------------
  const accountName = targets.find((a) => a.platform === (hasIg ? "instagram" : platforms[0]))?.username ?? "june.content";
  const previewPlatform = hasIg ? "instagram" : platforms[0] ?? "instagram";
  const previewFormat: IgType = previewPlatform === "instagram" ? effectiveIg : previewPlatform === "facebook" ? fbType : "reel";
  const hashtags = countHashtags(`${caption} ${firstComment}`);
  const slotsForDay = isWeekend(day) ? rules.slots.weekend : rules.slots.weekday;
  const canCancel = Boolean(src && (src.status === "scheduled" || (src.status === "failed" && src.zernioPostId)));
  const primaryLabel = src?.status === "scheduled" ? "Mettre à jour" : when === "queue" ? "Programmer au prochain créneau" : "Programmer";
  const blockingTt = hasTt && ttInfo.data?.creator?.canPostMore === false;
  const errorCount = errors.length + (ttTooLong && attempted ? 1 : 0);
  const result = src?.result as { urls?: Record<string, string>; platforms?: { platform: string; status: string; url: string | null; error: string | null }[] } | null;

  return (
    <>
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8">
        {/* Colonne gauche : médias puis aperçu (l'aperçu passe sous le formulaire sur téléphone) */}
        <div className="lg:col-start-1 lg:row-start-1">
          <Section title="Médias" id="cmp-media" aside={media.length ? `${media.length} média${media.length > 1 ? "s" : ""}` : null}>
            {mediaLoading && media.length === 0 ? (
              <div className="flex gap-2">
                <span className="skeleton h-[90px] w-[72px]" />
                <span className="skeleton h-[90px] w-[72px]" />
              </div>
            ) : (
              <MediaStrip media={media} onChange={setMedia} onAdd={() => setPicker(true)} disabled={readOnly} />
            )}
            {hasIg && media.length === 1 && media[0].kind === "video" && !readOnly ? <p className="text-[12px] text-muted">Une vidéo seule sera publiée en Reel sur Instagram.</p> : null}
            <IssueList issues={errs("media")} tone="error" />
            <IssueList issues={warns("media")} tone="warning" />
          </Section>
        </div>
        <div className="order-last self-start rounded-card bg-sunken/60 px-4 py-5 lg:sticky lg:top-0 lg:order-none lg:col-start-1 lg:row-start-2">
            <p className="label-eyebrow mb-3 flex items-center gap-1.5">
              <PlatformGlyph platform={previewPlatform} className="h-3.5 w-3.5" title={false} />
              Aperçu {platformLabel(previewPlatform)}
              {previewPlatform !== "tiktok" ? ` · ${previewFormat === "feed" ? "Publication" : previewFormat === "reel" ? "Reel" : "Story"}` : null}
            </p>
            <PhonePreview media={media} caption={previewFormat === "story" ? "" : caption} platform={previewPlatform} format={previewFormat} account={accountName} />
        </div>

        {/* Colonne droite : formulaire */}
        <fieldset disabled={readOnly} className="min-w-0 space-y-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {readOnly && result ? <PublishedResult post={src!} result={result} /> : null}
          {src?.error && !readOnly ? (
            <div className="rounded-xl bg-terracotta-soft px-3.5 py-2.5 text-[13px] text-[#7f341d]" role="status">
              <p className="font-semibold">Zernio signale un problème</p>
              <p className="mt-0.5">{src.error}</p>
            </div>
          ) : null}

          <Section title="Comptes" id="cmp-accounts" aside={configured ? <AccountsRefresh onReload={onReloadAccounts} /> : null}>
            <AccountsPicker accounts={accounts} selected={selected} setSelected={setSelected} orphan={orphanTargets} readOnly={readOnly} />
            <IssueList issues={errs("targets")} tone="error" />
            <IssueList issues={warns("targets")} tone="warning" />
          </Section>

          <Section title="Légende" id="cmp-caption">
            <Textarea
              ref={captionRef}
              id="cmp-caption-field"
              aria-labelledby="cmp-caption"
              aria-describedby="cmp-caption-count"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Écrire la légende… (hashtags compris)"
              rows={6}
              style={{ minHeight: 148 }}
              className="resize-y"
            />
            <div id="cmp-caption-count" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px]">
              <CaptionCounters caption={caption} platforms={platforms.length ? platforms : ["instagram"]} warnAt={rules.captionWarnAt} />
              <span className={cx("tabular-nums", rules.hashtags && caption.trim() && (hashtags < rules.hashtags.min || hashtags > rules.hashtags.max) ? "text-[#7a5220]" : "text-muted")}>
                {hashtags} hashtag{hashtags > 1 ? "s" : ""}
                {rules.hashtags ? ` · ${rules.hashtags.min} à ${rules.hashtags.max} conseillés` : ""}
              </span>
            </div>
            {hasIg ? <p className="text-[12px] text-muted">Les {INSTAGRAM_FOLD_TEXT} premiers caractères s'affichent avant « plus ».</p> : null}
            {!readOnly ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="ghost" icon={<Sparkles className="h-4 w-4" />} loading={suggest?.loading} onClick={() => void suggestCaptions()} className="-ml-2">
                    {suggest?.items.length ? "Autres propositions" : "Suggérer des légendes"}
                  </Button>
                  {suggest?.previous !== null && suggest?.previous !== undefined ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Undo2 className="h-4 w-4" />}
                      onClick={() => {
                        setCaption(suggest.previous ?? "");
                        setSuggest((s) => (s ? { ...s, previous: null } : s));
                      }}
                    >
                      Revenir à ma légende
                    </Button>
                  ) : null}
                </div>
                {suggest?.loading ? (
                  <div className="grid gap-2" aria-hidden>
                    <span className="skeleton h-14 w-full rounded-xl" />
                    <span className="skeleton h-14 w-full rounded-xl" />
                    <span className="skeleton h-14 w-full rounded-xl" />
                  </div>
                ) : null}
                {suggest?.error ? <p className="rounded-xl bg-sunken px-3 py-2 text-[12.5px] text-muted">{suggest.error}</p> : null}
                {suggest?.items.length ? (
                  <ul className="grid gap-2" aria-label="Légendes proposées">
                    {suggest.items.map((s) => (
                      <li key={s}>
                        <button type="button" onClick={() => applySuggestion(s)} className="w-full whitespace-pre-line rounded-xl bg-sunken px-3 py-2.5 text-left text-[13px] leading-snug text-ink transition-colors hover:bg-select">
                          {s}
                          <span className="mt-1 block text-[11.5px] font-semibold text-chestnut">Utiliser cette légende</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <IssueList issues={errs("caption")} tone="error" />
            <IssueList issues={warns("caption")} tone="warning" />
          </Section>

          {(hasIg || hasFb || platforms.length === 0) && !(readOnly && !firstComment) ? (
            <Section title="Premier commentaire" id="cmp-comment" aside="Instagram et Facebook">
              <Textarea
                aria-labelledby="cmp-comment"
                value={firstComment}
                onChange={(e) => setFirstComment(e.target.value)}
                placeholder={rules.firstCommentHint ?? "Idéal pour les hashtags."}
                className="min-h-[60px]"
                rows={2}
              />
              <IssueList issues={warns("firstComment")} tone="warning" />
            </Section>
          ) : null}

          {hasIg || hasFb ? (
            <Section title="Format" id="cmp-format">
              <div className="space-y-3">
                {hasIg ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="inline-flex w-24 items-center gap-1.5 text-[13px] text-muted">
                      <PlatformGlyph platform="instagram" className="h-3.5 w-3.5" title={false} /> Instagram
                    </span>
                    <Segmented
                      label="Type de publication Instagram"
                      value={effectiveIg}
                      onChange={(v) => {
                        setIgTouched(true);
                        setIgType(v);
                      }}
                      options={[
                        { id: "feed", label: "Publication", disabled: media.length === 1 && media[0].kind === "video", title: media.length === 1 && media[0].kind === "video" ? "Une vidéo seule part en Reel" : undefined },
                        { id: "reel", label: "Reel" },
                        { id: "story", label: "Story" },
                      ]}
                    />
                  </div>
                ) : null}
                {hasIg && effectiveIg === "reel" ? (
                  <div className="pl-0 sm:pl-[108px]">
                    <Toggle checked={shareToFeed} onChange={setShareToFeed} label="Afficher aussi dans le fil" />
                  </div>
                ) : null}
                {hasFb ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="inline-flex w-24 items-center gap-1.5 text-[13px] text-muted">
                      <PlatformGlyph platform="facebook" className="h-3.5 w-3.5" title={false} /> Facebook
                    </span>
                    <Segmented
                      label="Type de publication Facebook"
                      value={fbType}
                      onChange={setFbType}
                      options={[
                        { id: "feed", label: "Publication" },
                        { id: "reel", label: "Reel" },
                        { id: "story", label: "Story" },
                      ]}
                    />
                  </div>
                ) : null}
              </div>
            </Section>
          ) : null}

          {hasTt ? (
            <Section title="TikTok" id="cmp-tiktok" aside={ttInfo.data?.creator?.nickname ? `Publié sur le compte ${ttInfo.data.creator.nickname}` : ttAccount ? `@${ttAccount.username}` : null}>
              <div className="space-y-3 rounded-card border border-line p-3.5">
                {blockingTt ? <p className="rounded-lg bg-terracotta-soft px-3 py-2 text-[12.5px] text-[#7f341d]">TikTok limite les publications de ce compte pour le moment. Réessayer plus tard.</p> : null}
                {ttTooLong ? <p className="rounded-lg bg-terracotta-soft px-3 py-2 text-[12.5px] text-[#7f341d]">Vidéo trop longue pour ce compte TikTok (max {Math.round((maxTt ?? 600) / 60)} min).</p> : null}
                <div>
                  <Label htmlFor="cmp-tt-privacy">Qui peut voir cette {isVideo ? "vidéo" : "publication"}</Label>
                  <Select id="cmp-tt-privacy" value={ttPrivacy} onChange={(e) => setTtPrivacy(e.target.value)} className="sm:max-w-xs">
                    <option value="" disabled>
                      Choisir…
                    </option>
                    {privacyOptions.map((p) => (
                      <option key={p.value} value={p.value} disabled={p.value === "SELF_ONLY" && ttCommercialOn && ttBranded}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <fieldset>
                  <legend className="mb-1.5 text-[12.5px] font-semibold">Autoriser</legend>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13.5px]">
                    <CheckboxLine checked={ttComment} onChange={setTtComment} label="Commentaires" disabled={disabledByCreator("allow_comment")} />
                    {isVideo ? <CheckboxLine checked={ttDuet} onChange={setTtDuet} label="Duo" disabled={disabledByCreator("allow_duet")} /> : null}
                    {isVideo ? <CheckboxLine checked={ttStitch} onChange={setTtStitch} label="Collage" disabled={disabledByCreator("allow_stitch")} /> : null}
                  </div>
                </fieldset>
                <Toggle checked={ttCommercialOn} onChange={setTtCommercialOn} label="Contenu commercial" hint={ttCommercialOn ? (ttBranded ? "Sera indiqué comme « Partenariat rémunéré »." : ttOwn ? "Sera indiqué comme « Contenu promotionnel »." : "Indiquez si le contenu fait la promotion de la marque de June, d'un tiers, ou des deux.") : undefined} />
                {ttCommercialOn ? (
                  <div className="flex flex-wrap gap-x-5 gap-y-2 pl-[46px] text-[13.5px]">
                    <CheckboxLine checked={ttOwn} onChange={setTtOwn} label="Ma marque" />
                    <CheckboxLine checked={ttBranded} onChange={setTtBranded} label="Contenu de marque" />
                  </div>
                ) : null}
                <p className="text-[12px] leading-snug text-muted">
                  En publiant, j'accepte {ttCommercialOn && ttBranded ? "la Politique relative au contenu de marque et " : ""}la Confirmation d'utilisation de la musique de TikTok.
                </p>
                <IssueList issues={errs("tiktok")} tone="error" />
              </div>
            </Section>
          ) : null}

          {!readOnly ? (
            <Section title="Quand" id="cmp-when" aside="Heure de Paris (Europe/Paris)">
              {configured ? (
                <Segmented
                  label="Mode de programmation"
                  value={when}
                  onChange={setWhen}
                  options={[
                    { id: "date", label: "Choisir une date" },
                    { id: "queue", label: "Prochain créneau libre" },
                  ]}
                />
              ) : null}
              {when === "date" ? (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <Label htmlFor="cmp-day">Date</Label>
                      <Input id="cmp-day" type="date" value={day} min={todayDay()} onChange={(e) => setDay(e.target.value)} className="w-[170px]" />
                    </div>
                    <div>
                      <Label htmlFor="cmp-time">Heure</Label>
                      <Input id="cmp-time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} className="w-[120px]" />
                    </div>
                  </div>
                  {slotsForDay.length ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                      <span>Horaires conseillés :</span>
                      {slotsForDay.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setTime(s)}
                          aria-pressed={time === s}
                          className={cx("h-7 rounded-full border px-2.5 text-[12px] font-semibold tabular-nums transition-colors", time === s ? "border-ink bg-ink text-surface" : "border-line-strong bg-surface text-ink hover:bg-hover")}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="rounded-xl bg-sunken px-3 py-2.5 text-[13px] text-ink">
                  {slot.loading ? (
                    "Recherche du prochain créneau…"
                  ) : slot.data?.slot ? (
                    <>
                      <CalendarClock className="mr-1.5 inline h-4 w-4 align-[-3px] text-chestnut" aria-hidden />
                      Prochain créneau : <strong className="font-semibold">{whenLabel(slot.data.slot.nextSlot)}</strong>
                      {slot.data.slot.queueName ? <span className="text-muted"> · file « {slot.data.slot.queueName} »</span> : null}
                    </>
                  ) : slot.error ? (
                    `File Zernio indisponible : ${slot.error}`
                  ) : (
                    "Aucune file de publication n'est configurée dans Zernio : choisissez une date."
                  )}
                </p>
              )}
              <IssueList issues={errs("date")} tone="error" />
              <IssueList issues={warns("date")} tone="warning" />
            </Section>
          ) : null}
          <IssueList issues={errs("options")} tone="error" />
          <IssueList issues={warns("options")} tone="warning" />
        </fieldset>
      </div>

      {/* Pied : résumé + actions */}
      <div className="sticky bottom-0 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur">
        {submitError ? (
          submitError === "not_configured" ? (
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-honey-soft px-3.5 py-2.5 text-[13px] text-[#6d4a1d]" role="alert">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">Zernio n'est pas connecté : la publication ne peut pas être programmée. Enregistrez-la en brouillon en attendant.</span>
              <Link href="/reglages" className="font-semibold underline underline-offset-2">
                Ouvrir les réglages
              </Link>
            </div>
          ) : (
            <p className="mb-3 rounded-xl bg-terracotta-soft px-3.5 py-2.5 text-[13px] text-[#7f341d]" role="alert">
              {submitError}
            </p>
          )
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <div ref={summaryRef} tabIndex={-1} className="mr-auto min-w-0 text-[12.5px] outline-none" aria-live="polite">
            {errorCount > 0 ? (
              <button type="button" onClick={scrollToFirstError} className="inline-flex items-center gap-1.5 rounded-full font-semibold text-[#7f341d] underline-offset-2 hover:underline">
                <TriangleAlert className="h-4 w-4" aria-hidden />
                {errorCount} point{errorCount > 1 ? "s" : ""} à corriger
              </button>
            ) : warnings.length && !readOnly ? (
              <span className="text-[#6d4a1d]">
                {warnings.length} conseil{warnings.length > 1 ? "s" : ""} du skill
              </span>
            ) : null}
          </div>
          {readOnly ? (
            <>
              <Button variant="ghost" onClick={onClose}>
                Fermer
              </Button>
              <Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => onDuplicate(src!)}>
                Dupliquer
              </Button>
            </>
          ) : (
            <>
              {src ? (
                <Button variant="ghost" className="text-terracotta hover:bg-terracotta-soft" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm("delete")} disabled={Boolean(busy)}>
                  Supprimer
                </Button>
              ) : null}
              {canCancel ? (
                <Button variant="ghost" onClick={() => setConfirm("cancel")} disabled={Boolean(busy)}>
                  Annuler la programmation
                </Button>
              ) : null}
              {src?.status === "failed" && src.zernioPostId ? (
                <Button variant="secondary" icon={<RotateCw className="h-4 w-4" />} loading={busy === "retry"} onClick={() => void doRetry()}>
                  Réessayer
                </Button>
              ) : null}
              {src?.status !== "scheduled" ? (
                <Button variant="secondary" loading={busy === "draft"} disabled={Boolean(busy) && busy !== "draft"} onClick={() => void saveDraft()}>
                  Enregistrer en brouillon
                </Button>
              ) : null}
              <Button variant="primary" icon={<CalendarClock className="h-4 w-4" />} loading={busy === "validate" || busy === "schedule"} disabled={Boolean(busy) || blockingTt} onClick={() => void startSchedule()}>
                {primaryLabel}
              </Button>
            </>
          )}
        </div>
      </div>

      <MediaPickerDialog
        open={picker}
        onClose={() => setPicker(false)}
        initial={media.map((m) => m.id)}
        title="Médias de la publication"
        confirmLabel="Valider"
        onPick={(picked) => {
          setPicker(false);
          const keep = media.filter((m) => picked.some((p) => p.id === m.id));
          const added = picked.filter((p) => !media.some((m) => m.id === p.id));
          setMedia([...keep, ...added]);
        }}
      />

      <ConfirmDialog
        open={confirm === "schedule"}
        onClose={() => setConfirm(null)}
        onConfirm={() => void doSchedule()}
        loading={busy === "schedule"}
        title={src?.status === "scheduled" ? "Mettre à jour la publication ?" : "Programmer la publication ?"}
        confirmLabel={src?.status === "scheduled" ? "Mettre à jour" : "Programmer"}
      >
        <ScheduleSummary targets={allTargets} when={when === "queue" ? (slot.data?.slot?.nextSlot ? `au prochain créneau (${whenLabel(slot.data.slot.nextSlot)})` : "au prochain créneau libre") : scheduledIso ? whenLabel(scheduledIso) : ""} count={media.length} warnings={warnings} hasTt={hasTt} />
      </ConfirmDialog>

      <Dialog
        open={confirm === "cancel"}
        onClose={() => setConfirm(null)}
        title="Annuler la programmation ?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Garder
            </Button>
            <Button variant="primary" loading={busy === "cancel"} onClick={() => void doCancel()}>
              Annuler la programmation
            </Button>
          </>
        }
      >
        <p className="px-5 py-4 text-[13.5px] leading-relaxed text-muted">La publication est retirée de Zernio et revient en brouillon, avec sa date. Vous pourrez la reprogrammer.</p>
      </Dialog>

      <ConfirmDialog open={confirm === "delete"} onClose={() => setConfirm(null)} onConfirm={() => void doDelete()} loading={busy === "delete"} danger title="Supprimer la publication ?" confirmLabel="Supprimer">
        {src?.zernioPostId ? "Elle est aussi retirée de Zernio et ne sera pas publiée. " : ""}Les médias restent dans la médiathèque.
      </ConfirmDialog>
    </>
  );
}

const INSTAGRAM_FOLD_TEXT = "125";

function CheckboxLine({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={cx("inline-flex cursor-pointer select-none items-center gap-2", disabled && "cursor-not-allowed opacity-50")} title={disabled ? "Désactivé dans les réglages TikTok du compte" : undefined}>
      <input type="checkbox" checked={checked && !disabled} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-line-strong accent-[#7F5530]" />
      {label}
    </label>
  );
}

function CaptionCounters({ caption, platforms, warnAt }: { caption: string; platforms: string[]; warnAt: number }) {
  const n = caption.length;
  return (
    <span className="flex flex-wrap gap-x-3 tabular-nums">
      {platforms
        .filter((p) => CAPTION_LIMIT[p])
        .map((p) => {
          const max = CAPTION_LIMIT[p];
          const over = n > max;
          const warn = !over && n >= Math.min(warnAt, Math.round(max * 0.9));
          return (
            <span key={p} className={cx(over ? "font-semibold text-terracotta" : warn ? "font-semibold text-[#7a5220]" : "text-muted")}>
              {platformLabel(p)} {fr(n)} / {fr(max)}
            </span>
          );
        })}
    </span>
  );
}

function AccountsRefresh({ onReload }: { onReload: () => void }) {
  return (
    <button type="button" onClick={onReload} className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold text-chestnut hover:bg-hover">
      <RefreshCw className="h-3 w-3" aria-hidden /> Actualiser
    </button>
  );
}

function AccountsPicker({ accounts, selected, setSelected, orphan, readOnly }: { accounts: AccountsResponse | undefined; selected: string[]; setSelected: (v: string[]) => void; orphan: ScheduledPost["targets"]; readOnly?: boolean }) {
  if (!accounts) {
    return (
      <div className="space-y-2" aria-hidden>
        <span className="skeleton block h-11 w-full rounded-xl" />
        <span className="skeleton block h-11 w-full rounded-xl" />
      </div>
    );
  }
  if (!accounts.configured) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong px-3.5 py-3 text-[13px] text-muted">
        <p className="font-semibold text-ink">Zernio n'est pas connecté.</p>
        <p className="mt-0.5">Les publications restent en brouillon tant que la clé Zernio n'est pas renseignée.</p>
        <Link href="/reglages" className="mt-1.5 inline-block font-semibold text-chestnut underline-offset-2 hover:underline">
          Ouvrir les réglages
        </Link>
      </div>
    );
  }
  if (accounts.error) return <p className="rounded-xl bg-terracotta-soft px-3.5 py-2.5 text-[13px] text-[#7f341d]">Comptes Zernio indisponibles : {accounts.error}</p>;
  if (accounts.accounts.length === 0 && orphan.length === 0) {
    // Avec un client courant, seuls ses comptes sont proposés : ils se connectent depuis sa fiche.
    return (
      <div className="rounded-xl border border-dashed border-line-strong px-3.5 py-3 text-[13px] text-muted">
        <p className="font-semibold text-ink">{accounts.client ? `Aucun compte connecté pour « ${accounts.client.name} ».` : "Aucun compte connecté dans Zernio."}</p>
        <p className="mt-0.5">{accounts.client ? "Connectez Instagram, Facebook ou TikTok depuis la fiche du client, puis actualisez." : "Connecter Instagram, Facebook ou TikTok dans Zernio, puis actualiser."}</p>
        {accounts.client ? (
          <Link href={`/clients/${accounts.client.id}`} className="mt-1.5 inline-block font-semibold text-chestnut underline-offset-2 hover:underline">
            Ouvrir la fiche du client
          </Link>
        ) : null}
      </div>
    );
  }
  const toggle = (id: string, on: boolean) => setSelected(on ? [...selected, id] : selected.filter((x) => x !== id));
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {accounts.accounts.filter((a) => !readOnly || selected.includes(a.id)).map((a) => {
        const checked = selected.includes(a.id);
        return (
          <li key={a.id}>
            <label
              className={cx(
                "flex h-12 cursor-pointer items-center gap-2.5 rounded-xl border px-3 transition-colors",
                checked ? "border-chestnut bg-select" : "border-line hover:bg-hover",
                a.needsReconnection && "cursor-not-allowed opacity-70",
              )}
            >
              <input type="checkbox" className="h-4 w-4 accent-[#7F5530]" checked={checked} disabled={a.needsReconnection} onChange={(e) => toggle(a.id, e.target.checked)} />
              <Avatar account={a} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-[13px] font-semibold text-ink">
                  <PlatformGlyph platform={a.platform} className="h-3.5 w-3.5" />
                  {a.displayName ?? a.username}
                </span>
                <span className="block truncate text-[11.5px] text-muted">@{a.username}</span>
              </span>
              {a.needsReconnection ? <span className="rounded-full bg-terracotta-soft px-2 py-0.5 text-2xs font-semibold text-[#7f341d]">À reconnecter</span> : null}
            </label>
          </li>
        );
      })}
      {orphan.map((t) => (
        <li key={t.accountId} className="flex h-12 items-center gap-2.5 rounded-xl border border-dashed border-line-strong px-3 text-[12.5px] text-muted">
          <PlatformGlyph platform={t.platform} className="h-3.5 w-3.5" />
          {t.username ? `@${t.username}` : t.accountId} — introuvable dans Zernio
          <button type="button" className="ml-auto font-semibold text-chestnut" onClick={() => toggle(t.accountId, false)}>
            Retirer
          </button>
        </li>
      ))}
    </ul>
  );
}

function Avatar({ account }: { account: AccountInfo }) {
  return account.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={account.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chestnut text-[11px] font-bold text-surface" aria-hidden>
      {(account.displayName ?? account.username).slice(0, 1).toUpperCase()}
    </span>
  );
}

function ScheduleSummary({ targets, when, count, warnings, hasTt }: { targets: ScheduledPost["targets"]; when: string; count: number; warnings: PostIssue[]; hasTt: boolean }) {
  return (
    <div className="space-y-3">
      <p>
        {count} média{count > 1 ? "s" : ""}, <strong className="font-semibold text-ink">{when}</strong> (heure de Paris), sur :
      </p>
      <ul className="space-y-1">
        {targets.map((t) => (
          <li key={t.accountId} className="flex items-center gap-2 text-ink">
            <PlatformGlyph platform={t.platform} className="h-4 w-4" />
            {platformLabel(t.platform)} {t.username ? <span className="text-muted">@{t.username}</span> : null}
          </li>
        ))}
      </ul>
      {warnings.length ? (
        <div className="rounded-lg bg-honey-soft/70 px-3 py-2">
          <IssueList issues={warnings} tone="warning" />
        </div>
      ) : null}
      {hasTt ? <p className="text-[12px]">En confirmant, vous acceptez la déclaration TikTok affichée dans le compositeur.</p> : null}
      <p className="text-[12px]">La publication sera visible du public à cette heure-là.</p>
    </div>
  );
}

function PublishedResult({ post, result }: { post: ScheduledPost; result: NonNullable<{ urls?: Record<string, string>; platforms?: { platform: string; status: string; url: string | null; error: string | null }[] }> }) {
  const rows = result.platforms?.length ? result.platforms : post.targets.map((t) => ({ platform: t.platform, status: post.status, url: result.urls?.[t.platform] ?? null, error: null }));
  return (
    <div className="rounded-card border border-line bg-olive-soft/40 p-3.5">
      <p className="text-[13px] font-semibold text-ink">{post.status === "publishing" ? "Publication en cours" : post.error ? "Publiée en partie" : "Publiée"}</p>
      <ul className="mt-2 space-y-1.5 text-[13px]">
        {rows.map((r, i) => (
          <li key={`${r.platform}-${i}`} className="flex flex-wrap items-center gap-2">
            <PlatformGlyph platform={r.platform} className="h-4 w-4" />
            <span className="font-semibold">{platformLabel(r.platform)}</span>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-chestnut underline-offset-2 hover:underline">
                Voir sur {platformLabel(r.platform)} <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : r.platform === "tiktok" && r.status === "published" ? (
              <span className="text-muted">Lien bientôt disponible (TikTok met quelques minutes).</span>
            ) : null}
            {r.error ? <span className="w-full text-[12.5px] text-[#7f341d]">{r.error}</span> : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] text-muted">Instagram et TikTok ne permettent pas de modifier ou retirer une publication depuis l'Atelier.</p>
    </div>
  );
}

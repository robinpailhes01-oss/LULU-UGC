"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, ExternalLink, GitBranch, Info, Play, ScanSearch, Sparkles, X } from "lucide-react";
import { AssetThumb } from "@/components/library/AssetThumb";
import { kindLabel } from "@/components/library/AssetCard";
import { TagInput } from "@/components/library/TagInput";
import type { LibraryActions } from "@/components/library/use-library-actions";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { useToast } from "@/components/ui/Toast";
import { exposureVerdict, sharpnessVerdict, type Verdict } from "@/lib/client/media/quality";
import { useResource } from "@/lib/client/use-resource";
import { dimensions, formatBytes, formatDate, formatDateTime, formatDuration, plural } from "@/lib/shared/format";
import type { Asset, AssetPage } from "@/lib/shared/types";

export function revealHref(a: Pick<Asset, "id" | "folderId" | "trashedAt">): string {
  if (a.trashedAt) return `/corbeille?media=${a.id}`;
  return `${a.folderId ? `/mediatheque/dossier/${a.folderId}` : "/mediatheque"}?media=${a.id}`;
}

interface Props {
  asset: Asset | null;
  selection: Asset[];
  aiEnabled: boolean | null;
  tags: { tag: string; count: number }[];
  actions: LibraryActions;
  onClose: () => void;
  onPreview: (asset: Asset) => void;
  onEditTags: () => void;
  /** Contexte affiché quand rien n'est sélectionné. */
  emptyHint: string;
  className?: string;
}

/** Panneau Infos (colonne de droite, ou feuille en bas de l'écran sur mobile). */
export function DetailsPanel({ asset, selection, aiEnabled, tags, actions, onClose, onPreview, onEditTags, emptyHint, className }: Props) {
  return (
    <div className={cx("flex h-full flex-col", className)}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-line pl-4 pr-2">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
          <Info className="h-4 w-4 text-chestnut" aria-hidden /> Infos
        </h2>
        <IconButton label="Fermer le panneau Infos" onClick={onClose} size="sm">
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {asset ? (
          <SingleAsset key={asset.id} asset={asset} aiEnabled={aiEnabled} tags={tags} actions={actions} onPreview={onPreview} />
        ) : selection.length > 1 ? (
          <MultiSelection assets={selection} onEditTags={onEditTags} />
        ) : (
          <div className="px-5 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sunken text-chestnut">
              <Info className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-[13.5px] font-semibold text-ink">Aucune sélection</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{emptyHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, children, action }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-4 last:border-b-0">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="label-eyebrow flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function SingleAsset({ asset, aiEnabled, tags, actions, onPreview }: { asset: Asset; aiEnabled: boolean | null; tags: Props["tags"]; actions: LibraryActions; onPreview: (a: Asset) => void }) {
  const { folders } = useShell();
  const toast = useToast();
  const [name, setName] = useState(asset.name);
  const [analyzing, setAnalyzing] = useState(false);
  useEffect(() => setName(asset.name), [asset.name]);

  const folder = asset.folderId ? folders.find((f) => f.id === asset.folderId) : null;
  const parent = useResource<Asset>(asset.parentAssetId ? `/api/assets/${asset.parentAssetId}` : null, ["assets"]);
  const derived = useResource<AssetPage>(`/api/assets?parent=${asset.id}&limit=12`, ["assets"]);
  const sharp = sharpnessVerdict(asset.blurScore, asset.lumaMean);
  const expo = exposureVerdict(asset.lumaMean, asset.clipHigh, asset.clipLow);
  const ai = asset.ai;
  const sub = asset.mime.split("/")[1]?.toUpperCase().replace("QUICKTIME", "MOV") ?? "";
  const mpx = asset.width && asset.height ? (asset.width * asset.height) / 1e6 : 0;
  const trashed = Boolean(asset.trashedAt);

  const saveName = async () => {
    const v = name.trim();
    if (!v) return setName(asset.name);
    if (v !== asset.name) {
      const ok = await actions.rename(asset, v);
      if (!ok) setName(asset.name);
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copiée`);
    } catch {
      toast("Copie impossible dans ce navigateur.", { tone: "error" });
    }
  };

  return (
    <>
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => onPreview(asset)}
          className="group relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-sunken outline-none focus-visible:ring-2 focus-visible:ring-chestnut"
          aria-label={`Ouvrir l'aperçu de ${asset.name}`}
        >
          <AssetThumb asset={asset} size="lg" fit="contain" />
          {asset.kind === "video" ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-night/50 text-surface backdrop-blur-sm transition-transform group-hover:scale-110">
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </span>
            </span>
          ) : null}
        </button>
        <label htmlFor={`name-${asset.id}`} className="sr-only">
          Nom du média
        </label>
        <input
          id={`name-${asset.id}`}
          value={name}
          disabled={trashed}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void saveName()}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            if (e.key === "Escape") {
              e.stopPropagation();
              setName(asset.name);
            }
          }}
          maxLength={255}
          title="Cliquez pour renommer"
          className="mt-3 w-full rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-[14.5px] font-semibold text-ink hover:border-line focus:border-chestnut focus:bg-surface focus:outline-none focus:ring-2 focus:ring-chestnut/20 disabled:opacity-100"
        />
        <p className="px-1.5 pb-3 text-[12px] text-muted">
          {kindLabel(asset)} · {sub} · {formatBytes(asset.sizeBytes)}
          {asset.starred ? " · Favori" : ""}
        </p>
      </div>

      <Section
        title="Analyse IA"
        icon={<Sparkles className="h-3 w-3 text-chestnut" aria-hidden />}
        action={
          ai && asset.kind !== "audio" && !trashed ? (
            <button
              type="button"
              disabled={analyzing}
              onClick={async () => {
                setAnalyzing(true);
                await actions.analyze([asset], true);
                setAnalyzing(false);
              }}
              className="text-[12px] font-semibold text-chestnut hover:underline disabled:opacity-50"
            >
              {analyzing ? "Analyse…" : "Réanalyser"}
            </button>
          ) : null
        }
      >
        {ai ? (
          <div className="space-y-3 text-[13px] leading-relaxed">
            <div>
              <p className="font-semibold text-ink">{ai.title}</p>
              {ai.description ? <p className="mt-0.5 text-muted">{ai.description}</p> : null}
            </div>
            {ai.alt ? (
              <div>
                <p className="text-2xs font-semibold text-faint">Texte alternatif</p>
                <p className="text-muted">{ai.alt}</p>
              </div>
            ) : null}
            {ai.captionIdea ? (
              <div className="rounded-xl bg-sunken/70 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-2xs font-semibold text-faint">Idée de légende</p>
                  <button type="button" onClick={() => void copy(ai.captionIdea!, "Légende")} className="inline-flex items-center gap-1 text-[12px] font-semibold text-chestnut hover:underline">
                    <Copy className="h-3 w-3" aria-hidden /> Copier
                  </button>
                </div>
                <p className="whitespace-pre-line text-ink">{ai.captionIdea}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={ai.quality.score >= 75 ? "olive" : ai.quality.score >= 50 ? "honey" : "terracotta"}>Qualité {Math.round(ai.quality.score)}/100</Badge>
              {ai.quality.issues.map((i) => (
                <Badge key={i} tone="neutral">
                  {i}
                </Badge>
              ))}
            </div>
          </div>
        ) : asset.kind === "audio" ? (
          <p className="text-[12.5px] text-muted">L'analyse IA concerne les photos et les vidéos.</p>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[12.5px] leading-relaxed text-muted">Pas encore analysé : l'IA propose un titre, une description, des mots-clés et une idée de légende.</p>
            {aiEnabled === false ? (
              <p className="text-[12px] text-faint">
                Analyse indisponible : ajoutez une clé Anthropic (voir{" "}
                <Link href="/reglages" className="font-semibold text-chestnut hover:underline">
                  Réglages
                </Link>
                ).
              </p>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                loading={analyzing}
                disabled={trashed}
                icon={<ScanSearch className="h-4 w-4" />}
                onClick={async () => {
                  setAnalyzing(true);
                  await actions.analyze([asset]);
                  setAnalyzing(false);
                }}
              >
                Analyser avec l'IA
              </Button>
            )}
          </div>
        )}
      </Section>

      <Section title="Mots-clés">
        <TagInput
          value={asset.tags}
          suggestions={tags}
          onAdd={(t) => void actions.setTags(asset, [...asset.tags, t])}
          onRemove={(t) => void actions.setTags(asset, asset.tags.filter((x) => x !== t))}
        />
      </Section>

      <Section title="Informations">
        <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-[12.5px]">
          <Row label="Type">
            {kindLabel(asset)} · {sub}
          </Row>
          {asset.width && asset.height ? (
            <Row label="Dimensions">
              {dimensions(asset.width, asset.height)}
              {asset.kind === "photo" && mpx >= 0.1 ? <span className="text-faint"> · {mpx.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mpx</span> : null}
            </Row>
          ) : null}
          {asset.durationS ? <Row label="Durée">{formatDuration(asset.durationS)}</Row> : null}
          <Row label="Taille">{formatBytes(asset.sizeBytes)}</Row>
          <Row label="Prise de vue">{asset.takenAt ? formatDateTime(asset.takenAt) : <span className="text-faint">Inconnue</span>}</Row>
          {asset.camera ? <Row label="Appareil">{asset.camera}</Row> : null}
          {asset.gps ? (
            <Row label="Lieu">
              <a
                href={`https://www.openstreetmap.org/?mlat=${asset.gps.lat}&mlon=${asset.gps.lng}#map=16/${asset.gps.lat}/${asset.gps.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-chestnut hover:underline"
              >
                Voir sur la carte <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
              <span className="block text-2xs tabular-nums text-faint">
                {asset.gps.lat.toFixed(4)}, {asset.gps.lng.toFixed(4)}
              </span>
            </Row>
          ) : null}
          <Row label="Dossier">
            {trashed ? (
              <span className="text-faint">Corbeille</span>
            ) : (
              <Link href={asset.folderId ? `/mediatheque/dossier/${asset.folderId}` : "/mediatheque"} className="font-semibold text-chestnut hover:underline">
                {folder?.name ?? (asset.folderId ? "Dossier" : "Médiathèque")}
              </Link>
            )}
          </Row>
          <Row label="Ajouté">
            {formatDate(asset.createdAt)}
            {asset.createdBy ? <span className="text-faint"> par {asset.createdBy}</span> : null}
          </Row>
          {asset.source !== "upload" ? <Row label="Origine">{asset.source === "retouch" ? "Retouche" : asset.source === "montage" ? "Montage" : "Import"}</Row> : null}
        </dl>
      </Section>

      {sharp || expo ? (
        <Section title="Qualité technique">
          <div className="space-y-3">
            {sharp ? <Indicator name="Netteté" verdict={sharp} /> : null}
            {expo ? <Indicator name="Exposition" verdict={expo} centered /> : null}
          </div>
          <p className="mt-3 text-2xs leading-relaxed text-faint">Mesuré automatiquement à l'import, sur la vignette.</p>
        </Section>
      ) : null}

      {asset.parentAssetId || (derived.data?.items.length ?? 0) > 0 ? (
        <Section title="Versions" icon={<GitBranch className="h-3 w-3" aria-hidden />}>
          {asset.parentAssetId ? (
            <p className="mb-2 text-[12.5px] text-muted">
              Version retouchée de{" "}
              {parent.data ? (
                <Link href={revealHref(parent.data)} className="font-semibold text-chestnut hover:underline">
                  {parent.data.name}
                </Link>
              ) : parent.error ? (
                <span className="text-faint">l'original (supprimé)</span>
              ) : (
                <span className="text-faint">…</span>
              )}
            </p>
          ) : null}
          {derived.data && derived.data.items.length > 0 ? (
            <ul className="space-y-1.5">
              {derived.data.items.map((d) => (
                <li key={d.id}>
                  <Link href={revealHref(d)} className="flex items-center gap-2.5 rounded-lg p-1 hover:bg-hover">
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-sunken">
                      <AssetThumb asset={d} size="sm" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-semibold text-ink">{d.name}</span>
                      <span className="block text-2xs text-faint">
                        {d.source === "montage" ? "Montage" : "Retouche"} · {formatDate(d.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-faint">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </>
  );
}

const TONE: Record<Verdict["tone"], string> = { good: "bg-olive", warn: "bg-honey", bad: "bg-terracotta", neutral: "bg-muted" };
const TONE_TEXT: Record<Verdict["tone"], string> = { good: "text-olive", warn: "text-[#7a5220]", bad: "text-terracotta", neutral: "text-muted" };

function Indicator({ name, verdict, centered }: { name: string; verdict: Verdict; centered?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="text-ink">{name}</span>
        <span className={cx("font-semibold", TONE_TEXT[verdict.tone])}>{verdict.label}</span>
      </div>
      <div className="relative mt-1.5 h-1.5 rounded-full bg-sunken" aria-hidden>
        {centered ? <span className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-y-1/2 bg-ink/25" /> : null}
        <span className={cx("absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface", TONE[verdict.tone])} style={{ left: `${Math.round(verdict.level * 100)}%` }} />
      </div>
      <p className="mt-1 text-2xs leading-relaxed text-muted">{verdict.detail}</p>
    </div>
  );
}

function MultiSelection({ assets, onEditTags }: { assets: Asset[]; onEditTags: () => void }) {
  const bytes = assets.reduce((n, a) => n + a.sizeBytes, 0);
  const photos = assets.filter((a) => a.kind === "photo").length;
  const videos = assets.filter((a) => a.kind === "video").length;
  const audio = assets.length - photos - videos;
  const tagCounts = new Map<string, number>();
  for (const a of assets) for (const t of a.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const common = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  return (
    <div className="px-4 py-4">
      <ul className="grid grid-cols-3 gap-1.5" aria-hidden>
        {assets.slice(0, 6).map((a) => (
          <li key={a.id} className="aspect-square overflow-hidden rounded-lg bg-sunken">
            <AssetThumb asset={a} size="sm" />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[14.5px] font-semibold text-ink">{plural(assets.length, "média sélectionné", "médias sélectionnés")}</p>
      <p className="text-[12px] text-muted">
        {[photos ? plural(photos, "photo") : "", videos ? plural(videos, "vidéo") : "", audio ? plural(audio, "son") : ""].filter(Boolean).join(" · ")} · {formatBytes(bytes)}
      </p>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="label-eyebrow">Mots-clés</h3>
          <button type="button" onClick={onEditTags} className="text-[12px] font-semibold text-chestnut hover:underline">
            Modifier
          </button>
        </div>
        {common.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {common.map(([t, c]) => (
              <li key={t} className="rounded-full bg-sunken px-2.5 py-1 text-[12px] text-ink">
                {t} <span className="text-2xs text-faint">{c === assets.length ? "tous" : `${c}/${assets.length}`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12.5px] text-muted">Aucun mot-clé sur cette sélection.</p>
        )}
      </div>
    </div>
  );
}

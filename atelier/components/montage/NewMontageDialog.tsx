"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Film, Image as ImageIcon, Images, Music, X } from "lucide-react";
import { MediaPickerDialog } from "@/components/library/MediaPickerDialog";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label } from "@/components/ui/Field";
import { cx } from "@/components/ui/cx";
import { useToast } from "@/components/ui/Toast";
import { Segmented } from "@/components/montage/editor/controls";
import { api, errorMessage, qs } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { useResource } from "@/lib/client/use-resource";
import { FORMAT_LABEL, FORMATS, resolveStyle, styleSummary } from "@/lib/client/montage/style";
import type { MontageDetail } from "@/lib/client/montage/types";
import type { Asset, AssetPage, MontageFormat, Skill } from "@/lib/shared/types";

const DEFAULT_STYLE = "reel-immersion";

/**
 * Nouveau montage : un titre, un style (skill « montage »), un format et des médias.
 * Préremplissage possible par lien : /montage?nouveau=1&assets=id1,id2&style=<slug>.
 */
export function NewMontageDialog({ open, onClose, initialAssetIds, initialStyle }: { open: boolean; onClose: () => void; initialAssetIds?: string[]; initialStyle?: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const styles = useResource<{ skills: Skill[] }>(open ? "/api/skills?kind=montage" : null, ["skills"]);
  const [title, setTitle] = useState("");
  const [styleSlug, setStyleSlug] = useState<string | null>(null);
  const [format, setFormat] = useState<MontageFormat>("9:16");
  const [formatTouched, setFormatTouched] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const preload = useResource<AssetPage>(open && initialAssetIds?.length ? `/api/assets${qs({ ids: initialAssetIds, limit: 300 })}` : null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setFormatTouched(false);
    setAssets([]);
    setStyleSlug(initialStyle ?? null);
  }, [open, initialStyle]);

  useEffect(() => {
    if (!open || !preload.data || !initialAssetIds?.length) return;
    const byId = new Map(preload.data.items.map((a) => [a.id, a]));
    setAssets(initialAssetIds.map((id) => byId.get(id)).filter((a): a is Asset => Boolean(a)));
  }, [open, preload.data, initialAssetIds]);

  const skills = useMemo(() => styles.data?.skills ?? [], [styles.data]);
  // Style par défaut : celui du lien, sinon Reel immersion, sinon le premier.
  useEffect(() => {
    if (!open || skills.length === 0) return;
    setStyleSlug((cur) => (cur && skills.some((s) => s.slug === cur) ? cur : skills.find((s) => s.slug === DEFAULT_STYLE)?.slug ?? skills[0].slug));
  }, [open, skills]);

  const resolved = useMemo(() => {
    const s = skills.find((x) => x.slug === styleSlug);
    return s ? resolveStyle(s.data, { slug: s.slug, name: s.name }).style : null;
  }, [skills, styleSlug]);

  useEffect(() => {
    if (resolved && !formatTouched) setFormat(resolved.format);
  }, [resolved, formatTouched]);

  async function create() {
    setBusy(true);
    try {
      const m = await api.post<MontageDetail>("/api/montages", {
        title: title.trim() || "Nouveau montage",
        spec: { style: styleSlug, ...(formatTouched || !resolved ? { format } : {}) },
        assetIds: assets.map((a) => a.id),
      });
      emitRefresh("montages");
      onClose();
      router.push(`/montage/${m.id}`);
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const visual = assets.filter((a) => a.kind !== "audio");
  const music = assets.find((a) => a.kind === "audio");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nouveau montage"
      description="Choisissez un style : il donne le rythme, les typographies, les transitions et le look."
      size="lg"
      footer={
        <>
          <span className="mr-auto text-[12.5px] text-muted">{visual.length ? `${visual.length} plan${visual.length > 1 ? "s" : ""}${music ? " + musique" : ""}` : "Vous pourrez ajouter les médias ensuite."}</span>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" loading={busy} onClick={create}>
            Créer le montage
          </Button>
        </>
      }
    >
      <div className="space-y-5 px-5 py-4">
        <div>
          <Label htmlFor="new-montage-title">Titre</Label>
          <Input id="new-montage-title" autoFocus value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Gîte de l'Abric — matin" onKeyDown={(e) => e.key === "Enter" && !busy && void create()} />
        </div>

        <fieldset>
          <legend className="mb-1.5 flex w-full items-baseline justify-between text-[12.5px] font-semibold text-ink">
            <span>Style</span>
            <Link href="/skills" className="font-normal text-chestnut hover:underline">
              Gérer les styles
            </Link>
          </legend>
          {styles.loading && !styles.data ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-[92px] rounded-xl" />
              ))}
            </div>
          ) : styles.error ? (
            <p className="rounded-xl bg-terracotta-soft px-3 py-2 text-[13px] text-terracotta">
              Styles indisponibles : {styles.error}{" "}
              <button type="button" className="font-semibold underline" onClick={() => void styles.reload()}>
                Réessayer
              </button>
            </p>
          ) : skills.length === 0 ? (
            <p className="rounded-xl bg-sunken px-3 py-2 text-[13px] text-muted">Aucun style de montage pour l'instant : le montage utilisera les réglages par défaut.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Style du montage">
              {skills.map((s) => {
                const on = s.slug === styleSlug;
                const r = resolveStyle(s.data).style;
                return (
                  <button
                    key={s.slug}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setStyleSlug(s.slug)}
                    className={cx(
                      "relative rounded-xl border px-3.5 py-3 text-left transition-colors",
                      on ? "border-chestnut bg-select ring-1 ring-chestnut" : "border-line bg-surface hover:border-line-strong hover:bg-hover",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-display text-[1.05rem] font-[400] text-ink">{s.name}</span>
                      {on ? <Check className="ml-auto h-4 w-4 text-chestnut" aria-hidden /> : null}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[12.5px] leading-snug text-muted">{s.description}</span>
                    <span className="mt-1.5 block text-[11.5px] font-semibold text-chestnut">{styleSummary(r)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-ink">Format</p>
          <Segmented
            label="Format"
            value={format}
            options={FORMATS.map((f) => ({ value: f, label: FORMAT_LABEL[f] }))}
            onChange={(f) => {
              setFormat(f);
              setFormatTouched(true);
            }}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[12.5px] font-semibold text-ink">Médias</p>
            {assets.length ? (
              <button type="button" className="text-[12px] text-muted hover:text-ink" onClick={() => setAssets([])}>
                Tout retirer
              </button>
            ) : null}
          </div>
          {assets.length ? (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {assets.map((a, i) => (
                <li key={a.id} className="group relative h-16 w-11 overflow-hidden rounded-md bg-night">
                  {a.urls.thumb || a.urls.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.urls.thumb ?? a.urls.poster ?? ""} alt={a.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-surface/60">{a.kind === "audio" ? <Music className="h-4 w-4" /> : a.kind === "video" ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}</span>
                  )}
                  <span className="absolute bottom-0 left-0.5 text-[10px] font-bold text-surface drop-shadow">{a.kind === "audio" ? "♪" : i + 1}</span>
                  <button
                    type="button"
                    aria-label={`Retirer ${a.name}`}
                    onClick={() => setAssets((xs) => xs.filter((x) => x.id !== a.id))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-night/70 p-0.5 text-surface opacity-0 focus:opacity-100 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <Button icon={<Images className="h-4 w-4" />} onClick={() => setPicker(true)}>
            {assets.length ? "Changer les médias" : "Choisir les médias"}
          </Button>
          <p className="mt-1.5 text-[12px] text-muted">Dans l'ordre de sélection, un plan par média ; un son devient la musique.</p>
        </div>
      </div>
      <MediaPickerDialog
        open={picker}
        onClose={() => setPicker(false)}
        kinds={["photo", "video", "audio"]}
        initial={assets.map((a) => a.id)}
        title="Choisir les médias du montage"
        confirmLabel="Utiliser"
        onPick={(list) => setAssets(list)}
      />
    </Dialog>
  );
}

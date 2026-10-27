"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { FieldError } from "@/components/skills/controls";
import { KindIcon } from "@/components/skills/KindIcon";
import { api, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { retitleBody, slugify } from "@/lib/client/skills/draft";
import { SKILL_KIND_HELP, SKILL_KIND_LABEL, SKILL_KINDS } from "@/lib/client/skills/kinds";
import type { Skill, SkillKind } from "@/lib/shared/types";

/** Création d'un skill : type, nom, description ; un style de montage peut partir d'un style existant. */
export function NewSkillDialog({ open, onClose, skills, initialKind }: { open: boolean; onClose: () => void; skills: Skill[]; initialKind?: SkillKind }) {
  const router = useRouter();
  const toast = useToast();
  const ids = useId();
  const [kind, setKind] = useState<SkillKind>("montage");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [base, setBase] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const montageStyles = useMemo(() => skills.filter((s) => s.kind === "montage"), [skills]);

  useEffect(() => {
    if (!open) return;
    setKind(initialKind ?? "montage");
    setName("");
    setDescription("");
    setTouched(false);
    setBase(montageStyles.find((s) => s.slug === "reel-immersion")?.slug ?? montageStyles[0]?.slug ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const slug = slugify(name);
  const nameError = !name.trim() ? "Donnez un nom au skill." : slug.length < 2 ? "Nom trop court." : null;
  const taken = slug.length >= 2 && skills.some((s) => s.slug === slug);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameError) return;
    setBusy(true);
    try {
      const from = kind === "montage" && base ? skills.find((s) => s.slug === base) : undefined;
      const created = await api.post<Skill>("/api/skills", {
        kind,
        name: name.trim(),
        description: description.trim(),
        body: from ? retitleBody(from.body, from.name, name) : `# ${name.trim()}\n\n`,
        data: from?.data ?? null,
      });
      emitRefresh("skills");
      toast(`Skill « ${created.name} » créé${from ? ` à partir de « ${from.name} »` : ""}`);
      onClose();
      router.push(`/skills/${created.slug}`);
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nouveau skill"
      description="Un savoir-faire que l'agent saura appliquer. Vous pourrez tout préciser ensuite."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" form={`${ids}-form`} loading={busy}>
            Créer le skill
          </Button>
        </>
      }
    >
      <form id={`${ids}-form`} onSubmit={submit} className="space-y-5 px-5 py-4" noValidate>
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink">Type</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SKILL_KINDS.map((k) => {
              const on = kind === k;
              return (
                <label
                  key={k}
                  className={cx(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-chestnut/40",
                    on ? "border-chestnut bg-select" : "border-line bg-surface hover:bg-hover",
                  )}
                >
                  <input type="radio" name={`${ids}-kind`} value={k} checked={on} onChange={() => setKind(k)} className="sr-only" />
                  <span className={cx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", on ? "bg-chestnut text-surface" : "bg-sunken text-chestnut")}>
                    <KindIcon kind={k} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-ink">{SKILL_KIND_LABEL[k]}</span>
                    <span className="block text-[12px] leading-snug text-muted">{SKILL_KIND_HELP[k]}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <Label htmlFor={`${ids}-name`}>Nom</Label>
          <Input
            id={`${ids}-name`}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            maxLength={120}
            placeholder={kind === "montage" ? "Ex. Reel montagne au petit matin" : "Ex. Légendes pour les restaurants"}
            aria-invalid={touched && nameError ? true : undefined}
            aria-describedby={touched && nameError ? `${ids}-name-err` : `${ids}-slug`}
          />
          {touched && nameError ? (
            <FieldError id={`${ids}-name-err`}>{nameError}</FieldError>
          ) : (
            <p id={`${ids}-slug`} className="mt-1 text-[12px] text-faint">
              {slug.length >= 2 ? (
                <>
                  Identifiant : <span className="font-mono text-muted">{slug}</span>
                  {taken ? " (déjà pris : un numéro sera ajouté)" : ""}
                </>
              ) : (
                "Un nom court et parlant : il apparaît dans la liste et dans l'agent."
              )}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor={`${ids}-desc`}>Description</Label>
          <Textarea
            id={`${ids}-desc`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Quand utiliser ce skill, en une à trois phrases."
            aria-describedby={`${ids}-desc-hint`}
          />
          <p className="mt-1 flex justify-between gap-3 text-[12px] text-muted">
            <span id={`${ids}-desc-hint`}>C'est ce que lit l'agent pour savoir quand utiliser ce skill.</span>
            <span className="shrink-0 tabular-nums text-faint">{description.length}/1000</span>
          </p>
        </div>

        {kind === "montage" ? (
          <div>
            <Label htmlFor={`${ids}-base`}>Partir de</Label>
            <Select id={`${ids}-base`} value={base} onChange={(e) => setBase(e.target.value)} aria-describedby={`${ids}-base-hint`}>
              <option value="">Un style vierge</option>
              {montageStyles.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </Select>
            <p id={`${ids}-base-hint`} className="mt-1 text-[12px] text-muted">
              {base ? "Les consignes et les paramètres de ce style sont copiés : vous n'avez plus qu'à les ajuster." : "Vous remplirez les paramètres vous-même."}
            </p>
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}

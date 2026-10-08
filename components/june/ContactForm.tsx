"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PRESTATIONS } from "@/lib/offres";
import { CONTACT_EMAIL } from "@/lib/site";

/*
   Formulaire « Start a project ». Validation côté client, pot de miel et
   délai minimal contre les robots, consentement RGPD, confirmation réelle.
   Envoi via /api/contact (Supabase si configuré, sinon repli e-mail).
*/
type Errors = Partial<Record<"nom" | "email" | "etablissement" | "prestation" | "message" | "rgpd", string>>;

function Field({ id, label, error, optional, children }: { id: string; label: string; error?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className={error ? "cf__field is-invalid" : "cf__field"}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="cf__opt"> — facultatif</span>}
      </label>
      {children}
      {error && (
        <p className="cf__err" id={`${id}-err`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ContactForm() {
  const params = useSearchParams();
  const preset = params.get("prestation") ?? "";
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const started = useRef<number>(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);

  function validate(fd: FormData): Errors {
    const e: Errors = {};
    if (!String(fd.get("nom") ?? "").trim()) e.nom = "Indiquez votre nom et prénom.";
    const email = String(fd.get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Indiquez un email valide pour que je puisse vous répondre.";
    if (!String(fd.get("etablissement") ?? "").trim()) e.etablissement = "Indiquez le nom de votre établissement.";
    if (!String(fd.get("prestation") ?? "")) e.prestation = "Choisissez une prestation, ou « Je souhaite être conseillée ».";
    if (String(fd.get("message") ?? "").trim().length < 20) e.message = "Décrivez votre projet en quelques phrases (20 caractères minimum).";
    if (!fd.get("rgpd")) e.rgpd = "Merci d'accepter que vos informations soient utilisées pour vous répondre.";
    return e;
  }

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const fd = new FormData(form);
    const e = validate(fd);
    setErrors(e);
    setServerError(null);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const payload = {
      nom: String(fd.get("nom")).trim(),
      email: String(fd.get("email")).trim(),
      etablissement: String(fd.get("etablissement")).trim(),
      site: String(fd.get("site") ?? "").trim(),
      prestation: String(fd.get("prestation")),
      periode: String(fd.get("periode") ?? "").trim(),
      message: String(fd.get("message")).trim(),
      website: String(fd.get("website") ?? ""),
      elapsed: Date.now() - started.current,
    };
    setStatus("sending");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erreur");
      if (data.fallback === "mailto") {
        const subject = encodeURIComponent(`${payload.prestation} — ${payload.etablissement}`);
        const body = encodeURIComponent(`Nom : ${payload.nom}\nEmail : ${payload.email}\nÉtablissement : ${payload.etablissement}\nSite / Instagram : ${payload.site}\nPrestation : ${payload.prestation}\nPériode : ${payload.periode}\n\n${payload.message}`);
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error && err.message !== "Erreur" ? err.message : "L'envoi n'a pas fonctionné. Réessayez, ou écrivez-moi directement par email.");
    }
  }

  if (status === "sent") {
    return (
      <div className="cf__done" role="status">
        <p className="k">Message envoyé</p>
        <p className="d cf__done-title">Merci, je reviens vers vous très vite.</p>
        <p className="muted">Je prends le temps de regarder votre univers avant de vous répondre, en général sous 48 h.</p>
      </div>
    );
  }

  return (
    <form className="cf" onSubmit={onSubmit} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="cf__hp" defaultValue="" />
      <div className="cf__row">
        <Field id="nom" label="Nom et prénom" error={errors.nom}>
          <input id="nom" name="nom" type="text" autoComplete="name" required aria-invalid={!!errors.nom} aria-describedby={errors.nom ? "nom-err" : undefined} />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} />
        </Field>
      </div>
      <div className="cf__row">
        <Field id="etablissement" label="Nom de l'établissement" error={errors.etablissement}>
          <input id="etablissement" name="etablissement" type="text" autoComplete="organization" required aria-invalid={!!errors.etablissement} aria-describedby={errors.etablissement ? "etablissement-err" : undefined} />
        </Field>
        <Field id="site" label="Site ou Instagram" optional>
          <input id="site" name="site" type="text" autoComplete="url" placeholder="@votrelieu ou votrelieu.fr" />
        </Field>
      </div>
      <div className="cf__row">
        <Field id="prestation" label="Prestation souhaitée" error={errors.prestation}>
          <select id="prestation" name="prestation" defaultValue={PRESTATIONS.includes(preset as (typeof PRESTATIONS)[number]) ? preset : ""} required aria-invalid={!!errors.prestation} aria-describedby={errors.prestation ? "prestation-err" : undefined}>
            <option value="" disabled>
              Choisir…
            </option>
            {PRESTATIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field id="periode" label="Période du projet" optional>
          <input id="periode" name="periode" type="text" placeholder="Ex. : hiver 26/27, mai 2027…" />
        </Field>
      </div>
      <Field id="message" label="Description du projet" error={errors.message}>
        <textarea id="message" name="message" rows={5} required placeholder="Votre lieu, ce que vos clients viennent y vivre, et ce que vous aimeriez mettre en lumière." aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-err" : undefined} />
      </Field>
      <div className={errors.rgpd ? "cf__check is-invalid" : "cf__check"}>
        <input id="rgpd" name="rgpd" type="checkbox" required aria-invalid={!!errors.rgpd} aria-describedby={errors.rgpd ? "rgpd-err" : undefined} />
        <label htmlFor="rgpd">
          J&apos;accepte que ces informations soient utilisées pour répondre à ma demande.{" "}
          <a className="link" href="/confidentialite">
            Politique de confidentialité
          </a>
        </label>
        {errors.rgpd && (
          <p className="cf__err" id="rgpd-err" role="alert">
            {errors.rgpd}
          </p>
        )}
      </div>
      {serverError && (
        <p className="cf__err cf__err--server" role="alert">
          {serverError}
        </p>
      )}
      <button type="submit" className="btn btn--fill btn--up" disabled={status === "sending"}>
        {status === "sending" ? "Envoi en cours…" : "Envoyer ma demande"}
      </button>
    </form>
  );
}

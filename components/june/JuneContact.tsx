"use client";

import { useEffect, useRef, useState } from "react";

type FormStatus = "idle" | "sending" | "success" | "error";

const CONTACT_EMAIL = "harmonieyacht@gmail.com";

/** Formulaire court de la page d'accueil. Les boutons [data-offre] renseignent le champ caché. */
export default function JuneContact() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const offreRef = useRef<HTMLInputElement>(null);

  // Les boutons d'offre (data-offre) présélectionnent le sujet du formulaire.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>("[data-offre]");
      if (!a || !offreRef.current) return;
      offreRef.current.value = a.dataset.offre ?? "";
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      nom: String(formData.get("nom") ?? "").trim(),
      lieu: String(formData.get("lieu") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };
    const site = String(formData.get("site") ?? "").trim();
    if (site) payload.message = `${payload.message}\n\nInstagram / site : ${site}`.trim();
    const offre = String(formData.get("offre") ?? "").trim();
    if (offre) payload.message = `[${offre}] ${payload.message}`.trim();

    if (!payload.email) {
      setStatus("error");
      setErrorMessage("Indiquez un email pour qu'on puisse vous répondre.");
      return;
    }

    setStatus("sending");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Une erreur est survenue.");
      }

      if (data.fallback === "mailto") {
        const subject = encodeURIComponent(
          `Content Experience : ${payload.lieu || payload.nom}`
        );
        const body = encodeURIComponent(
          `Nom : ${payload.nom}\nLieu : ${payload.lieu}\nEmail : ${payload.email}\n\n${payload.message}`
        );
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      }

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setErrorMessage(
        "L'envoi n'a pas fonctionné. Réessayez, ou écrivez-nous directement par email."
      );
    }
  }

  return (
    <form className="j-form" onSubmit={handleSubmit} noValidate>
      <input type="hidden" name="offre" ref={offreRef} defaultValue="" />
      <div className="j-form__row">
        <div className="j-field">
          <label htmlFor="nom">Nom</label>
          <input id="nom" name="nom" type="text" autoComplete="name" required placeholder="Camille Durand" />
        </div>
        <div className="j-field">
          <label htmlFor="lieu">Établissement</label>
          <input id="lieu" name="lieu" type="text" autoComplete="organization" placeholder="Le Chalet des Cimes" />
        </div>
      </div>
      <div className="j-form__row">
        <div className="j-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="vous@votrelieu.fr" />
        </div>
        <div className="j-field">
          <label htmlFor="site">Instagram / site</label>
          <input id="site" name="site" type="text" autoComplete="url" placeholder="@votrelieu ou votrelieu.fr" />
        </div>
      </div>
      <div className="j-field">
        <label htmlFor="message">Parlez-moi de votre expérience / votre besoin</label>
        <textarea id="message" name="message" rows={4} placeholder="Ce que vos clients vivent chez vous, et ce que vous aimeriez réussir à mieux faire ressentir." />
      </div>

      {status === "error" && errorMessage && (
        <p role="alert" className="j-form__status j-form__status--error">
          {errorMessage}
        </p>
      )}
      {status === "success" && (
        <p role="status" className="j-form__status">
          Merci, on revient vers vous très vite.
        </p>
      )}

      <button type="submit" disabled={status === "sending"}>
        {status === "sending"
          ? "Envoi en cours…"
          : status === "success"
            ? "Demande envoyée"
            : "Envoyer mon projet →"}
      </button>
    </form>
  );
}

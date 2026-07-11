"use client";

import { useState } from "react";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";

type FormStatus = "idle" | "sending" | "success" | "error";

const CONTACT_EMAIL = "harmonieyacht@gmail.com";

export default function Contact() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        // Pas de base de données configurée : on ouvre le client mail prérempli.
        const subject = encodeURIComponent(
          `Demande de shooting — ${payload.lieu || payload.nom}`
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
    <section id="contact" className="contact py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <div className="mx-auto max-w-xl">
          <Reveal>
            <Eyebrow>Réservation</Eyebrow>
            <h2 className="mt-4 font-display text-[clamp(28px,4vw,44px)] leading-tight">
              Envie de voir ce que ça donnerait <em className="italic text-chestnut">chez vous</em> ?
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Écrivez-nous quelques mots sur votre lieu. On revient vers vous
              rapidement pour en parler.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <form className="mt-10 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="nom" className="text-sm font-semibold">
                    Votre nom
                  </label>
                  <input
                    id="nom"
                    name="nom"
                    type="text"
                    autoComplete="name"
                    required
                    className="rounded-xl border border-line bg-cream px-4 py-3 text-espresso placeholder:text-muted/60"
                    placeholder="Camille Durand"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="lieu" className="text-sm font-semibold">
                    Nom du lieu
                  </label>
                  <input
                    id="lieu"
                    name="lieu"
                    type="text"
                    autoComplete="organization"
                    className="rounded-xl border border-line bg-cream px-4 py-3 text-espresso placeholder:text-muted/60"
                    placeholder="La Table du Port"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-semibold">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="rounded-xl border border-line bg-cream px-4 py-3 text-espresso placeholder:text-muted/60"
                  placeholder="vous@votrelieu.fr"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="message" className="text-sm font-semibold">
                  Votre message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  className="rounded-xl border border-line bg-cream px-4 py-3 text-espresso placeholder:text-muted/60"
                  placeholder="Parlez-nous de votre lieu et de ce que vous aimeriez montrer."
                />
              </div>

              {status === "error" && errorMessage && (
                <p role="alert" className="text-sm font-medium text-chestnut">
                  {errorMessage}
                </p>
              )}
              {status === "success" && (
                <p role="status" className="text-sm font-medium text-espresso">
                  Merci, on revient vers vous très vite.
                </p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="mt-2 self-start rounded-full bg-espresso px-7 py-3.5 text-sm font-semibold text-cream shadow-soft transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending"
                  ? "Envoi en cours…"
                  : status === "success"
                    ? "Demande envoyée"
                    : "Réserver un shooting"}
              </button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

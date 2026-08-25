"use client";

import { useState } from "react";

type FormStatus = "idle" | "sending" | "success" | "error";

const CONTACT_EMAIL = "harmonieyacht@gmail.com";

/** Formulaire de la plaque du soir. Même API que l'ancien Contact.tsx. */
export default function JuneContact() {
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
        const subject = encodeURIComponent(
          `Demande de shooting : ${payload.lieu || payload.nom}`
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
      <div className="j-form__row">
        <div className="j-field">
          <label htmlFor="nom">Votre nom</label>
          <input
            id="nom"
            name="nom"
            type="text"
            autoComplete="name"
            required
            placeholder="Camille Durand"
          />
        </div>
        <div className="j-field">
          <label htmlFor="lieu">Nom du lieu</label>
          <input
            id="lieu"
            name="lieu"
            type="text"
            autoComplete="organization"
            placeholder="La Table du Port"
          />
        </div>
      </div>

      <div className="j-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="vous@votrelieu.fr"
        />
      </div>

      <div className="j-field">
        <label htmlFor="message">Votre message</label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Parlez-nous de votre lieu et de ce que vous aimeriez montrer."
        />
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
            : "Réserver un shooting"}
      </button>
    </form>
  );
}

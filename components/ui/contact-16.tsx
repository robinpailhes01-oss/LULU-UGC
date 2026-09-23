"use client";

import * as React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONTACT_EMAIL } from "@/lib/site";

/*
   Formulaire centré adapté de 21st.dev (contact-16). Même envoi que le
   formulaire actuel : /api/contact, avec repli mailto tant que Supabase
   n'est pas configuré.
*/
export default function Contact16({ label, title, sub }: { label: string; title: string; sub: string }) {
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      nom: String(fd.get("nom") ?? "").trim(),
      lieu: String(fd.get("lieu") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      message: String(fd.get("message") ?? "").trim(),
    };
    if (!payload.email) return setState("error");
    setState("sending");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (data.fallback === "mailto") {
        const subject = encodeURIComponent(`Content Experience : ${payload.lieu || payload.nom}`);
        const body = encodeURIComponent(`Nom : ${payload.nom}\nÉtablissement : ${payload.lieu}\nEmail : ${payload.email}\n\n${payload.message}`);
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      }
      setState("sent");
      form.reset();
    } catch {
      setState("error");
    }
  }

  return (
    <section className="bg-ivory py-24 md:py-32" id="contact" aria-label="Contact">
      <div className="mx-auto max-w-lg px-6 sm:px-8">
        {state === "sent" ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-ink/5">
              <CheckCircle2 className="size-6 text-brown" />
            </span>
            <h2 className="font-display text-3xl text-ink" style={{ fontWeight: 340 }}>
              Message reçu
            </h2>
            <p className="text-taupe">Je vous réponds personnellement, en général sous 48 h.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="k">{label}</p>
              <h2 className="font-display text-[clamp(2rem,1.1rem+2.9vw,3.4rem)] leading-[1.04] text-ink [font-variation-settings:'opsz'_144,'SOFT'_10]" style={{ fontWeight: 340 }}>
                {title}
              </h2>
              <p className="max-w-md text-taupe">{sub}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex flex-col gap-1.5 sm:flex-1">
                  <label htmlFor="v2-nom" className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-taupe">
                    Nom
                  </label>
                  <Input id="v2-nom" name="nom" placeholder="Camille Durand" autoComplete="name" required />
                </div>
                <div className="flex flex-col gap-1.5 sm:flex-1">
                  <label htmlFor="v2-lieu" className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-taupe">
                    Établissement
                  </label>
                  <Input id="v2-lieu" name="lieu" placeholder="Le Chalet des Cimes" autoComplete="organization" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="v2-email" className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-taupe">
                  Email
                </label>
                <Input id="v2-email" name="email" type="email" placeholder="vous@votrelieu.fr" autoComplete="email" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="v2-msg" className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-taupe">
                  Parlez-moi de votre expérience
                </label>
                <textarea id="v2-msg" name="message" rows={5} placeholder="Ce que vos clients vivent chez vous, et ce que vous aimeriez réussir à mieux faire ressentir." className="flex w-full resize-none rounded-md border border-ink/20 bg-white/40 px-3.5 py-2.5 text-[0.95rem] text-ink placeholder:text-taupe/60 transition-colors focus-visible:border-brown focus-visible:bg-white/70 focus-visible:outline-none" />
              </div>
              {state === "error" && <p className="text-sm text-[#9a4a2f]">Indiquez un email pour qu&apos;on puisse vous répondre.</p>}
              <Button type="submit" size="lg" className="mt-2 w-full" disabled={state === "sending"}>
                {state === "sending" ? "Envoi en cours…" : "Envoyer mon projet"}
                <ArrowRight className="size-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

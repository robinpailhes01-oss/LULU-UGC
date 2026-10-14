import type { Metadata } from "next";
import { Suspense } from "react";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import SiteNav from "@/components/june/SiteNav";
import SiteFooter from "@/components/june/SiteFooter";
import Split from "@/components/june/Split";
import ContactForm from "@/components/june/ContactForm";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact · parlons de votre projet de contenu",
  description: "Hébergement indépendant, spa, institut ou retraite bien-être : parlez à June de votre projet de Reels, photos et publications. Demande en quelques clics, réponse personnelle.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <>
      <JuneV3Engine />
      <SiteNav />
      <main id="top">
        <section className="pf light contact" aria-label="Start a project">
          <div className="wrap contact__grid">
            <div className="contact__head">
              <p className="k rv">Contact</p>
              <Split as="h1" className="d h1" delay={80}>
                Parlons de <em>votre projet.</em>
              </Split>
              <p className="pf__lede rv" style={{ "--rd": "160ms" } as React.CSSProperties}>Parlez-moi de votre lieu ou de votre activité, et de ce que vous aimeriez faire découvrir.</p>
              <p className="contact__direct rv" style={{ "--rd": "220ms" } as React.CSSProperties}>
                Ou directement par email :{" "}
                <a className="link" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
            <div className="contact__form rv" style={{ "--rd": "140ms" } as React.CSSProperties}>
              <Suspense fallback={null}>
                <ContactForm />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

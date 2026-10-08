import type { Metadata } from "next";
import { Suspense } from "react";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import SiteNav from "@/components/june/SiteNav";
import SiteFooter from "@/components/june/SiteFooter";
import Split from "@/components/june/Split";
import ContactForm from "@/components/june/ContactForm";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Start a project · parler de votre établissement à June",
  description: "Parlez à June Content Studio de votre hôtel, hébergement, spa, restaurant ou expérience. Demande de collaboration en quelques clics, réponse personnelle.",
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
              <p className="k rv">Start a project</p>
              <Split as="h1" className="d h1" delay={80}>
                Let&apos;s create <em>together.</em>
              </Split>
              <p className="pf__lede rv" style={{ "--rd": "160ms" } as React.CSSProperties}>Parlez-moi de votre établissement et de l&apos;expérience que vous souhaitez mettre en lumière.</p>
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

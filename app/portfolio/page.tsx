import type React from "react";
import type { Metadata } from "next";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import SiteNav from "@/components/june/SiteNav";
import WorkGallery from "@/components/june/WorkGallery";
import SiteFooter from "@/components/june/SiteFooter";
import { CTA } from "@/lib/site";
import { works } from "@/lib/work";

export const metadata: Metadata = {
  title: "Réalisations · June",
  description: "Vidéos, vidéos vécues et photos réalisées par June pour des hôtels, des gîtes, des expériences et des lieux qui se vivent.",
};

export default function PortfolioPage() {
  return (
    <>
      <JuneV3Engine />
      <SiteNav home={false} />

      <main id="top">
        <section className="pf light" aria-label="Réalisations">
          <div className="wrap pf__inner">
            <p className="k rv">Réalisations</p>
            <h1 className="d h1 rv" style={{ "--rd": "80ms" } as React.CSSProperties}>
              Le travail de June, <em>tel qu&apos;il a été publié.</em>
            </h1>
            <p className="pf__lede rv" style={{ "--rd": "160ms" } as React.CSSProperties}>
              Les vidéos se lancent au survol ou au défilement. Cliquez pour voir le contenu sur Instagram.
            </p>
          </div>
        </section>

        <section className="work light" aria-label="Toutes les réalisations">
          <div className="wrap">
            <WorkGallery works={works} all />
          </div>
        </section>

        <section className="sand" aria-label="Contact">
          <div className="wrap pf__end">
            <p className="k rv">Parlons de votre expérience</p>
            <h2 className="d h2 rv" style={{ "--rd": "80ms" } as React.CSSProperties}>
              Vous avez une expérience à faire vivre ? <em>Voyons comment la raconter.</em>
            </h2>
            <a className="btn btn--fill rv" style={{ "--rd": "160ms" } as React.CSSProperties} href="/#contact">
              {CTA}
            </a>
          </div>
        </section>
      </main>
      <SiteFooter home={false} />
    </>
  );
}

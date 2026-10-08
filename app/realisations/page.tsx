import type { Metadata } from "next";
import type React from "react";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import SiteNav from "@/components/june/SiteNav";
import SiteFooter from "@/components/june/SiteFooter";
import Split from "@/components/june/Split";
import Portfolio from "@/components/june/Portfolio";
import { PROJETS } from "@/lib/projets";
import { CTA, CTA_HREF, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Réalisations · vidéos immersives et photos pour hôtels et expériences",
  description: "Les projets de June Content Studio, créatrice de contenu hôtelier : vidéos immersives et photographies pour hôtels, gîtes, spas, restaurants et expériences touristiques, regroupés par établissement.",
  alternates: { canonical: `${SITE_URL}/realisations` },
};

const rv = (ms: number) => ({ "--rd": `${ms}ms` }) as React.CSSProperties;

export default function RealisationsPage() {
  return (
    <>
      <JuneV3Engine />
      <SiteNav />
      <main id="top">
        <section className="pf light" aria-label="Réalisations">
          <div className="wrap pf__inner">
            <p className="k rv">Selected work</p>
            <Split as="h1" className="d h1" delay={80}>
              Des expériences <em>racontées par June.</em>
            </Split>
            <p className="pf__lede rv" style={rv(160)}>Chaque projet regroupe les vidéos et photographies créées pour un établissement ou une expérience. Les vidéos se lancent au survol ou au défilement ; cliquez pour voir le contenu publié.</p>
          </div>
        </section>
        <Portfolio projets={PROJETS} />
        <section className="sand" aria-label="Contact">
          <div className="wrap pf__end">
            <Split as="h2" className="d h2" delay={0}>
              Let&apos;s tell <em>your story.</em>
            </Split>
            <a className="btn btn--fill btn--up rv" style={rv(120)} href={CTA_HREF}>
              {CTA}
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

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
  title: "Réalisations · Reels et photos pour hébergements, bien-être et expériences",
  description: "Les projets de June Content Studio : Reels, vidéos et photographies créés pour des hôtels, gîtes, cabinets bien-être, restaurants et expériences, regroupés par établissement. Montpellier, Occitanie, Alpe d'Huez.",
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
            <p className="k rv">Réalisations</p>
            <Split as="h1" className="d h1" delay={80}>
              Des lieux, des rencontres, <em>des expériences à raconter.</em>
            </Split>
            <p className="pf__lede rv" style={rv(160)}>Chaque projet regroupe les vidéos et photographies créées pour un établissement ou une expérience. Les vidéos se lancent au survol ou au défilement ; cliquez pour voir le contenu publié.</p>
          </div>
        </section>
        <Portfolio projets={PROJETS} />
        <section className="sand" aria-label="Contact">
          <div className="wrap pf__end">
            <Split as="h2" className="d h2" delay={0}>
              Vous avez une expérience <em>à faire découvrir ?</em>
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

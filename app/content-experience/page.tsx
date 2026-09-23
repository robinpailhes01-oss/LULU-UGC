import type { Metadata } from "next";
import type React from "react";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import SiteNav from "@/components/june/SiteNav";
import SiteFooter from "@/components/june/SiteFooter";
import Split from "@/components/june/Split";

export const metadata: Metadata = {
  title: "Content Experience · June",
  description: "Le détail de l'accompagnement Content Experience : regard extérieur, recommandations, direction créative, immersion et création. À partir de 490 € TTC.",
};

const rv = (ms: number) => ({ "--rd": `${ms}ms` }) as React.CSSProperties;

const DETAIL: Array<[string, string]> = [
  ["Échange & analyse du besoin", "Comprendre où vous en êtes et ce que vous souhaitez réellement travailler."],
  ["Regard sur l'expérience client", "Identifier ce qui mérite d'être révélé."],
  ["Direction créative & storytelling", "Trouver les histoires, angles et intentions."],
  ["Immersion sur place", "Vivre et créer au cœur de l'expérience."],
  ["Création & post-production", "Selon les formats définis ensemble : Reels, UGC, vidéos immersives, photos & lifestyle, stories."],
  ["Content board", "Organiser les contenus créés et faciliter leur utilisation."],
];

export default function ContentExperiencePage() {
  return (
    <>
      <JuneV3Engine />
      <SiteNav home={false} />
      <main id="top">
        <section className="pf light" aria-label="Content Experience">
          <div className="wrap pf__inner">
            <p className="k rv">Work with June</p>
            <Split as="h1" className="d h1 h1--caps" delay={80}>
              Content{" "}
              <span className="nowrap">
                Experience <span className="star">✦</span>
              </span>
            </Split>
            <p className="pf__lede rv" style={rv(160)}>Une Content Experience est construite autour de votre expérience, de vos objectifs et de ce que nous souhaitons raconter. Voici ce qu&apos;elle comprend.</p>
          </div>
        </section>

        <section className="sand detail" aria-label="Ce que comprend une Content Experience">
          <div className="wrap detail__grid">
            <ul className="detail__list rv">
              {DETAIL.map(([t, p], i) => (
                <li key={t}>
                  <span className="detail__n">0{i + 1}</span>
                  <b>{t}</b>
                  <p>{p}</p>
                </li>
              ))}
            </ul>
            <aside className="detail__side rv" style={rv(120)}>
              <p className="offre__price">
                À partir de 490 <span className="eur">€ TTC</span>
              </p>
              <p className="muted">Chaque projet étant différent, la Content Experience est adaptée à vos besoins après notre premier échange. Un devis est réalisé avant tout engagement.</p>
              <p className="muted">Les contenus sont prévus pour vos réseaux et vos supports. Pour une utilisation publicitaire, des droits supplémentaires peuvent être ajoutés.</p>
              <a className="btn btn--fill" href="/#contact">
                Parler de mon expérience
              </a>
            </aside>
          </div>
        </section>

        <section className="light" aria-label="Et avant ?">
          <div className="wrap pf__end">
            <p className="k rv">Avant tout engagement</p>
            <Split as="h2" className="d h2" delay={80}>
              On commence simplement <em>par parler de votre projet.</em>
            </Split>
            <p className="pf__lede rv" style={rv(160)}>Vous me racontez votre établissement et ce que vous aimeriez mieux faire ressentir. Je prends un premier regard extérieur, et on voit ensemble si mon approche répond à votre besoin.</p>
            <a className="btn rv" style={rv(240)} href="/#contact">
              Parler de mon projet
            </a>
          </div>
        </section>
      </main>
      <SiteFooter home={false} />
    </>
  );
}

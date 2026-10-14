import type { Metadata } from "next";
import type React from "react";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import SiteNav from "@/components/june/SiteNav";
import SiteFooter from "@/components/june/SiteFooter";
import Split from "@/components/june/Split";
import Faq from "@/components/june/Faq";
import { EVENT, EXTRAS, EXTRAS_TITRE, OFFRE } from "@/lib/offres";
import { PRICE_HIDDEN_TEXT, PRICE_SCOPE_NOTE, priceLabel } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Experience Content Day · Reels, photos et contenus prêts à partager",
  description: "Une session de création photo et vidéo, des semaines de contenus prêts à publier : Reels, photos retouchées, carrousels et Content Board. Pour les hébergements indépendants et les professionnels du bien-être, à Montpellier, en Occitanie et à l'Alpe d'Huez.",
  alternates: { canonical: `${SITE_URL}/offre` },
};

const rv = (ms: number) => ({ "--rd": `${ms}ms` }) as React.CSSProperties;
const contact = (p: string) => `/contact?projet=${encodeURIComponent(p)}`;

export default function OffrePage() {
  const price = priceLabel(OFFRE.slug);
  return (
    <>
      <JuneV3Engine />
      <SiteNav />
      <main id="top">
        {/* En-tête */}
        <section className="pf light offre-hero" id={OFFRE.slug} aria-label={OFFRE.nom}>
          <div className="wrap offre-hero__grid">
            <div className="pf__inner">
              <p className="k rv">{OFFRE.nom}</p>
              <Split as="h1" className="d h1" delay={80}>
                {OFFRE.h1}
              </Split>
              <p className="pf__lede rv" style={rv(160)}>{OFFRE.sousTitre}</p>
              <a className="btn btn--fill btn--up rv" style={rv(240)} href={contact(OFFRE.nom)}>
                Parler de mon projet
              </a>
            </div>
            <figure className="offre-hero__media plate plate--photo rv rv--mask" data-dev>
              <img src="/wall/gite.jpg" alt="Petit-déjeuner sous la treille dans un gîte des Cévennes, contenu créé par June" width={393} height={633} loading="eager" decoding="async" style={{ "--pos": "50% 30%" } as React.CSSProperties} />
            </figure>
          </div>
        </section>

        {/* Livrables */}
        <section className="sand liv" aria-label="Ce que vous recevez">
          <div className="wrap">
            <div className="sec__head">
              <p className="k rv">Inclus</p>
              <Split as="h2" className="d h2" delay={80}>
                {OFFRE.accroche}
              </Split>
            </div>
            <div className="liv__grid">
              {OFFRE.livrables.map((l, i) => (
                <div className="liv__it rv" style={rv(i * 90)} key={l.titre}>
                  <p className="liv__n d">{l.n}</p>
                  <h3 className="d">{l.titre}</h3>
                  <p>{l.texte}</p>
                </div>
              ))}
            </div>
            <div className="board rv" style={rv(200)}>
              <div className="board__head">
                <p className="k">✦ {OFFRE.board.titre}</p>
                <p className="board__text">{OFFRE.board.texte}</p>
              </div>
              <ul className="board__list">
                {OFFRE.board.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
            <p className="muted liv__note rv">{OFFRE.rythme}</p>
          </div>
        </section>

        {/* Processus */}
        <section className="light proc" aria-label="Comment ça se passe">
          <div className="wrap proc__grid">
            <div className="proc__head">
              <p className="k rv">Méthode</p>
              <Split as="h2" className="d h2" delay={80}>
                Cinq étapes, <em>sans rien à gérer de votre côté.</em>
              </Split>
            </div>
            <ol className="proc__list">
              {OFFRE.processus.map((p, i) => (
                <li className="rv" style={rv(i * 80)} key={p}>
                  <span className="proc__n d">0{i + 1}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Tarification */}
        <section className="night prix" data-dark aria-label="Tarification">
          <div className="wrap prix__grid">
            <div>
              <p className="k rv">Tarif</p>
              <Split as="h2" className="d h2" delay={80}>
                {price ?? PRICE_HIDDEN_TEXT}
              </Split>
            </div>
            <div className="prix__copy">
              <p className="rv" style={rv(160)}>{PRICE_SCOPE_NOTE}</p>
              <a className="btn btn--fill btn--up rv" style={rv(240)} href={contact(OFFRE.nom)}>
                Parler de mon projet
              </a>
            </div>
          </div>
        </section>

        {/* Extras */}
        <section className="light extras" id="extras" aria-label="Les extras à la carte">
          <div className="wrap">
            <div className="sec__head">
              <p className="k rv">Les extras à la carte</p>
              <Split as="h2" className="d h2" delay={80}>
                {EXTRAS_TITRE}
              </Split>
            </div>
            <ul className="extras__list">
              {EXTRAS.map((e, i) => (
                <li className="extras__it rv" style={rv(i * 70)} key={e.nom}>
                  <h3 className="d">{e.nom}</h3>
                  <p>{e.texte}</p>
                  <a className="link-arrow" href={contact("Création à la carte")}>
                    Parler de mon projet
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Event coverage */}
        <section className="sand event" id="event-coverage" aria-label="Event Coverage">
          <div className="wrap event__grid">
            <figure className="event__media plate plate--photo rv rv--mask" data-dev>
              <img src={EVENT.image} alt="Groupe d'amis à bord d'un yacht au coucher du soleil, couverture d'événement par June" width={1179} height={1456} loading="lazy" decoding="async" style={{ "--pos": "50% 35%" } as React.CSSProperties} />
            </figure>
            <div className="event__copy">
              <p className="k rv">Event Coverage</p>
              <Split as="h2" className="d h2" delay={80}>
                {EVENT.titre}
              </Split>
              <p className="ed rv" style={rv(160)}>{EVENT.pour}</p>
              <ul className="event__list rv" style={rv(220)}>
                {EVENT.possibilites.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="muted rv" style={rv(260)}>{EVENT.note}</p>
              <a className="btn btn--up rv" style={rv(320)} href={contact("Event Coverage")}>
                Demander un devis
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq light" id="faq" aria-label="Questions fréquentes">
          <div className="wrap faq__grid">
            <div className="faq__head">
              <p className="k rv">Questions fréquentes</p>
              <Split as="h2" className="d h2" delay={80}>
                Ce que l&apos;on me demande <em>le plus souvent.</em>
              </Split>
            </div>
            <div className="rv" style={rv(120)}>
              <Faq items={OFFRE.faq.map(([q, a]) => [q, [a]] as [string, string[]])} />
            </div>
          </div>
        </section>

        <section className="sand" aria-label="Contact">
          <div className="wrap pf__end">
            <Split as="h2" className="d h2" delay={0}>
              Parlons de <em>votre expérience.</em>
            </Split>
            <a className="btn btn--fill btn--up rv" style={rv(120)} href={contact(OFFRE.nom)}>
              Parler de mon projet
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

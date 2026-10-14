import type React from "react";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import SiteNav from "@/components/june/SiteNav";
import SiteFooter from "@/components/june/SiteFooter";
import Split from "@/components/june/Split";
import Media from "@/components/june/Media";
import ProjectCard from "@/components/june/ProjectCard";
import { CTA, CTA_HREF, LIEUX, METHODE, SAISON, VIDEO } from "@/lib/site";
import { OFFRE } from "@/lib/offres";
import { PROJETS } from "@/lib/projets";

/*
   Accueil : hero, le problème, l'offre signature, réalisations, méthode,
   à propos, appel final. Textes et offre centralisés dans lib/.
*/
const rv = (ms: number) => ({ "--rd": `${ms}ms` }) as React.CSSProperties;

export default function Home() {
  const selected = PROJETS.filter((p) => p.home).slice(0, 3);
  return (
    <>
      <JuneV3Engine />
      <SiteNav />
      <main id="top">
        {/* 01 — Hero */}
        <section className="hero" data-dark aria-label="June Content Studio">
          <Media video={VIDEO.hero} poster="/hero.jpg" alt="Ludivine photographie un petit-déjeuner dans une chambre d'hôte avec vue sur les montagnes" pos="72% 50%" w={1672} h={941} eager px={30} />
          <div className="hero__inner">
            <p className="k hero__k rise" style={{ "--d": "100ms" } as React.CSSProperties}>
              Studio de création de contenu
            </p>
            <Split as="h1" className="d hero__title hero__title--sm" delay={250}>
              Vous faites vivre l&apos;expérience. <em>Je crée les contenus pour la faire découvrir.</em>
            </Split>
            <p className="hero__lede rise" style={{ "--d": "700ms" } as React.CSSProperties}>
              Photos, Reels et publications prêts à partager pour les hébergements indépendants et les expériences bien-être. Une communication professionnelle, sans avoir à tout créer vous-même.
            </p>
            <div className="hero__ctas rise" style={{ "--d": "820ms" } as React.CSSProperties}>
              <a className="btn btn--light btn--up" href="/offre">
                Découvrir l&apos;offre
              </a>
              <a className="link-arrow" href="/realisations">
                Voir les réalisations
              </a>
            </div>
          </div>
          <div className="hero__foot rise" style={{ "--d": "950ms" } as React.CSSProperties}>
            <span>{LIEUX}</span>
          </div>
        </section>

        {/* 02 — Le problème */}
        <section className="probleme light" aria-label="Le point de départ">
          <div className="wrap probleme__grid">
            <div className="probleme__copy">
              <p className="k rv">Le point de départ</p>
              <Split as="h2" className="d h2" delay={80}>
                Votre métier, c&apos;est de faire vivre une expérience. <em>Pas de passer vos journées à créer du contenu.</em>
              </Split>
              <div className="ed rv" style={rv(160)}>
                <p>Entre les clients, les réservations, les prestations et le quotidien de votre activité, difficile de trouver le temps de créer des contenus régulièrement.</p>
                <p>Et pourtant, vous avez tellement de choses à montrer.</p>
              </div>
              <Split as="p" className="d strong" delay={240}>
                C&apos;est justement là que June intervient.
              </Split>
            </div>
            <figure className="probleme__media rv rv--mask" style={rv(120)}>
              <Media poster="/regard.jpg" alt="Ludivine prend des notes, carnet et téléphone en main, la caméra posée à côté" pos="50% 40%" w={1122} h={1402} px={20} />
            </figure>
          </div>
        </section>

        {/* 03 — L'offre signature */}
        <section className="offre-sig sand" id="offre" aria-label="L'offre signature">
          <div className="wrap offre-sig__grid">
            <figure className="offre-sig__media rv rv--mask">
              <Media video={VIDEO.approche} poster="/wall/ugc-hotel.jpg" alt="Séjour vécu dans une chambre d'hôtel, contenu immersif" pos="50% 50%" w={393} h={622} px={16} />
            </figure>
            <div className="offre-sig__copy">
              <p className="k rv">L&apos;offre signature</p>
              <Split as="h2" className="d h2" delay={80}>
                {OFFRE.nom}
              </Split>
              <p className="offre-sig__hook d rv" style={rv(140)}>{OFFRE.accroche}</p>
              <ul className="livrables rv" style={rv(200)}>
                {OFFRE.livrables.map((l) => (
                  <li key={l.titre}>
                    <span className="livrables__n d">{l.n}</span>
                    <span>{l.titre}</span>
                  </li>
                ))}
                <li>
                  <span className="livrables__n d">✦</span>
                  <span>Un {OFFRE.board.titre} avec légendes, hooks, CTA et calendrier de publication conseillé.</span>
                </li>
              </ul>
              <p className="muted rv" style={rv(260)}>{OFFRE.rythme}</p>
              <a className="btn btn--fill btn--up rv" style={rv(320)} href="/offre">
                Découvrir Experience Content Day
              </a>
            </div>
          </div>
        </section>

        {/* 04 — Réalisations */}
        <section className="sel light" id="realisations" aria-label="Réalisations">
          <div className="wrap">
            <div className="sec__head sec__head--row">
              <div>
                <p className="k rv">Réalisations</p>
                <Split as="h2" className="d h2" delay={80}>
                  Des lieux, des rencontres, <em>des expériences à raconter.</em>
                </Split>
              </div>
              <a className="btn btn--up rv" style={rv(160)} href="/realisations">
                Voir les réalisations
              </a>
            </div>
            <div className="sel__grid">
              {selected.map((p, i) => (
                <div className="sel__it rv" style={rv(i * 100)} key={p.slug}>
                  <ProjectCard m={p.cover} href={`/realisations#${p.slug}`} />
                  <a className="sel__cap" href={`/realisations#${p.slug}`}>
                    <b>{p.titre}</b>
                    <span>
                      {p.categorie} · {p.sousCategorie}
                    </span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 05 — Méthode */}
        <section className="approche light" id="methode" aria-label="La méthode">
          <div className="wrap approche__head">
            <div>
              <p className="k rv">La méthode</p>
              <Split as="h2" className="d h2" delay={80}>
                Quatre étapes, <em>un seul interlocuteur.</em>
              </Split>
            </div>
          </div>
          <div className="wrap">
            <ol className="steps steps--line">
              {METHODE.map(([n, t, p], i) => (
                <li className="step rv" style={rv(i * 100)} key={n}>
                  <p className="step__n">{n}</p>
                  <h3 className="d">{t}</h3>
                  <p>{p}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 06 — À propos (inchangé) */}
        <section className="about sand" id="apropos" aria-label="Behind June">
          <div className="wrap about__grid">
            <figure className="about__media plate plate--photo rv rv--mask" data-dev>
              <img src="/ludivine.jpg" alt="Ludivine, fondatrice de June Content Studio, caméra en main" width={1111} height={1415} loading="lazy" decoding="async" style={{ "--pos": "50% 35%" } as React.CSSProperties} />
            </figure>
            <div className="about__copy">
              <p className="k rv">Behind June</p>
              <Split as="h2" className="d h2" delay={80}>
                The creative eye <em>behind June.</em>
              </Split>
              <p className="about__sub rv" style={rv(140)}>Ludivine, fondatrice de June Content Studio.</p>
              <div className="ed rv" style={rv(200)}>
                <p>Passionnée par les lieux, les voyages et les expériences qui laissent un souvenir, j&apos;ai créé June pour raconter ce qui ne se voit pas toujours au premier regard.</p>
                <p>J&apos;aime découvrir un lieu, observer les détails, ressentir son atmosphère et comprendre ce qui le rend particulier.</p>
                <p className="turn">C&apos;est ce regard que j&apos;apporte à chaque projet.</p>
              </div>
              <p className="about__place rv" style={rv(260)}>{SAISON}</p>
            </div>
          </div>
        </section>

        {/* 07 — Appel final */}
        <section className="fin" id="contact" data-dark aria-label="Contact">
          <Media poster="/alpe.jpg" alt="Chalet sous la neige face aux montagnes de l'Oisans" pos="60% 55%" w={1080} h={1616} px={30} />
          <div className="wrap fin__inner">
            <Split as="h2" className="d h2" delay={0}>
              Vous avez une expérience <em>à faire découvrir ?</em>
            </Split>
            <a className="btn btn--light btn--up rv" style={rv(160)} href={CTA_HREF}>
              {CTA}
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

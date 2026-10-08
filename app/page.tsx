import type React from "react";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import SiteNav from "@/components/june/SiteNav";
import SiteFooter from "@/components/june/SiteFooter";
import Split from "@/components/june/Split";
import Media from "@/components/june/Media";
import ProjectCard from "@/components/june/ProjectCard";
import { CTA, CTA_HREF, LIEUX, METHODE, SAISON, VIDEO } from "@/lib/site";
import { OFFRES } from "@/lib/offres";
import { PROJETS } from "@/lib/projets";

/*
   Accueil V2 : six sections. Hero, Selected Work, Services, L'approche,
   Behind June, Contact. Textes et offres centralisés dans lib/.
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
          <Media video={VIDEO.hero} poster="/hero.jpg" alt="Ludivine photographie un petit-déjeuner dans une chambre d'hôtel avec vue sur les montagnes" pos="72% 50%" w={1672} h={941} eager px={30} />
          <div className="hero__inner">
            <p className="k hero__k rise" style={{ "--d": "100ms" } as React.CSSProperties}>
              Independent creative studio
            </p>
            <Split as="h1" className="d hero__title" delay={250}>
              Des lieux qui font vivre une expérience.
            </Split>
            <Split as="p" className="d hero__sub" delay={520}>
              <em>Des contenus qui donnent envie de la vivre.</em>
            </Split>
            <p className="hero__lede rise" style={{ "--d": "700ms" } as React.CSSProperties}>
              Création de contenus photo &amp; vidéo centrés sur l&apos;expérience client.
              <br />
              Hôtels, hébergements et expériences.
            </p>
            <div className="hero__ctas rise" style={{ "--d": "820ms" } as React.CSSProperties}>
              <a className="btn btn--light btn--up" href="/realisations">
                Voir les réalisations
              </a>
              <a className="link-arrow" href={CTA_HREF}>
                {CTA}
              </a>
            </div>
          </div>
          <div className="hero__foot rise" style={{ "--d": "950ms" } as React.CSSProperties}>
            <span>{LIEUX}</span>
          </div>
        </section>

        {/* 02 — Selected Work */}
        <section className="sel light" id="realisations" aria-label="Selected work">
          <div className="wrap">
            <div className="sec__head sec__head--row">
              <div>
                <p className="k rv">Selected work</p>
                <Split as="h2" className="d h2" delay={80}>
                  Des expériences racontées par June.
                </Split>
              </div>
              <a className="btn btn--up rv" style={rv(160)} href="/realisations">
                Explorer le portfolio
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

        {/* 03 — Services */}
        <section className="svc sand" id="services" aria-label="Services">
          <div className="wrap">
            <div className="sec__head">
              <p className="k rv">Services</p>
              <Split as="h2" className="d h2" delay={80}>
                Une expérience à raconter ?
              </Split>
              <p className="lede muted rv" style={rv(160)}>Trois façons de collaborer avec June, selon votre projet.</p>
            </div>
            <div className="svc__grid">
              {OFFRES.map((o, i) => (
                <article className="svc__card rv" style={rv(i * 100)} key={o.slug}>
                  <a className="svc__media" href={`/services#${o.slug}`} aria-hidden="true" tabIndex={-1}>
                    <figure className="plate plate--photo" data-dev>
                      <img src={o.image} alt="" width={1080} height={1350} loading="lazy" decoding="async" style={{ "--pos": o.pos } as React.CSSProperties} />
                    </figure>
                  </a>
                  <p className="k svc__cat">{o.categorie}</p>
                  <h3 className="d svc__name">{o.nom}</h3>
                  <p className="svc__text">{o.accroche}</p>
                  {o.exemples && <p className="svc__ex">{o.exemples}</p>}
                  <a className="link-arrow" href={`/services#${o.slug}`}>
                    Découvrir l&apos;offre
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 04 — L'approche */}
        <section className="approche light" id="approche" aria-label="L'approche June">
          <div className="wrap approche__head">
            <div>
              <p className="k rv">L&apos;approche June</p>
              <Split as="h2" className="d h2" delay={80}>
                Je ne viens pas simplement
                <br />
                filmer votre établissement.
              </Split>
            </div>
            <div className="ed rv" style={rv(160)}>
              <p>Je découvre ce que vos clients viennent y vivre, les détails qui font la différence et les moments dont ils se souviendront.</p>
              <p>Puis je transforme cette expérience en contenus qui donnent envie de la vivre à leur tour.</p>
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

        {/* 05 — Behind June */}
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

        {/* 06 — Contact */}
        <section className="fin" id="contact" data-dark aria-label="Contact">
          <Media poster="/alpe.jpg" alt="Chalet sous la neige face aux montagnes de l'Oisans" pos="60% 55%" w={1080} h={1616} px={30} />
          <div className="wrap fin__inner">
            <Split as="h2" className="d h2" delay={0}>
              Let&apos;s tell <em>your story.</em>
            </Split>
            <div className="ed rv" style={rv(120)}>
              <p>
                Vous avez un lieu, une expérience ou un projet à mettre en lumière ?
                <br />
                Racontez-moi ce que vous imaginez.
              </p>
            </div>
            <a className="btn btn--light btn--up rv" style={rv(200)} href={CTA_HREF}>
              {CTA}
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

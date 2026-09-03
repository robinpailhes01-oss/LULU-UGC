import type React from "react";
import JuneEngine from "@/components/june/JuneEngine";
import JuneContact from "@/components/june/JuneContact";

/* Accueil V1 saison 26/27. Structure et copywriting du brief June Content
   Studio, direction artistique conservée (palette, Fraunces / Manrope, photos,
   le soleil de la page). JuneEngine pilote la lumière et les révélations. */

export default function Home() {
  return (
    <>
      <JuneEngine />
      <div className="june-sun" aria-hidden="true" />
      <div className="june-veil" aria-hidden="true" />

      <header className="june-index">
        <a className="june-index__mark" href="#haut">
          june
        </a>
        <nav aria-label="Navigation">
          <ul className="june-index__list">
            <li>
              <a href="#formats">Formats</a>
            </li>
            <li>
              <a href="#offres">Offres</a>
            </li>
            <li>
              <a href="#alpe">Alpe d&apos;Huez</a>
            </li>
            <li>
              <a href="/portfolio">Réalisations</a>
            </li>
            <li>
              <a className="is-cta" href="#contact">
                Parler de mon projet
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <main id="haut">
        {/* 01 — Hero */}
        <section className="v-hero" aria-label="June, studio de contenu et UGC">
          <div className="v-hero__copy">
            <p className="j-label v-in" style={{ "--d": "0ms" } as React.CSSProperties}>Studio de contenu &amp; UGC</p>
            <h1 className="v-hero__title">
              <span className="v-line"><span className="v-line__i" style={{ "--d": "120ms" } as React.CSSProperties}>Votre expérience</span></span>
              <span className="v-line"><span className="v-line__i" style={{ "--d": "220ms" } as React.CSSProperties}>mérite d&apos;être vue.</span></span>
              <span className="v-line"><em className="v-line__i" style={{ "--d": "360ms" } as React.CSSProperties}>Et surtout, d&apos;être vécue.</em></span>
            </h1>
            <p className="v-hero__lede v-in" style={{ "--d": "520ms" } as React.CSSProperties}>
              June imagine &amp; crée la com qui donne envie de vous découvrir.
            </p>
            <p className="v-hero__formats v-in" style={{ "--d": "640ms" } as React.CSSProperties}>UGC • Réels • Photos</p>
            <p className="v-hero__place v-in" style={{ "--d": "700ms" } as React.CSSProperties}>📍 Alpe d&apos;Huez • Saison 26/27 🏔️</p>
            <div className="v-hero__actions v-in" style={{ "--d": "800ms" } as React.CSSProperties}>
              <a className="j-cta" href="#offres">
                Découvrir les offres →
              </a>
              <a className="v-hero__link" href="/portfolio">Voir des réalisations</a>
            </div>
          </div>
          <figure className="v-hero__media v-in" style={{ "--d": "200ms" } as React.CSSProperties}>
            <img
              src="/realisations/shooting-hotel-balcon-fleuri.jpg"
              alt="Ludivine au balcon d'un hôtel, face à la piscine et aux jardins"
              width={1080}
              height={1616}
            />
          </figure>
        </section>

        {/* 01b — Les points de douleur, sous le scroll */}
        <section
          className="v-pain"
          data-sc-act="pin"
          data-sc-span="2.8"
          aria-label="Ce que vous vivez"
        >
          <div data-sc-stage className="v-pain__stage">
            <div className="v-pain__inner">
              <p className="v-pain__line" data-sc-cue="0.02 0.34 0.22 0.3">
                Vous savez que votre lieu mérite d&apos;être vu.
              </p>
              <p className="v-pain__line" data-sc-cue="0.28 0.58 0.22 0.3">
                Mais entre gérer, accueillir, répondre…{" "}
                <br />
                publier passe toujours après.
              </p>
              <p className="v-pain__line" data-sc-cue="0.52 0.8 0.22 0.3">
                Et ce que vous postez ne ressemble pas{" "}
                <br />
                à ce que vos clients vivent vraiment.
              </p>
              <p className="v-pain__turn" data-sc-cue="0.76 0.995 0.2 0.1" data-sc-kinetic="lines">
                C&apos;est là que June intervient.
              </p>
            </div>
          </div>
        </section>

        {/* 02 — Positionnement */}
        <section className="v-pos" aria-label="Positionnement">
          <div className="v-wrap v-pos__grid" data-sc-in data-sc-stagger="90">
            <div>
              <p className="j-label">Plus que du joli contenu</p>
              <h2 className="v-h2">
                Créer l&apos;envie avant même d&apos;être découvert en vrai.
              </h2>
              <p className="v-pos__note">
                Avant de choisir une adresse, réserver une expérience ou
                découvrir une marque, il y a souvent une première rencontre :
                son contenu.
              </p>
            </div>
            <div>
              <ul className="v-verbs" data-sc-in data-sc-stagger="140">
                <li><b>Faire ressentir</b> une ambiance.</li>
                <li><b>Montrer</b> ce qui vous différencie.</li>
                <li><b>Mettre</b> un produit en situation.</li>
                <li><b>Raconter</b> une expérience comme elle se vit vraiment.</li>
              </ul>
              <p className="v-pos__punch">
                Pas simplement créer pour poster.{" "}
                <br />
                Créer pour donner envie de vous découvrir.
              </p>
            </div>
          </div>
        </section>

        {/* 03 — Les formats */}
        <section className="v-formats" id="formats" aria-label="Les formats">
          <div className="v-wrap">
            <div className="v-formats__head" data-sc-in data-sc-stagger="90">
              <h2 className="v-h2">Un besoin, plusieurs façons de le raconter.</h2>
              <p className="v-lede">
                Pas besoin de choisir entre du contenu esthétique et du contenu
                plus incarné. Chaque format a son rôle.
              </p>
            </div>
            <div className="v-formats__grid" data-sc-in data-sc-stagger="110">
              <article className="v-format">
                <figure className="v-format__media v-format__media--reel">
                  <img
                    src="/realisations/gite-abric-cevennes.jpg"
                    alt="Couverture d'un reel publié pour le Gîte de l'Abric"
                    width={393}
                    height={700}
                    loading="lazy"
                  />
                </figure>
                <h3 className="v-format__name">
                  Réels <span>Faire ressentir</span>
                </h3>
                <p>
                  Des vidéos immersives et esthétiques qui racontent votre
                  univers : l&apos;ambiance, les détails, le lieu, le produit ou
                  l&apos;expérience.
                </p>
              </article>
              <article className="v-format">
                <figure className="v-format__media v-format__media--reel">
                  <img
                    src="/realisations/ugc-hotel.jpg"
                    alt="Vidéo UGC tournée dans la chambre d'un hôtel, au réveil"
                    width={393}
                    height={687}
                    loading="lazy"
                  />
                </figure>
                <h3 className="v-format__name">
                  UGC <span>Faire vivre</span>
                </h3>
                <p>
                  Un contenu plus humain et incarné, construit autour d&apos;un
                  angle et d&apos;un message : expérience, recommandation,
                  démonstration, storytelling, face caméra ou voix off.
                </p>
              </article>
              <article className="v-format">
                <figure className="v-format__media">
                  <img
                    src="/realisations/shooting-hotel-piscine.jpg"
                    alt="Piscine intérieure d'un hôtel et spa, arches et lumière chaude"
                    width={1200}
                    height={1464}
                    loading="lazy"
                  />
                </figure>
                <h3 className="v-format__name">
                  Photos <span>Construire votre image</span>
                </h3>
                <p>
                  Des images naturelles et travaillées pour alimenter vos
                  réseaux, votre site et vos différents supports.
                </p>
              </article>
            </div>
            <p className="v-formats__more">
              <a href="/portfolio">Voir des réalisations</a>
            </p>
          </div>
        </section>

        {/* 04 — Les offres */}
        <section className="v-offers" id="offres" aria-label="Les offres">
          <div className="v-wrap">
            <div className="v-offers__head" data-sc-in data-sc-stagger="90">
              <h2 className="v-h2">À chaque besoin, sa façon de créer.</h2>
              <p className="v-lede">
                Un besoin ponctuel, une campagne UGC ou quelqu&apos;un à vos côtés
                toute la saison : les offres June s&apos;adaptent à la façon dont
                vous avez besoin de communiquer.
              </p>
            </div>

            <div className="v-offers__grid" data-sc-in data-sc-stagger="120">
              <article className="v-offer" id="content-shoot">
                <p className="j-label">01 — Content Shoot</p>
                <h3 className="v-offer__title">
                  Pour refaire le plein de contenu sans déléguer vos réseaux.
                </h3>
                <p className="v-offer__text">
                  Avant chaque shooting, on échange sur votre actualité, vos
                  besoins et ce que vous souhaitez mettre en avant. June imagine
                  ensuite une session adaptée à votre univers.
                </p>
                <p className="v-offer__price">
                  <span className="from">À partir de</span> 490&nbsp;<span className="eur">€</span> <small>HT</small>
                </p>
                <ul className="v-offer__list">
                  <li>25 à 35 photos retouchées</li>
                  <li>3 Réels montés</li>
                  <li>15 à 20 séquences verticales</li>
                  <li>Concepts &amp; préparation du shooting</li>
                  <li>Galerie organisée prête à utiliser</li>
                </ul>
                <p className="v-offer__note">Chaque shooting est pensé selon vos besoins.</p>
                <a className="j-cta" href="#contact" data-offre="Content Shoot">
                  Imaginer mon shooting →
                </a>
              </article>

              <article className="v-offer" id="ugc">
                <p className="j-label">02 — UGC</p>
                <h3 className="v-offer__title">
                  Faire découvrir votre expérience ou votre produit autrement.
                </h3>
                <p className="v-offer__text">
                  Des vidéos incarnées qui parlent directement à votre client,
                  pensées de l&apos;idée au montage.
                </p>
                <p className="v-offer__steps">Concept • Hook • Script • Tournage • Montage</p>
                <ul className="v-offer__prices">
                  <li>
                    <span>1 UGC</span>
                    <b>220&nbsp;<span className="eur">€</span> <small>HT</small></b>
                  </li>
                  <li>
                    <span>3 UGC</span>
                    <b>590&nbsp;<span className="eur">€</span> <small>HT</small></b>
                  </li>
                  <li>
                    <span>5 UGC</span>
                    <b>950&nbsp;<span className="eur">€</span> <small>HT</small></b>
                  </li>
                </ul>
                <p className="v-offer__note">
                  Utilisation organique incluse. Les droits publicitaires sont
                  disponibles en supplément.
                </p>
                <a className="j-cta" href="#contact" data-offre="UGC">
                  Créer mon contenu UGC →
                </a>
              </article>

              <article className="v-offer v-offer--partner" id="june-partner">
                <p className="j-label">03 — June Partner</p>
                <h3 className="v-offer__title">
                  Votre partenaire contenu, sans gestion de vos réseaux.
                </h3>
                <p className="v-offer__text">
                  Vous connaissez votre établissement et ce que vous voulez faire
                  vivre à vos clients. Mais réfléchir à quoi montrer, quoi créer
                  et trouver le temps de le produire chaque mois, c&apos;est autre
                  chose.
                </p>
                <p className="v-offer__text">
                  Avec June Partner, on ne repart pas de zéro à chaque shooting.
                  On échange sur votre actualité, vos offres et vos temps forts.
                  June imagine les contenus à créer puis vient les produire.
                </p>
                <p className="v-offer__text">
                  Vous gardez la main sur vos réseaux. June vous donne tout ce
                  qu&apos;il faut pour les faire vivre.
                </p>
                <p className="v-offer__price">
                  890&nbsp;<span className="eur">€</span> <small>HT / mois</small>
                </p>
                <p className="v-offer__sub">Chaque mois :</p>
                <ul className="v-offer__list">
                  <li>1 point communication mensuel</li>
                  <li>1 plan de contenu adapté au mois</li>
                  <li>1 session de création jusqu&apos;à 3h</li>
                  <li>25 à 30 photos retouchées</li>
                  <li>3 Réels montés</li>
                  <li>1 vidéo UGC</li>
                  <li>Séquences vidéo complémentaires</li>
                  <li>Hooks &amp; idées d&apos;utilisation</li>
                  <li>Support pour les besoins communication</li>
                </ul>
                <a className="j-cta j-cta--honey" href="#contact" data-offre="June Partner">
                  Devenir June Partner →
                </a>
                <p className="v-offer__note">
                  Sans gestion de vos réseaux • accompagnement flexible selon vos
                  besoins.
                </p>
              </article>
            </div>

            <details className="v-supp">
              <summary>Suppléments et droits d&apos;utilisation</summary>
              <table>
                <tbody>
                  <tr><td>Réel supplémentaire</td><td>+120 €</td></tr>
                  <tr><td>UGC supplémentaire</td><td>+220 €</td></tr>
                  <tr><td>10 photos supplémentaires</td><td>+90 €</td></tr>
                  <tr><td>Shooting supplémentaire 1h30</td><td>+250 €</td></tr>
                  <tr><td>Couverture événement</td><td>À partir de 290 €</td></tr>
                  <tr><td>Hook UGC supplémentaire</td><td>+40 €</td></tr>
                  <tr><td>CTA UGC supplémentaire</td><td>+30 €</td></tr>
                  <tr><td>Version alternative de montage UGC</td><td>+60 €</td></tr>
                  <tr><td>Rushs bruts UGC</td><td>+30 % du prix de la vidéo</td></tr>
                  <tr><td>Format supplémentaire 16:9 / 1:1</td><td>+30 €</td></tr>
                  <tr><td>Livraison express 48h</td><td>+25 %</td></tr>
                  <tr><td>Droits Ads 30 jours</td><td>+30 %</td></tr>
                  <tr><td>Droits Ads 3 mois</td><td>+60 %</td></tr>
                  <tr><td>Droits Ads 6 mois</td><td>+100 %</td></tr>
                  <tr><td>Droits Ads 12 mois</td><td>+150 %</td></tr>
                  <tr><td>Exclusivité secteur / whitelisting</td><td>Sur devis</td></tr>
                  <tr><td>Déplacement hors Alpe d&apos;Huez</td><td>Sur devis</td></tr>
                </tbody>
              </table>
              <p>Tarifs HT. Ces suppléments servent de base aux devis.</p>
            </details>
          </div>
        </section>

        {/* 05 — Alpe d'Huez */}
        <section className="v-alpe" id="alpe" data-dark aria-label="Alpe d'Huez, saison 26/27">
          <div className="v-wrap v-alpe__grid" data-sc-in data-sc-stagger="90">
            <div>
              <p className="j-label">Cet hiver, June prend de l&apos;altitude. 🏔️</p>
              <h2 className="v-h2">Saison 26/27 • Alpe d&apos;Huez</h2>
            </div>
            <div className="v-alpe__text">
              <p>
                June s&apos;installe à l&apos;Alpe d&apos;Huez pour accompagner celles
                et ceux qui font vivre la station.
              </p>
              <p>
                Hôtels, restaurants, chalets, activités, wellness, commerces,
                expériences…
              </p>
              <p>
                Mais la montagne devient aussi un terrain de création pour les
                marques qui souhaitent produire du contenu UGC, lifestyle ou
                winter directement à l&apos;Alpe d&apos;Huez.
              </p>
              <p className="v-alpe__ask">
                Un lieu à faire découvrir ?
                <br />
                Une expérience à raconter ?
                <br />
                Un produit à emmener en montagne ?
              </p>
              <p>Parlons-en.</p>
              <a className="j-cta j-cta--honey" href="#contact" data-offre="Alpe d'Huez">
                Créer à l&apos;Alpe →
              </a>
            </div>
          </div>
        </section>

        {/* 06 — Comment ça se passe */}
        <section className="v-how" aria-label="Comment ça se passe">
          <div className="v-wrap">
            <h2 className="v-h2" data-sc-in>
              De l&apos;idée au contenu.
            </h2>
            <ol className="v-steps" data-sc-in data-sc-stagger="110">
              <li>
                <span className="v-steps__num">01</span>
                <h3>On échange</h3>
                <p>
                  Votre univers, vos besoins, votre actualité et ce que vous
                  souhaitez mettre en avant.
                </p>
              </li>
              <li>
                <span className="v-steps__num">02</span>
                <h3>J&apos;imagine</h3>
                <p>
                  Concepts, angles, formats et direction du shooting : chaque
                  création part d&apos;une intention.
                </p>
              </li>
              <li>
                <span className="v-steps__num">03</span>
                <h3>On crée</h3>
                <p>
                  Sur place pour les lieux &amp; expériences, ou à partir de vos
                  produits pour les projets de marques.
                </p>
              </li>
              <li>
                <span className="v-steps__num">04</span>
                <h3>Vous utilisez</h3>
                <p>
                  Vous récupérez vos contenus prêts à prendre vie sur vos
                  réseaux et supports.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* 07 — À propos */}
        <section className="v-about" id="a-propos" aria-label="Derrière June">
          <div className="v-wrap v-about__grid" data-sc-in data-sc-stagger="90">
            <figure className="v-about__media">
              <img
                src="/portrait.jpg"
                alt="Ludivine, créatrice de June, dans la lumière du soir"
                width={1122}
                height={1402}
                loading="lazy"
              />
            </figure>
            <div className="v-about__text">
              <p className="j-label">Derrière June</p>
              <h2 className="v-h2">Moi c&apos;est Ludivine 👋</h2>
              <p>
                J&apos;ai créé June avec une idée assez simple : une belle
                expérience mérite une communication qui donne réellement envie
                de la découvrir.
              </p>
              <p>
                J&apos;aime comprendre ce qui fait l&apos;identité d&apos;un lieu ou
                d&apos;une marque, trouver comment le raconter et le transformer
                en contenu.
              </p>
              <p>C&apos;est pour ça que June ne s&apos;arrête pas au shooting.</p>
              <p>Il y a l&apos;idée, l&apos;angle, l&apos;image, le message… puis la création.</p>
              <p className="v-about__motto">De l&apos;idée au contenu.</p>
              <p>
                Cet hiver, je pose June à l&apos;Alpe d&apos;Huez pour la saison
                26/27, tout en continuant à créer pour des marques partout en
                France.
              </p>
            </div>
          </div>
        </section>

        {/* 08 — FAQ */}
        <section className="v-faq" aria-label="Questions fréquentes">
          <div className="v-wrap v-faq__grid">
            <h2 className="v-h2">Questions fréquentes</h2>
            <div>
              <details>
                <summary>Est-ce que June gère mes réseaux sociaux ?</summary>
                <p>
                  Non. June imagine et crée votre contenu, mais vous gardez la
                  main sur vos réseaux. L&apos;objectif est de vous donner la
                  matière et les idées nécessaires pour communiquer plus
                  facilement.
                </p>
              </details>
              <details>
                <summary>Quelle est la différence entre un Réel et une vidéo UGC ?</summary>
                <p>
                  Le Réel met principalement en scène votre univers, votre lieu
                  ou votre produit. L&apos;UGC est davantage incarné et construit
                  autour d&apos;un message, d&apos;un hook et d&apos;un angle
                  précis pour parler directement à votre audience.
                </p>
              </details>
              <details>
                <summary>Travaillez-vous uniquement à l&apos;Alpe d&apos;Huez ?</summary>
                <p>
                  Non. June sera basé à l&apos;Alpe d&apos;Huez pendant la saison
                  26/27, mais les projets UGC avec les marques peuvent être
                  réalisés partout en France, notamment à distance avec envoi de
                  produits.
                </p>
              </details>
              <details>
                <summary>Puis-je utiliser mes UGC en publicité ?</summary>
                <p>
                  Oui. Les tarifs affichés comprennent l&apos;utilisation
                  organique. Les droits d&apos;utilisation publicitaire sont
                  disponibles en supplément selon la durée et le projet.
                </p>
              </details>
              <details>
                <summary>Les offres sont-elles personnalisables ?</summary>
                <p>
                  Oui. Les offres donnent un cadre, mais chaque projet commence
                  par un échange pour adapter la création à vos besoins.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* 09 — CTA final + 10 — Footer */}
        <section className="j-dusk v-final" id="contact" data-dark aria-label="Parler de mon projet">
          <div className="v-wrap v-final__grid">
            <div className="v-final__intro">
              <h2 className="v-h2">On crée quelque chose ensemble ?</h2>
              <p className="v-lede">
                Un lieu, une expérience ou une marque à faire découvrir ?
              </p>
              <p>Racontez-moi votre projet et voyons ce qu&apos;on peut imaginer.</p>
              <footer className="v-foot">
                <p>
                  <strong>JUNE</strong> — Studio de contenu &amp; UGC
                  <br />
                  Alpe d&apos;Huez • France
                  <br />
                  Saison 26/27
                </p>
                <p>
                  <a href="https://instagram.com" target="_blank" rel="noreferrer">
                    Instagram
                  </a>{" "}
                  •{" "}
                  <a href="mailto:harmonieyacht@gmail.com">Email</a>
                  {" "}•{" "}
                  <a href="/portfolio">Réalisations</a>
                </p>
              </footer>
            </div>
            <JuneContact />
          </div>
        </section>
      </main>
    </>
  );
}

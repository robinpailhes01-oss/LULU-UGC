import type React from "react";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import JuneContact from "@/components/june/JuneContact";
import { CONTACT_EMAIL, CTA, INSTAGRAM_URL, VIDEO } from "@/lib/site";
import { works } from "@/lib/work";

/* Accueil. Structure validée le 2026-09-17 après relecture du point de vue du
   client cible : pour qui et ce qu'on obtient dès le premier écran, le constat
   dans ses mots, comment ça se passe, ce que vous recevez, réalisations, pour
   qui, le prix vu du client, Ludivine, Alpe d'Huez, contact, questions.
   Libellés en français, un seul bouton principal. Vidéos : public/video/. */

const rv = (ms: number) => ({ "--rd": `${ms}ms` }) as React.CSSProperties;

function Media({ video, poster, alt, pos, w, h, auto = "view", eager }: { video?: string; poster: string; alt: string; pos?: string; w: number; h: number; auto?: "view" | "hover"; eager?: boolean }) {
  return (
    <>
      <img src={poster} alt={alt} width={w} height={h} loading={eager ? "eager" : "lazy"} style={pos ? ({ "--pos": pos } as React.CSSProperties) : undefined} />
      {video && (
        <video data-auto={auto} muted loop playsInline preload="none" poster={poster} aria-hidden="true" style={pos ? ({ "--pos": pos } as React.CSSProperties) : undefined}>
          <source src={video} type="video/mp4" />
        </video>
      )}
    </>
  );
}

export default function Home() {
  return (
    <>
      <JuneV3Engine />

      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </symbol>
      </svg>

      <header className="nav nav--hero" id="nav">
        <a className="mark" href="#top" aria-label="June, retour en haut">
          June
        </a>
        <nav className="nav__links" aria-label="Navigation">
          <a href="#comment">Comment ça se passe</a>
          <a href="#realisations">Réalisations</a>
          <a href="#ludivine">Ludivine</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="btn" href="#contact">
          <span className="l">{CTA} →</span>
          <span className="s">Mon projet →</span>
        </a>
      </header>

      <main id="top">
        {/* 01 — Hero : pour qui, ce qu'on obtient, un bouton */}
        <section className="hero" aria-label="June, studio de contenu">
          <div className="media">
            <Media video={VIDEO.hero} poster="/realisations/shooting-hotel-piscine-ext.jpg" alt="Piscine extérieure d'un hôtel & spa au soleil couchant" pos="50% 55%" w={1080} h={1616} eager />
          </div>
          <div className="hero__inner">
            <p className="hero__june rise" style={{ "--d": "80ms" } as React.CSSProperties}>June</p>
            <p className="hero__studio rise" style={{ "--d": "180ms" } as React.CSSProperties}>Studio de contenu pour les lieux qui se vivent</p>
            <h1 className="d hero__title rise" style={{ "--d": "300ms" } as React.CSSProperties}>
              Des lieux qui font vivre quelque chose. <em>Des contenus qui donnent envie de le vivre.</em>
            </h1>
            <p className="hero__lede rise" style={{ "--d": "420ms" } as React.CSSProperties}>Je viens vivre votre établissement comme vos clients, et je vous rends des vidéos et des photos prêtes à publier, qui racontent ce qu&apos;on ressent chez vous.</p>
            <p className="hero__fmt rise" style={{ "--d": "520ms" } as React.CSSProperties}>Hôtels · Chalets · Maisons d&apos;hôtes · Spas · Restaurants · Expériences</p>
            <a className="btn rise" href="#comment" style={{ "--d": "620ms" } as React.CSSProperties}>
              Voir comment ça se passe →
            </a>
            <p className="hero__place rise" style={{ "--d": "720ms" } as React.CSSProperties}>Montpellier • France • Alpe d&apos;Huez, hiver 26/27</p>
          </div>
        </section>

        {/* 02 — Le constat, dans ses mots */}
        <section className="sec constat" aria-label="Le point de départ">
          <div className="wrap constat__grid">
            <div className="mosaic rv" aria-label="Ce que vos clients vivent sur place">
              {[
                ["/realisations/shooting-hotel-terrasse.jpg", "Terrasse d'un hôtel & spa au soleil couchant", "50% 40%"],
                ["/realisations/shooting-hotel-chambre.jpg", "Chambre baignée de lumière", "50% 40%"],
                ["/realisations/shooting-hotel-piscine.jpg", "Piscine intérieure", "50% 60%"],
                ["/realisations/shooting-hotel-couple-terrasse.jpg", "Un couple en terrasse", "50% 40%"],
                ["/realisations/shooting-hotel-balcon-fleuri.jpg", "Balcon fleuri", "50% 45%"],
                ["/realisations/shooting-hotel-jardins-vue.jpg", "Jardins avec vue", "50% 40%"],
              ].map(([src, alt, pos]) => (
                <figure className="plate" data-dev key={src}>
                  <img src={src} alt={`Photo : ${alt}`} width={1080} height={1616} loading="lazy" style={{ "--pos": pos } as React.CSSProperties} />
                </figure>
              ))}
            </div>
            <div className="constat__panel ed">
              <p className="k rv">Le point de départ</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Votre établissement est probablement <em>bien mieux en vrai que sur Instagram.</em>
              </h2>
              <p className="rv" style={rv(160)}>Vous avez créé un lieu, une ambiance, et toutes ces petites attentions que vos clients découvrent une fois sur place.</p>
              <p className="big rv" style={rv(200)}>Mais derrière un écran ?</p>
              <p className="rv" style={rv(240)}>Les photos ont été faites entre deux départs. On montre une chambre, un plat, une piscine… sans ce que l&apos;on vit autour.</p>
              <p className="rv" style={rv(280)}>Et entre l&apos;accueil, les clients et tout le reste, réfléchir à ce qu&apos;on publie finit tout en bas de la liste.</p>
              <p className="turn rv" style={rv(340)}>C&apos;est là que June intervient.</p>
              <p className="after rv" style={rv(400)}>Un regard extérieur pour repérer ce qui mérite d&apos;être raconté, et le transformer en vidéos et en photos qui donnent envie de venir.</p>
            </div>
          </div>
        </section>

        {/* 03 — Comment ça se passe */}
        <section className="ce" id="comment" aria-label="Comment ça se passe">
          <div className="wrap">
            <div className="ce__head">
              <div>
                <p className="k rv">Comment ça se passe</p>
                <h2 className="d ce__title rv" style={rv(80)}>
                  Content
                  <br />
                  Experience <span className="star">✦</span>
                </h2>
              </div>
              <div className="ce__intro">
                <p className="lede rv" style={rv(100)}>Une immersion chez vous, pour comprendre ce que vos clients vivent, puis le raconter en vidéos et en photos.</p>
                <p className="rv" style={rv(160)}>Je ne pars pas d&apos;une liste de contenus à produire. Je pars de votre expérience, de vos clients et de ce que vous voulez faire ressentir. Les contenus viennent après.</p>
              </div>
            </div>
            <ol className="steps">
              <li className="step rv">
                <span className="step__n">01</span>
                <h3>On échange</h3>
                <p className="big">Un échange avant de venir, à distance.</p>
                <p>On parle de votre établissement, de vos clients, de ce que vous aimeriez qu&apos;on ressente en vous découvrant. Vous n&apos;avez rien à préparer : je pose les questions.</p>
              </li>
              <li className="step rv" style={rv(100)}>
                <span className="step__n">02</span>
                <h3>On choisit quoi raconter</h3>
                <p className="big">Les moments qui font votre expérience.</p>
                <div className="list">
                  <span>Une arrivée.</span>
                  <span>Un réveil.</span>
                  <span>Un dîner.</span>
                  <span>Un retour du ski.</span>
                  <span>Une attention particulière…</span>
                </div>
                <p>Vous validez le plan des contenus avant que je vienne. Vous savez ce que je vais créer, et pourquoi.</p>
              </li>
              <li className="step rv" style={rv(160)}>
                <span className="step__n">03</span>
                <h3>Je viens vivre l&apos;expérience</h3>
                <p className="big">Chez vous, comme votre futur client.</p>
                <div className="list">
                  <span>Je découvre votre univers.</span>
                  <span>J&apos;observe les détails.</span>
                  <span>Et surtout, je la vis.</span>
                </div>
                <p>Une journée sur place, ou une nuit pour un hébergement, afin de raconter l&apos;arrivée, la soirée, le réveil. Vous n&apos;avez pas à poser : quand ça sert l&apos;histoire, c&apos;est moi qui vis l&apos;expérience à la place de vos clients.</p>
              </li>
              <li className="step rv" style={rv(220)}>
                <span className="step__n">04</span>
                <h3>Vous recevez tout</h3>
                <p className="big">Vos vidéos et photos, montées, triées, prêtes à publier.</p>
                <p>Avec votre tableau de bord : ce que vous avez reçu, et comment l&apos;utiliser sur vos réseaux, votre site et vos annonces. Pas des séquences oubliées dans un dossier.</p>
              </li>
            </ol>
            <p className="sig rv" style={{ marginTop: "clamp(2.5rem, 5vw, 4rem)" }}>
              Vous faites vivre l&apos;expérience. <em>June trouve comment la raconter.</em>
            </p>
          </div>
        </section>

        {/* 04 — Ce que vous recevez */}
        <section className="sec formats" id="recevez" aria-label="Ce que vous recevez">
          <div className="wrap">
            <div className="formats__head ed">
              <p className="k rv">Ce que vous recevez</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Une expérience. <em>Plusieurs façons de la raconter.</em>
              </h2>
            </div>
            <div className="fgrid">
              {[
                ["Vidéos courtes", "Pour vos réseaux : une ambiance, un moment, une journée ou une expérience complète, en quelques secondes.", "/wall/yacht-reel.jpg", "Vidéo publiée pour Harmonie Yacht", 389, 614, "/video/work/harmonie-yacht.mp4", ""],
                ["Vidéos où je vis l'expérience", "Je prends la place de vos clients : l'arrivée, le repas, le soin. Vos futurs clients se projettent plus naturellement.", "/wall/ugc-hotel.jpg", "Vidéo vécue dans une chambre d'hôtel", 393, 622, "/video/work/experience-hotel.mp4", ""],
                ["Vidéos immersives", "Les sensations, les détails et les moments qui font réellement l'expérience.", "/wall/gite.jpg", "Petit-déjeuner sous la treille au Gîte de l'Abric", 393, 633, "/video/work/gite-abric.mp4", "50% 30%"],
                ["Photos", "Une sélection d'images d'ambiance pour votre site, vos annonces et vos réseaux, sans transformer l'immersion en séance photo classique.", "/realisations/shooting-hotel-chambre.jpg", "Chambre d'hôtel baignée de lumière", 1200, 1600, "", ""],
                ["Stories & séquences brutes", "Des formats plus spontanés pour alimenter votre communication facilement, quand vous en avez besoin.", "/wall/ugc-bateau.jpg", "Sortie en mer, chapeau de paille et bateau au large", 386, 615, "/video/work/sortie-en-mer.mp4", ""],
              ].map(([nom, txt, img, alt, w, h, video, pos], i) => (
                <article className="fmt rv" style={rv(i * 90)} key={nom as string} data-hover-host>
                  <figure className="plate" data-dev>
                    <Media video={(video as string) || undefined} poster={img as string} alt={alt as string} pos={(pos as string) || undefined} w={w as number} h={h as number} auto="hover" />
                  </figure>
                  <h3>{nom as string}</h3>
                  <p>{txt as string}</p>
                </article>
              ))}
            </div>
            <p className="formats__end rv">Le format vient toujours après l&apos;histoire que l&apos;on souhaite raconter.</p>
          </div>
        </section>

        {/* 05 — Réalisations */}
        <section className="work" id="realisations" aria-label="Réalisations">
          <div className="wrap">
            <div className="work__head">
              <p className="k rv">Réalisations</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Quelques expériences, <em>racontées par June.</em>
              </h2>
            </div>
            <div className="wk">
              {works.map((wk, i) => {
                const inner = (
                  <>
                    <figure className={wk.large ? "plate plate--wide" : "plate"} data-dev>
                      <Media video={wk.video} poster={wk.image} alt={`${wk.nom} : ${wk.univers}, ${wk.type}`} pos={wk.pos} w={wk.w} h={wk.h} auto="hover" />
                    </figure>
                    <div className="wk__cap">
                      <b>{wk.nom}</b>
                      <span>
                        {wk.univers} • {wk.type}
                      </span>
                    </div>
                  </>
                );
                return wk.href ? (
                  <a className="wk__it rv" style={rv((i % 3) * 80)} href={wk.href} target="_blank" rel="noopener noreferrer" key={wk.nom} data-hover-host>
                    {inner}
                  </a>
                ) : (
                  <div className="wk__it rv" style={rv((i % 3) * 80)} key={wk.nom} data-hover-host>
                    {inner}
                  </div>
                );
              })}
            </div>
            <p className="work__end rv">
              Chaque projet commence par une expérience différente. <em>Et donc, une nouvelle façon de la raconter.</em>
            </p>
          </div>
        </section>

        {/* 06 — Pour qui */}
        <section className="sec who" id="pour-qui" aria-label="Pour qui">
          <div className="wrap">
            <div className="who__head ed">
              <p className="k rv">Pour qui</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Pour les lieux &amp; expériences <em>que l&apos;on choisit autant pour ce qu&apos;on y vit que pour ce qu&apos;ils proposent.</em>
              </h2>
              <p className="rv" style={rv(160)}>June accompagne les lieux, établissements et expériences qui ont quelque chose à faire vivre, ressentir et raconter.</p>
            </div>
            <ul className="wgrid">
              {[
                ["Hôtels & hébergements", "Boutique-hôtels • Chalets • Locations & lieux insolites"],
                ["Wellness & bien-être", "Spas • Instituts • Expériences bien-être"],
                ["Tourisme & activités", "Expériences touristiques • Loisirs • Activités"],
                ["Food & lieux lifestyle", "Restaurants • Bars • Lieux expérientiels"],
                ["Retraites & séjours expérientiels", "Yoga • Wellness • Séjours thématiques • Workshops"],
                ["Expériences éphémères & événements intimistes", "Pop-up • Expériences de marque • Événements en petit comité"],
              ].map(([t, s], i) => (
                <li className="rv" style={rv(i * 60)} key={t}>
                  <b>{t}</b>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <div className="who__end">
              <p className="rv">Un lieu permanent ou une expérience qui ne dure que quelques jours : l&apos;approche reste la même. Comprendre ce que vos clients vont vivre, trouver l&apos;histoire à raconter et la transformer en contenu.</p>
            </div>
          </div>
        </section>

        {/* 07 — Le prix, vu du client */}
        <section className="offer" id="prix" aria-label="Le prix">
          <div className="wrap offer__grid">
            <div className="offer__side">
              <p className="k rv">Le prix</p>
              <h2 className="d ce__title rv" style={rv(80)}>
                Content Experience <span className="star">✦</span>
              </h2>
              <p className="offer__price rv" style={rv(140)}>
                À partir de 490<span className="eur">&nbsp;€</span> TTC
              </p>
              <p className="muted rv" style={rv(200)}>Le prix dépend de votre établissement, de l&apos;expérience à raconter et de la quantité de contenu réellement utile. Vous recevez un devis avant tout engagement.</p>
              <a className="btn rv" href="#contact" style={rv(260)} data-offre="Content Experience">
                {CTA} →
              </a>
            </div>
            <div>
              <p className="k rv" style={{ marginBottom: "1.2rem" }}>Vous recevez</p>
              <ul className="offer__list">
                {[
                  ["Les vidéos et les photos définies ensemble", "Montées, triées, aux bons formats pour vos réseaux, votre site et vos annonces."],
                  ["Votre tableau de bord", "Ce que vous avez reçu, et comment l'utiliser."],
                  ["Votre espace client", "Tout au même endroit, en haute définition, quand vous en avez besoin."],
                  ["Vos droits d'utilisation", "Pour vos réseaux et vos supports. Les campagnes publicitaires s'ajoutent en option."],
                ].map(([t, s], i) => (
                  <li className="rv" style={rv(i * 40)} key={t}>
                    <span>
                      <b>{t}</b>
                      <p>{s}</p>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="offer__block rv">
                <p className="k">Ce que ça vous demande</p>
                <p>Un échange avant. Une journée sur place, ou une nuit pour un hébergement. Rien à préparer, et vous n&apos;avez pas à poser.</p>
                <p className="big">Pour un hôtel ou un hébergement, l&apos;immersion se fait autour d&apos;un vrai séjour : l&apos;arrivée, la soirée, la nuit, le réveil, le petit-déjeuner.</p>
                <p>Parce qu&apos;un séjour ne se raconte pas en deux heures. C&apos;est une partie normale du projet, on la prévoit ensemble.</p>
              </div>
              <div className="offer__block rv">
                <p className="k">Selon votre projet</p>
                <p className="muted">En option : vidéos supplémentaires, séquences brutes, besoins spécifiques, droits publicitaires. Les déplacements sont précisés à l&apos;avance, dans le devis.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 08 — Ludivine */}
        <section className="sec about" id="ludivine" aria-label="Derrière June">
          <div className="wrap about__grid">
            <figure className="media about__media rv">
              <Media video={VIDEO.approche} poster="/portrait.jpg" alt="Ludivine, créatrice de June, dans la lumière du soir" pos="50% 20%" w={1122} h={1402} />
            </figure>
            <div className="ed">
              <p className="k rv">Derrière June</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Derrière June, <em>il y a moi, Ludivine.</em>
              </h2>
              <p className="rv" style={rv(160)}>Créatrice de contenu, entrepreneuse et saisonnière, j&apos;ai toujours eu ce réflexe de capturer les endroits que je découvre, leurs détails, leurs ambiances et surtout ce que l&apos;on y vit.</p>
              <p className="rv" style={rv(200)}>Je ne découvre pas un hôtel ou une expérience uniquement avec un regard de créatrice. Je me mets à la place de la personne qui va venir, réserver, dormir, manger ou vivre ce moment.</p>
              <p className="rv" style={rv(240)}>Mon rôle est de prendre ce regard extérieur pour comprendre ce qui rend votre expérience particulière, et le transformer en contenu.</p>
              <p className="big rv" style={rv(280)}>Je ne suis pas là pour gérer vos réseaux à votre place.</p>
              <p className="rv" style={rv(320)}>Je crée la matière et les histoires qui vous permettent de mieux raconter ce que vous faites vivre.</p>
            </div>
          </div>
        </section>

        {/* 09 — Alpe d'Huez */}
        <section className="alpe" id="alpe" data-dark aria-label="Alpe d'Huez, hiver 26/27">
          <div className="media">
            <Media video={VIDEO.alpe} poster="/realisations/shooting-hotel-jardins-vue.jpg" alt="Vue depuis les jardins, en attendant les images de l'Alpe d'Huez" pos="50% 40%" w={1080} h={1616} />
          </div>
          <div className="wrap alpe__grid">
            <div className="ed">
              <p className="k rv">Hiver 26/27</p>
              <h2 className="d alpe__title rv" style={rv(80)}>
                Cet hiver, <em>June prend de l&apos;altitude.</em>
              </h2>
              <p className="alpe__season rv" style={rv(140)}>Saison hiver 2026/27 — Alpe d&apos;Huez</p>
              <p className="rv" style={rv(200)}>Cet hiver, je pose mes valises à l&apos;Alpe d&apos;Huez pour la saison. Et pas seulement en tant que créatrice.</p>
              <p className="rv" style={rv(240)}>Étant moi-même saisonnière, je connais cet univers de l&apos;intérieur : son rythme, ses temps forts, les nouvelles saisons à préparer, et cette nécessité de raconter une destination au-delà de ses paysages.</p>
              <p className="rv" style={rv(280)}>Pendant toute la saison, je suis disponible directement sur place pour les hôtels, chalets, restaurants, spas, activités et expériences de la station et des alentours.</p>
            </div>
            <div className="ed">
              <p className="ask rv" style={rv(200)}>
                <span>Nouvelle saison ?</span>
                <span>Nouvelle carte ?</span>
                <span>Nouvelle expérience ?</span>
                <span>Besoin de renouveler vos contenus ?</span>
              </p>
              <p className="ask turn rv" style={rv(300)}>Faisons vivre votre hiver avant même l&apos;arrivée de vos prochains clients.</p>
              <a className="btn btn--honey rv" href="#contact" style={rv(380)} data-offre="Alpe d'Huez">
                {CTA} →
              </a>
            </div>
          </div>
        </section>

        {/* 10 — Contact */}
        <section className="dark fin" id="contact" data-dark aria-label="Contact">
          <div className="wrap">
            <div className="fin__top">
              <p className="k k--c rv">Parlons de votre expérience</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Et si on racontait votre expérience <em>avant même qu&apos;elle soit vécue ?</em>
              </h2>
              <p className="rv" style={rv(160)}>Parlez-moi de votre établissement, de ce que vous faites vivre à vos clients et de ce que vous aimeriez réussir à mieux montrer. Je vous réponds rapidement, et on commence par un simple échange.</p>
              <p className="fin__sign rv" style={rv(200)}>Ludivine — June</p>
            </div>
            <div className="fin__form rv" style={rv(240)}>
              <JuneContact />
            </div>
            <footer className="foot">
              <p>
                <a className="mark" href="#top">
                  June
                </a>{" "}
                Studio de contenu pour les lieux qui se vivent · Montpellier • Alpe d&apos;Huez
              </p>
              <nav aria-label="Liens">
                {INSTAGRAM_URL && (
                  <a className="link" href={INSTAGRAM_URL} rel="noopener noreferrer" target="_blank">
                    Instagram
                  </a>
                )}
                <a className="link" href="/portfolio">
                  Réalisations
                </a>
                <a className="link" href={`mailto:${CONTACT_EMAIL}`}>
                  Email
                </a>
              </nav>
            </footer>
          </div>
        </section>

        {/* Questions */}
        <section className="faq" aria-label="Questions fréquentes">
          <div className="wrap faq__grid">
            <div className="faq__head">
              <p className="k rv">Questions fréquentes</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Vous vous posez peut-être <em>encore quelques questions.</em>
              </h2>
            </div>
            <div className="rv" style={rv(120)}>
              {[
                ["Qu'est-ce qu'une Content Experience ?", ["Une immersion dans votre univers pour comprendre ce que vous faites réellement vivre à vos clients, et le transformer en vidéos et en photos pensées pour vos réseaux.", "Avant de créer, nous travaillons sur votre expérience, les histoires à raconter et les contenus dont vous avez réellement besoin."]],
                ["Est-ce que vous gérez aussi nos réseaux sociaux ?", ["Non. June n'est pas une agence de community management.", "Mon rôle est de réfléchir à votre contenu, de le créer et de vous livrer une matière prête à être utilisée, pour faciliter ensuite votre communication."]],
                ["Quels types de contenus pouvez-vous créer ?", ["Selon votre projet : vidéos courtes, vidéos immersives, vidéos où je vis l'expérience à la place de vos clients, photos, stories ou séquences brutes.", "Les formats sont définis ensemble selon votre expérience, vos objectifs et les histoires que nous souhaitons raconter."]],
                ["Est-ce que vous apparaissez dans les contenus ?", ["Oui, lorsque cela a du sens.", "Je peux être uniquement derrière la caméra, ou vivre directement l'expérience pour permettre au futur client de se projeter : arrivée dans un hôtel, activité, repas, soin, séjour…", "Nous le définissons ensemble avant l'immersion. Vous, vous n'avez jamais à poser."]],
                ["Est-ce uniquement pour les hôtels ?", ["Non.", "June travaille avec les lieux et expériences qui ont quelque chose à faire vivre et à raconter : hôtels, hébergements, wellness, restaurants, activités touristiques, retraites, séjours expérientiels ou encore événements intimistes."]],
                ["Combien coûte une Content Experience ?", ["Les projets débutent à partir de 490 € TTC.", "Le tarif dépend ensuite de l'expérience, de la durée de l'immersion, des contenus à créer, des éventuels déplacements et des besoins spécifiques du projet.", "Un devis personnalisé est réalisé avant chaque collaboration."]],
                ["Faut-il vous accueillir sur place ?", ["Dans la majorité des cas, oui.", "L'immersion fait partie de mon approche : je souhaite découvrir et vivre votre expérience pour pouvoir la raconter avec justesse.", "Pour un hôtel ou un hébergement, cela peut par exemple nécessiter une nuit sur place afin de raconter l'expérience dans son ensemble : arrivée, soirée, nuit, réveil, petit-déjeuner…"]],
                ["Peut-on utiliser les vidéos en publicité ?", ["Les contenus sont prévus pour vos réseaux et vos supports, selon les droits définis pour le projet.", "Si vous souhaitez utiliser certains contenus dans des campagnes publicitaires, des droits d'utilisation supplémentaires pourront être ajoutés."]],
                ["Où vous déplacez-vous ?", ["June est basée entre Montpellier et l'Alpe d'Huez pour la saison hiver 2026/27, mais je peux me déplacer ailleurs en France selon les projets.", "Les éventuels frais de déplacement sont simplement définis en amont, dans le devis."]],
                ["Comment démarrer un projet ?", ["Vous me parlez de votre établissement ou de votre expérience via le formulaire de contact.", "Nous échangeons ensuite sur ce que vous proposez, ce que vous aimeriez mieux raconter et vos besoins en contenu.", "Si June correspond à votre projet, nous imaginons ensemble votre Content Experience."]],
              ].map(([q, a]) => (
                <details key={q as string}>
                  <summary>
                    {q as string}
                    <svg aria-hidden="true">
                      <use href="#i-plus" />
                    </svg>
                  </summary>
                  {(a as string[]).map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </details>
              ))}
              <div className="faq__cta">
                <a className="btn" href="#contact">
                  {CTA} →
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

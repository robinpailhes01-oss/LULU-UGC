import type React from "react";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import JuneContact from "@/components/june/JuneContact";
import { CONTACT_EMAIL, CTA, INSTAGRAM_URL, VIDEO } from "@/lib/site";
import { works } from "@/lib/work";

/* Accueil, version site finale (brief « June Content Studio — version site
   finale »). Hiérarchie : expérience client → storytelling → création de
   contenu. Éditorial, immersif, grandes vidéos, textes courts au scroll.
   Vidéos : déposer les fichiers dans public/video/ (voir LISEZMOI.txt). */

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
          <a href="#content-experience">Content Experience</a>
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="btn" href="#contact">
          <span className="l">{CTA} →</span>
          <span className="s">Mon projet →</span>
        </a>
      </header>

      <main id="top">
        {/* 01 — Hero */}
        <section className="hero" aria-label="June Content Studio">
          <div className="media">
            <Media video={VIDEO.hero} poster="/realisations/shooting-hotel-piscine-ext.jpg" alt="Piscine extérieure d'un hôtel & spa au soleil couchant" pos="50% 55%" w={1080} h={1616} eager />
          </div>
          <div className="hero__inner">
            <p className="hero__june rise" style={{ "--d": "80ms" } as React.CSSProperties}>June</p>
            <p className="hero__studio rise" style={{ "--d": "180ms" } as React.CSSProperties}>Content Studio</p>
            <p className="k k--c hero__k rise" style={{ "--d": "260ms" } as React.CSSProperties}>Hospitality • Tourism • Experiences</p>
            <h1 className="d hero__title rise" style={{ "--d": "340ms" } as React.CSSProperties}>
              Des lieux qui font vivre quelque chose. <em>Des contenus qui donnent envie de le vivre.</em>
            </h1>
            <p className="hero__lede rise" style={{ "--d": "440ms" } as React.CSSProperties}>June est un studio de création spécialisé dans l&apos;expérience &amp; le storytelling.</p>
            <p className="hero__lede rise" style={{ "--d": "500ms" } as React.CSSProperties}>Je découvre ce que vos clients vivent réellement chez vous pour le transformer en histoires et en contenus dans lesquels vos futurs clients peuvent se projeter.</p>
            <p className="hero__fmt rise" style={{ "--d": "580ms" } as React.CSSProperties}>Reels · UGC · Vidéos · Photos</p>
            <a className="btn rise" href="#content-experience" style={{ "--d": "660ms" } as React.CSSProperties}>
              Découvrir Content Experience →
            </a>
            <p className="hero__place rise" style={{ "--d": "740ms" } as React.CSSProperties}>Montpellier • France • Alpe d&apos;Huez — Hiver 26/27</p>
          </div>
        </section>

        {/* 02 — Le constat */}
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
              <p className="rv" style={rv(160)}>Vous avez créé un lieu, une ambiance, une expérience et toutes ces petites attentions que vos clients découvrent une fois sur place.</p>
              <p className="big rv" style={rv(200)}>Mais derrière un écran ?</p>
              <p className="rv" style={rv(240)}>Il n&apos;est pas toujours évident de savoir quoi montrer, quelle histoire raconter et comment faire ressentir ce qui rend votre expérience différente.</p>
              <p className="rv" style={rv(280)}>Alors on finit parfois par montrer une chambre, un plat, un soin, une piscine…</p>
              <p className="big rv" style={rv(320)}>Sans réellement montrer ce que l&apos;on vit autour.</p>
              <p className="rv" style={rv(360)}>Et entre votre établissement, vos clients et tout le reste, réfléchir et créer du contenu finit souvent tout en bas de la liste.</p>
              <p className="turn rv" style={rv(400)}>C&apos;est là que June intervient.</p>
              <p className="after rv" style={rv(440)}>Un regard extérieur pour identifier ce qui mérite d&apos;être raconté et le transformer en contenu.</p>
            </div>
          </div>
        </section>

        {/* 03 — L'approche June */}
        <section className="sec approche" aria-label="L'approche June">
          <div className="wrap approche__grid">
            <figure className="media rv">
              <Media video={VIDEO.approche} poster="/portrait.jpg" alt="Ludivine en création, dans la lumière du soir" pos="50% 20%" w={1122} h={1402} />
            </figure>
            <div className="ed">
              <p className="k rv">Not just content.</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Avant de créer du contenu, <em>il faut savoir ce que l&apos;on veut raconter.</em>
              </h2>
              <p className="rv" style={rv(160)}>Je ne viens pas simplement filmer votre établissement.</p>
              <p className="rv" style={rv(200)}>Je viens le découvrir comme pourrait le faire votre futur client.</p>
              <div className="lines" style={{ marginTop: "0.6rem" }}>
                <p className="rv" style={rv(240)}>Je découvre votre univers.</p>
                <p className="rv" style={rv(300)}>J&apos;observe les détails.</p>
                <p className="rv" style={rv(360)}>Je comprends votre expérience.</p>
                <p className="rv" style={rv(420)}>Je cherche ce qui fait réellement votre différence.</p>
                <p className="rv" style={rv(500)}>
                  <em>Et surtout, je la vis.</em>
                </p>
              </div>
              <p className="rv" style={rv(560)}>Parce que l&apos;histoire n&apos;est pas à inventer.</p>
              <p className="rv" style={rv(600)}>Elle existe déjà dans ce que vous faites vivre à vos clients.</p>
              <p className="rv" style={rv(640)}>Mon travail est de la repérer, de trouver comment la raconter et de la transformer en contenus immersifs, humains et pensés pour les réseaux.</p>
              <p className="sig rv" style={rv(700)}>
                Vous faites vivre l&apos;expérience. <em>June trouve comment la raconter.</em>
              </p>
            </div>
          </div>
        </section>

        {/* 04 — Content Experience */}
        <section className="ce" id="content-experience" aria-label="Content Experience">
          <div className="wrap">
            <div className="ce__head">
              <h2 className="d ce__title rv">
                Content
                <br />
                Experience <span className="star">✦</span>
              </h2>
              <div className="ce__intro">
                <p className="lede rv" style={rv(100)}>Une immersion dans votre univers pour comprendre, raconter &amp; créer.</p>
                <p className="rv" style={rv(160)}>Chaque établissement est différent.</p>
                <p className="rv" style={rv(200)}>C&apos;est pourquoi je ne pars pas d&apos;une liste de contenus à produire.</p>
                <p className="rv" style={rv(240)}>Je pars de votre expérience, de vos clients et de ce que vous souhaitez réellement raconter.</p>
                <p className="rv" style={rv(280)}>Puis nous construisons les contenus autour.</p>
              </div>
            </div>
            <ol className="steps">
              <li className="step rv">
                <span className="step__n">01</span>
                <h3>Comprendre</h3>
                <p className="big">Votre expérience avant votre contenu.</p>
                <p>Nous échangeons sur votre établissement, votre clientèle, votre univers, vos offres et ce que vous souhaitez davantage faire ressentir.</p>
                <p className="tags">Brief · Analyse · Expérience client</p>
              </li>
              <li className="step rv" style={rv(100)}>
                <span className="step__n">02</span>
                <h3>Raconter</h3>
                <p className="big">Trouver les bonnes histoires et les bons angles.</p>
                <div className="list">
                  <span>Une arrivée.</span>
                  <span>Un réveil.</span>
                  <span>Un dîner.</span>
                  <span>Un retour du ski.</span>
                  <span>Une attention particulière.</span>
                  <span>Une journée entière chez vous…</span>
                </div>
                <p>Nous identifions les moments qui permettront à votre futur client de comprendre ce que l&apos;on vit réellement chez vous.</p>
                <p className="tags">Direction créative · Storytelling · Content Plan</p>
              </li>
              <li className="step rv" style={rv(160)}>
                <span className="step__n">03</span>
                <h3>Vivre &amp; créer</h3>
                <p className="big">Je viens sur place vivre l&apos;expérience.</p>
                <p>Avec mon regard de créatrice, mais aussi celui de votre futur client.</p>
                <p>Je peux être derrière la caméra ou incarner directement l&apos;expérience lorsque cela sert l&apos;histoire.</p>
                <p className="tags">Reels · UGC · vidéos immersives · lifestyle · photos · détails · ambiance</p>
              </li>
              <li className="step rv" style={rv(220)}>
                <span className="step__n">04</span>
                <h3>Vous donner la matière</h3>
                <p className="big">Vous récupérez vos contenus prêts à être utilisés.</p>
                <p>Montage, sélection, organisation et Content Board pour savoir ce que vous avez entre les mains et comment l&apos;exploiter.</p>
                <p>Vous repartez avec une vraie matière créative pour raconter votre établissement, pas simplement des rushs oubliés dans un Drive.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* 05 — Ce que l'on peut créer */}
        <section className="sec formats" id="formats" aria-label="Formats">
          <div className="wrap">
            <div className="formats__head ed">
              <p className="k rv">Formats</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Une expérience. <em>Plusieurs façons de la raconter.</em>
              </h2>
            </div>
            <div className="fgrid">
              {[
                ["Reels", "Pour raconter une ambiance, un moment, une journée ou une expérience complète à travers des formats courts pensés pour les réseaux.", "/wall/yacht-reel.jpg", "Réel publié pour Harmonie Yacht", 389, 614, "/video/work/harmonie-yacht.mp4", ""],
                ["UGC", "Des contenus plus incarnés dans lesquels je peux moi-même vivre l'expérience et permettre au futur client de se projeter plus naturellement.", "/wall/ugc-hotel.jpg", "Vidéo UGC dans une chambre d'hôtel", 393, 622, "/video/work/experience-hotel.mp4", ""],
                ["Vidéos immersives", "Des séquences centrées sur les sensations, les détails et les moments qui font réellement l'expérience.", "/wall/gite.jpg", "Petit-déjeuner sous la treille au Gîte de l'Abric", 393, 633, "/video/work/gite-abric.mp4", "50% 30%"],
                ["Photos", "Une sélection d'images lifestyle et d'ambiance pour compléter votre bibliothèque de contenu, sans transformer l'immersion en shooting photo classique.", "/realisations/shooting-hotel-chambre.jpg", "Chambre d'hôtel baignée de lumière", 1200, 1600, "", ""],
                ["Stories & rushs", "Des formats plus spontanés pour vous permettre d'alimenter votre communication avec davantage de facilité.", "/wall/ugc-bateau.jpg", "Sortie en mer, chapeau de paille et bateau au large", 386, 615, "/video/work/sortie-en-mer.mp4", ""],
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

        {/* 06 — Pour qui */}
        <section className="sec who" id="pour-qui" aria-label="Pour qui">
          <div className="wrap">
            <div className="who__head ed">
              <p className="k rv">Hospitality • Tourism • Experiences</p>
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
              <a className="btn btn--line rv" href="#work" style={rv(120)}>
                Voir les expériences →
              </a>
            </div>
          </div>
        </section>

        {/* 07 — Réalisations */}
        <section className="work" id="work" aria-label="Selected work">
          <div className="wrap">
            <div className="work__head">
              <p className="k rv">Selected work</p>
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

        {/* 08 — L'offre */}
        <section className="offer" id="offre" aria-label="L'offre">
          <div className="wrap offer__grid">
            <div className="offer__side">
              <p className="k rv">Work with June</p>
              <h2 className="d ce__title rv" style={rv(80)}>
                Content Experience <span className="star">✦</span>
              </h2>
              <p className="offer__price rv" style={rv(140)}>
                À partir de 490<span className="eur">&nbsp;€</span> TTC
              </p>
              <p className="muted rv" style={rv(200)}>Une Content Experience est construite selon votre établissement, l&apos;expérience que nous souhaitons raconter et la quantité de contenu réellement nécessaire.</p>
              <a className="btn rv" href="#contact" style={rv(260)} data-offre="Content Experience">
                Parler de votre projet →
              </a>
            </div>
            <div>
              <p className="k rv" style={{ marginBottom: "1.2rem" }}>Chaque projet comprend</p>
              <ul className="offer__list">
                {[
                  ["Brief & échange en amont", "Pour comprendre votre univers et vos besoins."],
                  ["Analyse de l'expérience", "Pour identifier ce qui mérite réellement d'être montré."],
                  ["Direction créative & storytelling", "Pour déterminer les histoires, angles et intentions."],
                  ["Content Plan personnalisé", "Pour savoir ce que nous allons créer et pourquoi."],
                  ["Immersion dans votre établissement", "Pour vivre et créer l'expérience sur place."],
                  ["Création des contenus définis ensemble", ""],
                  ["Montage & post-production", ""],
                  ["Content Board", ""],
                  ["Espace client dédié", ""],
                  ["Livraison HD", ""],
                ].map(([t, s], i) => (
                  <li className="rv" style={rv(i * 40)} key={t}>
                    <span>
                      <b>{t}</b>
                      {s && <p>{s}</p>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="offer__block rv">
                <p className="k">Selon votre projet</p>
                <p>Nous pouvons également ajouter :</p>
                <p className="muted">Reels supplémentaires · vidéos UGC · rushs · contenus supplémentaires · besoins spécifiques · droits publicitaires.</p>
              </div>
              <div className="offer__block rv">
                <p className="k">Hôtels &amp; hébergements</p>
                <p>Pour raconter une expérience dans son ensemble, l&apos;immersion est pensée autour d&apos;un véritable séjour sur place.</p>
                <p className="big">L&apos;arrivée. La soirée. La nuit. Le réveil. Le petit-déjeuner. Les expériences autour.</p>
                <p>Parce qu&apos;un séjour ne se raconte pas en deux heures.</p>
                <small>Déplacements et éventuels frais liés à l&apos;expérience définis selon le projet.</small>
              </div>
            </div>
          </div>
        </section>

        {/* 09 — Pourquoi June */}
        <section className="sec about" id="about" aria-label="Behind June">
          <div className="wrap about__grid">
            <figure className="plate rv" data-dev>
              <img src="/portrait.jpg" alt="Ludivine, créatrice de June, dans la lumière du soir" width={1122} height={1402} loading="lazy" style={{ "--pos": "50% 20%" } as React.CSSProperties} />
            </figure>
            <div className="ed">
              <p className="k rv">Behind June</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Derrière June, <em>il y a moi, Ludivine.</em>
              </h2>
              <p className="rv" style={rv(160)}>Créatrice de contenu, entrepreneuse et saisonnière, j&apos;ai toujours eu ce réflexe de capturer les endroits que je découvre, leurs détails, leurs ambiances et surtout ce que l&apos;on y vit.</p>
              <p className="rv" style={rv(200)}>C&apos;est aussi ce qui influence ma façon de travailler aujourd&apos;hui.</p>
              <p className="rv" style={rv(240)}>Je ne découvre pas un hôtel ou une expérience uniquement avec un regard de créatrice.</p>
              <p className="rv" style={rv(280)}>Je me mets naturellement à la place de la personne qui va venir, réserver, dormir, manger ou vivre ce moment.</p>
              <p className="rv" style={rv(320)}>Avec June, mon rôle est de prendre ce regard extérieur pour comprendre ce qui rend votre expérience particulière, identifier les histoires qui méritent d&apos;être racontées et les transformer en contenu.</p>
              <p className="big rv" style={rv(360)}>Je ne suis pas là pour gérer vos réseaux à votre place.</p>
              <p className="rv" style={rv(400)}>Je crée la matière et les histoires qui vous permettent de mieux raconter ce que vous faites vivre.</p>
            </div>
          </div>
        </section>

        {/* 10 — Alpe d'Huez */}
        <section className="alpe" id="alpe" data-dark aria-label="Alpe d'Huez, hiver 26/27">
          <div className="media">
            <Media video={VIDEO.alpe} poster="/realisations/shooting-hotel-jardins-vue.jpg" alt="Vue depuis les jardins, en attendant les images de l'Alpe d'Huez" pos="50% 40%" w={1080} h={1616} />
          </div>
          <div className="wrap alpe__grid">
            <div className="ed">
              <p className="k rv">Winter 26/27</p>
              <h2 className="d alpe__title rv" style={rv(80)}>
                Cet hiver, <em>June prend de l&apos;altitude.</em>
              </h2>
              <p className="alpe__season rv" style={rv(140)}>Saison hiver 2026/27 — Alpe d&apos;Huez</p>
              <p className="rv" style={rv(200)}>Cet hiver, je pose mes valises à l&apos;Alpe d&apos;Huez pour la saison.</p>
              <p className="rv" style={rv(240)}>Et pas seulement en tant que créatrice.</p>
              <p className="rv" style={rv(280)}>Étant moi-même saisonnière, je connais cet univers de l&apos;intérieur : son rythme, ses temps forts, les nouvelles saisons à préparer, les expériences qui évoluent et cette nécessité de réussir à raconter une destination au-delà de ses paysages.</p>
              <p className="rv" style={rv(320)}>Pendant toute la saison, June sera donc disponible directement sur place pour créer avec les hôtels, chalets, restaurants, spas, activités et expériences de la station et des alentours.</p>
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
                Créer ensemble à l&apos;Alpe d&apos;Huez →
              </a>
            </div>
          </div>
        </section>

        {/* 11 — CTA final + contact */}
        <section className="dark fin" id="contact" data-dark aria-label="Contact">
          <div className="wrap">
            <div className="fin__top">
              <p className="k k--c rv">Your experience, told differently.</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Et si on racontait votre expérience <em>avant même qu&apos;elle soit vécue ?</em>
              </h2>
              <p className="rv" style={rv(160)}>Parlez-moi de votre établissement, de ce que vous faites vivre à vos clients et de ce que vous aimeriez réussir à mieux montrer.</p>
              <p className="fin__sign rv" style={rv(200)}>Ludivine — June Content Studio</p>
            </div>
            <div className="fin__form rv" style={rv(240)}>
              <JuneContact />
            </div>
            <footer className="foot">
              <p>
                <a className="mark" href="#top">
                  June
                </a>{" "}
                Content Studio · Hospitality • Tourism • Experiences
              </p>
              <nav aria-label="Liens">
                {INSTAGRAM_URL && (
                  <a className="link" href={INSTAGRAM_URL} rel="noopener noreferrer" target="_blank">
                    Instagram
                  </a>
                )}
                <a className="link" href="/portfolio">
                  Portfolio
                </a>
                <a className="link" href={`mailto:${CONTACT_EMAIL}`}>
                  Email
                </a>
              </nav>
            </footer>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq" aria-label="Questions fréquentes">
          <div className="wrap faq__grid">
            <div className="faq__head">
              <p className="k rv">FAQ</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Vous vous posez peut-être <em>encore quelques questions.</em>
              </h2>
            </div>
            <div className="rv" style={rv(120)}>
              {[
                ["Qu'est-ce qu'une Content Experience ?", ["Une Content Experience est une immersion dans votre univers pour comprendre ce que vous faites réellement vivre à vos clients et le transformer en contenus pensés pour vos réseaux.", "Avant de créer, nous travaillons sur votre expérience, les histoires à raconter et les contenus dont vous avez réellement besoin."]],
                ["Est-ce que vous gérez aussi nos réseaux sociaux ?", ["Non. June n'est pas une agence de community management.", "Mon rôle est de réfléchir à votre contenu, de le créer et de vous livrer une matière prête à être utilisée pour faciliter ensuite votre communication."]],
                ["Quels types de contenus pouvez-vous créer ?", ["Selon votre projet : Reels, vidéos immersives, UGC, contenus lifestyle, photos, stories ou rushs complémentaires.", "Les formats sont définis ensemble selon votre expérience, vos objectifs et les histoires que nous souhaitons raconter."]],
                ["Est-ce que vous apparaissez dans les contenus ?", ["Oui, lorsque cela a du sens.", "Je peux être uniquement derrière la caméra ou directement incarner l'expérience pour permettre au futur client de se projeter : arrivée dans un hôtel, activité, repas, soin, séjour…", "Nous le définissons ensemble avant l'immersion."]],
                ["Est-ce uniquement pour les hôtels ?", ["Non.", "June travaille avec les lieux et expériences qui ont quelque chose à faire vivre et à raconter : hôtels, hébergements, wellness, restaurants, activités touristiques, retraites, séjours expérientiels ou encore événements intimistes."]],
                ["Combien coûte une Content Experience ?", ["Les projets débutent à partir de 490 € TTC.", "Le tarif dépend ensuite de l'expérience, de la durée de l'immersion, des contenus à créer, des éventuels déplacements et des besoins spécifiques du projet.", "Un devis personnalisé est réalisé avant chaque collaboration."]],
                ["Faut-il vous accueillir sur place ?", ["Dans la majorité des cas, oui.", "L'immersion fait partie de mon approche : je souhaite découvrir et vivre votre expérience pour pouvoir la raconter avec justesse.", "Pour un hôtel ou un hébergement, cela peut par exemple nécessiter une nuit sur place afin de raconter l'expérience dans son ensemble : arrivée, soirée, nuit, réveil, petit-déjeuner…"]],
                ["Peut-on utiliser les vidéos en publicité ?", ["Les contenus sont initialement prévus pour une utilisation organique sur vos supports et réseaux sociaux, selon les droits définis pour le projet.", "Si vous souhaitez utiliser certains contenus dans des campagnes publicitaires, des droits d'utilisation supplémentaires pourront être ajoutés."]],
                ["Où vous déplacez-vous ?", ["June est basée entre Montpellier et l'Alpe d'Huez pour la saison hiver 2026/27, mais je peux me déplacer ailleurs en France selon les projets.", "Les éventuels frais de déplacement sont simplement définis en amont."]],
                ["Comment démarrer un projet ?", ["Vous pouvez simplement me parler de votre établissement ou de votre expérience via le formulaire de contact.", "Nous échangeons ensuite sur ce que vous proposez, ce que vous aimeriez mieux raconter et vos besoins en contenu.", "Si June correspond à votre projet, nous imaginons ensemble votre Content Experience."]],
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

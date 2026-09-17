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
          <b>June</b>
          <small>Content Studio</small>
        </a>
        <nav className="nav__links" aria-label="Navigation">
          <a href="#comment">Comment ça se passe</a>
          <a href="#realisations">Réalisations</a>
          <a href="#ludivine">Ludivine</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="btn" href="#contact">
          <span className="l">{CTA}</span>
          <span className="s">Mon projet</span>
        </a>
      </header>

      <main id="top">
        {/* 01 — Hero : pour qui, ce qu'on obtient, un bouton */}
        <section className="hero" aria-label="June, studio de contenu">
          <div className="media">
            <Media video={VIDEO.hero} poster="/realisations/shooting-hotel-terrasse.jpg" alt="Terrasse d'un hôtel & spa au soleil couchant" pos="70% 45%" w={1080} h={1616} eager />
          </div>
          <div className="hero__inner">
            <div className="hero__copy">
              <p className="k hero__k rise" style={{ "--d": "80ms" } as React.CSSProperties}>Studio de contenu pour les lieux qui se vivent</p>
              <h1 className="d hero__title rise" style={{ "--d": "200ms" } as React.CSSProperties}>
                Des lieux qui font vivre quelque chose. <em>Des contenus qui donnent envie de le vivre.</em>
              </h1>
              <p className="hero__lede rise" style={{ "--d": "340ms" } as React.CSSProperties}>Je vis votre établissement comme vos clients. Vous recevez des vidéos et des photos prêtes à publier.</p>
              <a className="btn rise" href="#comment" style={{ "--d": "460ms" } as React.CSSProperties}>
                Voir comment ça se passe
              </a>
            </div>
            <div className="hero__side">
              <p className="script rise" style={{ "--d": "700ms" } as React.CSSProperties}>More than content</p>
              <p className="hero__place rise" style={{ "--d": "780ms" } as React.CSSProperties}>Montpellier • Alpe d&apos;Huez, hiver 26/27</p>
              <p className="hero__scroll rise" aria-hidden="true" style={{ "--d": "900ms" } as React.CSSProperties}>Scroll</p>
            </div>
          </div>
        </section>


        {/* 02 — Pour qui : les univers */}
        <section className="strip night" id="pour-qui" aria-label="Pour qui">
          <div className="strip__head">
            <div>
              <p className="k rv">Pour qui</p>
              <h2 className="d h2 rv" style={rv(80)}>Les lieux &amp; expériences qui ont quelque chose à faire vivre.</h2>
            </div>
          </div>
          <div className="tiles">
            {[
              ["01", "Hospitality", "Hôtels • Chalets • Maisons d'hôtes • Lieux insolites", "/realisations/shooting-hotel-chambre.jpg", "50% 45%"],
              ["02", "Wellness", "Spas • Instituts • Bien-être", "/wall/beltra.jpg", "50% 40%"],
              ["03", "Tourisme", "Activités • Expériences • Loisirs", "/wall/yacht-reel.jpg", "50% 60%"],
              ["04", "Food & lifestyle", "Restaurants • Bars • Lieux de vie", "/wall/unamas.jpg", "50% 45%"],
              ["05", "Retraites", "Yoga • Séjours thématiques • Workshops", "/realisations/shooting-hotel-jardins.jpg", "50% 50%"],
              ["06", "Expériences éphémères", "Pop-up • Événements intimistes", "/realisations/shooting-hotel-couple-terrasse.jpg", "50% 40%"],
            ].map(([n, t, sub, img, pos], i) => (
              <a className="tile rv" style={rv(i * 70)} href="#comment" key={t}>
                <img src={img} alt={`${t} : ${sub}`} width={1080} height={1404} loading="lazy" style={{ "--pos": pos } as React.CSSProperties} />
                <span className="tile__cap">
                  <span className="tile__n">{n}</span>
                  <b>{t}</b>
                  <span>{sub}</span>
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* 03 — Le constat, dans ses mots */}
        <section className="sec constat light" aria-label="Le point de départ">
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
              <p className="rv" style={rv(160)}>Les photos ont été faites entre deux départs. On montre une chambre, un plat, une piscine… sans ce que l&apos;on vit autour.</p>
              <p className="turn rv" style={rv(240)}>C&apos;est là que June intervient.</p>
            </div>
          </div>
        </section>

        {/* 03 — Comment ça se passe */}
        <section className="ce night" id="comment" aria-label="Comment ça se passe">
          <div className="ce__card light">
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
              </div>
            </div>
            <ol className="steps">
              <li className="step rv">
                <span className="step__n">01</span>
                <h3>On échange</h3>
                <p className="big">Un échange avant de venir.</p>
                <p>Rien à préparer : je pose les questions.</p>
              </li>
              <li className="step rv" style={rv(100)}>
                <span className="step__n">02</span>
                <h3>On choisit quoi raconter</h3>
                <p className="big">Une arrivée. Un réveil. Un dîner. Une attention particulière…</p>
                <p>Vous validez le plan avant que je vienne.</p>
              </li>
              <li className="step rv" style={rv(160)}>
                <span className="step__n">03</span>
                <h3>Je viens vivre l&apos;expérience</h3>
                <p className="big">Chez vous, comme votre futur client.</p>
                <p>Une journée, ou une nuit pour un hébergement. Vous n&apos;avez pas à poser.</p>
              </li>
              <li className="step rv" style={rv(220)}>
                <span className="step__n">04</span>
                <h3>Vous recevez tout</h3>
                <p className="big">Vos vidéos et photos, montées, prêtes à publier.</p>
                <p>Avec votre tableau de bord : quoi utiliser, et où.</p>
              </li>
            </ol>
            <div className="ce__foot">
              <p className="sig rv">
                Vous faites vivre l&apos;expérience. <em>June trouve comment la raconter.</em>
              </p>
              <div className="rv" style={rv(120)}>
                <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.8rem" }}>À partir de 490 € TTC · devis avant tout engagement</p>
                <a className="btn btn--fill" href="#prix">
                  Découvrir l&apos;offre
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 04 — Ce que vous recevez */}
        <section className="sec formats night" id="recevez" aria-label="Ce que vous recevez">
          <div className="wrap">
            <div className="formats__head">
              <div>
                <p className="k rv">Ce que vous recevez</p>
                <h2 className="d h2 rv" style={rv(80)}>
                  Une expérience. <em>Plusieurs façons de la raconter.</em>
                </h2>
              </div>
              <p className="script rv" style={rv(160)}>Experiences create connections</p>
            </div>
            <div className="fgrid">
              {[
                ["Vidéos courtes", "Une ambiance, un moment, une journée. Pour vos réseaux.", "/wall/yacht-reel.jpg", "Vidéo publiée pour Harmonie Yacht", 389, 614, "/video/work/harmonie-yacht.mp4", ""],
                ["Vidéos vécues", "Je prends la place de vos clients. Ils se projettent.", "/wall/ugc-hotel.jpg", "Vidéo vécue dans une chambre d'hôtel", 393, 622, "/video/work/experience-hotel.mp4", ""],
                ["Vidéos immersives", "Les sensations, les détails, les moments.", "/wall/gite.jpg", "Petit-déjeuner sous la treille au Gîte de l'Abric", 393, 633, "/video/work/gite-abric.mp4", "50% 30%"],
                ["Photos", "Une sélection d'ambiance pour votre site et vos annonces.", "/realisations/shooting-hotel-chambre.jpg", "Chambre d'hôtel baignée de lumière", 1200, 1600, "", ""],
                ["Stories & séquences brutes", "Pour alimenter votre communication, simplement.", "/wall/ugc-bateau.jpg", "Sortie en mer, chapeau de paille et bateau au large", 386, 615, "/video/work/sortie-en-mer.mp4", ""],
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
        <section className="work light" id="realisations" aria-label="Réalisations">
          <div className="wrap">
            <div className="work__head">
              <div>
                <p className="k rv">Réalisations</p>
                <h2 className="d h2 rv" style={rv(80)}>
                  Quelques expériences, <em>racontées par June.</em>
                </h2>
              </div>
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

          </div>
        </section>

        {/* 07 — Le prix, vu du client */}
        <section className="offer night" id="prix" aria-label="Le prix">
          <div className="wrap offer__grid">
            <div className="offer__side">
              <p className="k rv">Le prix</p>
              <h2 className="d ce__title rv" style={rv(80)}>
                Content Experience <span className="star">✦</span>
              </h2>
              <p className="offer__price rv" style={rv(140)}>
                À partir de 490<span className="eur">&nbsp;€</span> TTC
              </p>
              <p className="muted rv" style={rv(200)}>Selon votre établissement et la quantité de contenu utile. Devis avant tout engagement.</p>
              <a className="btn btn--fill rv" href="#contact" style={rv(260)} data-offre="Content Experience">
                {CTA}
              </a>
            </div>
            <div>
              <p className="k rv" style={{ marginBottom: "1.2rem" }}>Vous recevez</p>
              <ul className="offer__list">
                {[
                  ["Les vidéos et les photos définies ensemble", "Montées, aux bons formats."],
                  ["Votre tableau de bord", "Quoi utiliser, et où."],
                  ["Votre espace client", "Tout au même endroit, en haute définition."],
                  ["Vos droits d'utilisation", "Réseaux et supports. Publicité en option."],
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
                <p className="big">Un échange avant. Une journée sur place, ou une nuit pour un hébergement.</p>
                <p>Parce qu&apos;un séjour ne se raconte pas en deux heures. Rien à préparer, et vous n&apos;avez pas à poser.</p>
              </div>
              <div className="offer__block rv">
                <p className="k">En option</p>
                <p className="muted">Vidéos supplémentaires, séquences brutes, droits publicitaires. Déplacements précisés dans le devis.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 08 — Ludivine */}
        <section className="sec about light" id="ludivine" aria-label="Derrière June">
          <div className="wrap about__grid">
            <figure className="media about__media rv">
              <Media video={VIDEO.approche} poster="/portrait.jpg" alt="Ludivine, créatrice de June, dans la lumière du soir" pos="50% 20%" w={1122} h={1402} />
            </figure>
            <div className="ed">
              <p className="k rv">Derrière June</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Derrière June, <em>il y a moi, Ludivine.</em>
              </h2>
              <p className="rv" style={rv(160)}>Créatrice de contenu et saisonnière, j&apos;ai toujours capturé les endroits que je découvre, et surtout ce que l&apos;on y vit.</p>
              <p className="rv" style={rv(200)}>Je me mets à la place de la personne qui va venir, dormir, manger ou vivre ce moment. Puis je le raconte.</p>
              <p className="big rv" style={rv(240)}>Je ne gère pas vos réseaux. Je crée la matière qui vous permet de mieux raconter ce que vous faites vivre.</p>
            </div>
          </div>
        </section>

        {/* 09 — Alpe d'Huez */}
        <section className="alpe" id="alpe" aria-label="Alpe d'Huez, hiver 26/27">
          <div className="media">
            <Media video={VIDEO.alpe} poster="/realisations/shooting-hotel-jardins-vue.jpg" alt="Vue depuis les jardins, en attendant les images de l'Alpe d'Huez" pos="50% 40%" w={1080} h={1616} />
          </div>
          <div className="wrap alpe__grid">
            <div className="ed">
              <p className="k rv">Hiver 26/27</p>
              <h2 className="d alpe__title rv" style={rv(80)}>
                Cet hiver, <em>June prend de l&apos;altitude.</em>
              </h2>
              <p className="rv" style={rv(160)}>Je pose mes valises à l&apos;Alpe d&apos;Huez pour la saison. Saisonnière moi-même, je connais cet univers de l&apos;intérieur.</p>
              <p className="rv" style={rv(200)}>Sur place tout l&apos;hiver, pour les hôtels, chalets, restaurants, spas et expériences de la station.</p>
            </div>
            <div className="ed">
              <p className="ask rv" style={rv(200)}>
                <span>Nouvelle saison ?</span>
                <span>Nouvelle carte ?</span>
                <span>Nouvelle expérience ?</span>
              </p>
              <p className="ask turn rv" style={rv(300)}>Faisons vivre votre hiver avant l&apos;arrivée de vos clients.</p>
              <a className="btn rv" href="#contact" style={rv(380)} data-offre="Alpe d'Huez">
                {CTA}
              </a>
            </div>
          </div>
        </section>

        {/* 10 — Contact */}
        <section className="fin night" id="contact" data-dark aria-label="Contact">
          <div className="wrap">
            <div className="fin__top">
              <p className="k k--c rv">Parlons de votre expérience</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Et si on racontait votre expérience <em>avant même qu&apos;elle soit vécue ?</em>
              </h2>
              <p className="rv" style={rv(160)}>Parlez-moi de votre établissement. On commence par un simple échange.</p>
              <p className="fin__sign rv" style={rv(200)}>Ludivine — June</p>
            </div>
            <div className="fin__form rv" style={rv(240)}>
              <JuneContact />
            </div>
            <footer className="foot">
              <p>
                <a className="mark" href="#top">
                  <b>June</b>
                  <small>Studio de contenu pour les lieux qui se vivent · Montpellier • Alpe d&apos;Huez</small>
                </a>
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
        <section className="faq light" aria-label="Questions fréquentes">
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
                <a className="btn btn--fill" href="#contact">
                  {CTA}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

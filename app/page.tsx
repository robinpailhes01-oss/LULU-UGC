import type React from "react";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import JuneContact from "@/components/june/JuneContact";
import SiteNav from "@/components/june/SiteNav";
import SiteFooter from "@/components/june/SiteFooter";
import { VIDEO } from "@/lib/site";
import { works } from "@/lib/work";

/*
   Accueil June Content Studio, version claire (brief du 2026-09-21).
   Ivoire dominant, quelques grandes images immersives, brun très foncé
   réservé à l'offre, à l'Alpe d'Huez, au menu mobile et au pied de page.
   Les textes sont ceux du brief, sans ajout.
*/

const rv = (ms: number) => ({ "--rd": `${ms}ms` }) as React.CSSProperties;
const posOf = (pos?: string) => (pos ? ({ "--pos": pos } as React.CSSProperties) : undefined);

function Media({ video, poster, alt, pos, w, h, eager, auto = "view", px }: { video?: string; poster: string; alt: string; pos?: string; w: number; h: number; eager?: boolean; auto?: "view" | "hover"; px?: number }) {
  return (
    <div className="media" data-px={px ?? undefined}>
      <img src={poster} alt={alt} width={w} height={h} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} style={posOf(pos)} />
      {video && (
        <video data-auto={auto} muted loop playsInline preload="none" poster={poster} aria-hidden="true" style={posOf(pos)}>
          <source src={video} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

const MOMENTS = ["Une arrivée", "Un réveil", "Une attention", "Un dîner", "Un moment de déconnexion", "Une activité", "Un détail", "Une journée entière"];
const FORMATS = ["Reels", "UGC", "Vidéos immersives", "Photos & lifestyle", "Stories"];

const STEPS: Array<[string, string, string, string, string]> = [
  ["01", "Comprendre", "Votre lieu, vos clients, votre univers, vos objectifs et ce que vous souhaitez faire ressentir.", "/realisations/shooting-hotel-jardins-vue.jpg", "50% 40%"],
  ["02", "Révéler", "Les moments, détails, sensations et histoires qui rendent votre expérience particulière.", "/realisations/shooting-hotel-balcon-fleuri.jpg", "50% 45%"],
  ["03", "Vivre", "Je viens sur place et découvre l'expérience comme pourrait le faire votre futur client.", "/wall/ugc-hotel.jpg", "50% 50%"],
  ["04", "Raconter", "Je transforme cette matière en contenus pensés pour permettre à votre futur client de comprendre, ressentir et se projeter.", "/wall/yacht-reel.jpg", "50% 40%"],
];

const UNIVERS: Array<[string, string, string, string]> = [
  ["Hospitality", "Hôtels • Chalets • Hébergements • Insolite", "/realisations/shooting-hotel-chambre.jpg", "50% 45%"],
  ["Wellness", "Spas • Instituts • Expériences bien-être", "/realisations/beltra-therapy.jpg", "50% 30%"],
  ["Tourism", "Activités • Loisirs • Expériences touristiques", "/realisations/harmonie-yacht-shooting.jpg", "50% 35%"],
  ["Food & Lifestyle", "Restaurants • Bars • Lieux expérientiels", "/wall/unamas.jpg", "50% 40%"],
  ["Retreats", "Yoga • Wellness • Séjours thématiques", "/realisations/shooting-hotel-jardins.jpg", "50% 50%"],
  ["Intimate Experiences", "Pop-up • Événements intimistes • Expériences de marque", "/realisations/shooting-hotel-couple-terrasse.jpg", "50% 40%"],
];

const OFFRE: Array<[string, string]> = [
  ["Échange & analyse du besoin", "Comprendre où vous en êtes et ce que vous souhaitez réellement travailler."],
  ["Regard sur l'expérience client", "Identifier ce qui mérite d'être révélé."],
  ["Direction créative & storytelling", "Trouver les histoires, angles et intentions."],
  ["Immersion sur place", "Vivre et créer au cœur de l'expérience."],
  ["Création & post-production", "Selon les formats définis ensemble."],
  ["Content board", "Organiser les contenus créés et faciliter leur utilisation."],
];

const FAQ: Array<[string, string[]]> = [
  ["Qu'est-ce qu'une Content Experience ?", ["Une immersion dans votre univers pour comprendre ce que vous faites réellement vivre à vos clients, et le transformer en contenu dans lequel vos futurs clients peuvent se projeter.", "Avant de créer, nous travaillons sur votre expérience, les histoires à raconter et les contenus dont vous avez réellement besoin."]],
  ["Quels types de contenus pouvez-vous créer ?", ["Selon votre projet : Reels, vidéos immersives, vidéos où je vis l'expérience à la place de vos clients, photos & lifestyle, stories.", "Les formats sont définis ensemble selon votre expérience, vos objectifs et les histoires que nous souhaitons raconter."]],
  ["Est-ce uniquement destiné aux hôtels ?", ["Non.", "June travaille avec les lieux et expériences qui ont quelque chose à faire vivre et à raconter : hôtels, hébergements, wellness, restaurants, activités touristiques, retraites, séjours expérientiels ou encore événements intimistes."]],
  ["Combien coûte une Content Experience ?", ["Les projets débutent à partir de 490 € TTC.", "Le tarif dépend ensuite de l'expérience, de la durée de l'immersion, des contenus à créer, des éventuels déplacements et des besoins spécifiques du projet.", "Un devis personnalisé est réalisé avant chaque collaboration."]],
  ["Où vous déplacez-vous ?", ["June est basée entre Montpellier et l'Alpe d'Huez pour la saison hiver 2026/27, mais je peux me déplacer ailleurs en France selon les projets.", "Les éventuels frais de déplacement sont simplement définis en amont, dans le devis."]],
];

export default function Home() {
  const selected = works.filter((w) => w.home && !w.feature);
  return (
    <>
      <JuneV3Engine />
      <SiteNav />

      <main id="top">
        {/* 4. Hero */}
        <section className="hero" data-dark aria-label="June, Content Experience Studio">
          <Media video={VIDEO.hero} poster="/realisations/shooting-hotel-terrasse.jpg" alt="Terrasse d'un hôtel & spa au soleil couchant" pos="70% 45%" w={1080} h={1616} eager px={30} />
          <div className="hero__inner">
            <p className="k hero__k rise" style={{ "--d": "100ms" } as React.CSSProperties}>
              Content Experience Studio
            </p>
            <h1 className="d hero__title rise" style={{ "--d": "220ms" } as React.CSSProperties}>
              Des lieux qui font vivre une expérience. <em>Des contenus qui donnent envie de la vivre.</em>
            </h1>
            <p className="hero__lede rise" style={{ "--d": "360ms" } as React.CSSProperties}>
              J&apos;accompagne les établissements et expériences à révéler ce que leurs clients vivent réellement chez eux, pour le transformer en contenu dans lequel leurs futurs clients peuvent se projeter.
            </p>
            <p className="hero__fmt rise" style={{ "--d": "460ms" } as React.CSSProperties}>
              Hospitality • Tourism • Experiences
            </p>
            <a className="btn btn--light rise" style={{ "--d": "560ms" } as React.CSSProperties} href="#approche">
              Découvrir ma Content Experience
            </a>
          </div>
          <p className="hero__place rise" style={{ "--d": "700ms" } as React.CSSProperties}>
            Montpellier • France • Alpe d&apos;Huez — Hiver 26/27
          </p>
        </section>

        {/* 5. Manifeste */}
        <section className="manif light" aria-label="Manifeste">
          <div className="manif__media">
            <Media poster="/realisations/shooting-hotel-moment-a-deux.jpg" alt="Un moment à deux sur un balcon d'hôtel" pos="50% 40%" w={1080} h={1616} px={22} />
          </div>
          <div className="manif__copy">
            <p className="num rv">01</p>
            <h2 className="d h2 rv" style={rv(80)}>
              Je ne crée pas du contenu
              <br />
              pour remplir vos réseaux.
            </h2>
            <p className="lede rv" style={rv(160)}>
              Je transforme l&apos;expérience que vos clients vont vivre chez vous en contenu pour qu&apos;ils puissent déjà se projeter, l&apos;imaginer et avoir envie de la vivre.
            </p>
          </div>
        </section>

        {/* 6. Expertise / approche */}
        <section className="approche light" id="approche" aria-label="Content Experience, l'approche">
          <div className="wrap approche__grid">
            <div className="approche__copy">
              <p className="k rv">02 — Content Experience</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Avant de savoir quoi filmer,
                <br />
                je cherche à comprendre ce que vous faites vivre.
              </h2>
              <div className="ed rv" style={rv(160)}>
                <p>Un client ne réserve pas seulement une chambre, un soin, une table ou une activité.</p>
                <p>Il réserve aussi un moment, une ambiance, une sensation, une façon de vivre l&apos;expérience.</p>
                <p>Quand je découvre votre établissement, je me mets à la place de votre futur client : qu&apos;est-ce qu&apos;il va vivre ? Qu&apos;est-ce qui va le marquer ? Qu&apos;est-ce qu&apos;il doit voir ou ressentir pour réussir à se projeter ?</p>
                <p>Ensuite seulement, je réfléchis aux histoires, aux angles et aux contenus qui permettront de le raconter.</p>
              </div>
              <p className="pull d rv" style={rv(240)}>
                L&apos;expérience existe déjà.
                <br />
                <em>Mon travail est de révéler ce qu&apos;il y a à raconter.</em>
              </p>
            </div>
            <figure className="approche__media plate plate--photo rv" data-dev style={rv(120)}>
              <Media video={VIDEO.approche} poster="/wall/ugc-hotel.jpg" alt="Ludivine en immersion dans une chambre d'hôtel" pos="50% 50%" w={393} h={622} px={16} />
            </figure>
          </div>
        </section>

        {/* 7. Avant la Content Experience */}
        <section className="avant sand" aria-label="Avant la Content Experience">
          <div className="wrap avant__grid">
            <div>
              <p className="k rv">Avant la Content Experience</p>
              <h2 className="d h2 rv" style={rv(80)}>
                On commence simplement
                <br />
                par parler de votre projet.
              </h2>
            </div>
            <div className="avant__copy">
              <div className="ed rv">
                <p>Vous me racontez votre établissement, votre expérience, ce que vous faites aujourd&apos;hui et surtout ce que vous aimeriez réussir à mieux montrer ou faire ressentir.</p>
                <p>De mon côté, je prends un premier regard extérieur sur votre communication et votre expérience.</p>
                <p>On échange sur vos objectifs, vos besoins et ce qui pourrait être intéressant à raconter, mais aussi sur ce qui est réellement pertinent pour vous.</p>
              </div>
              <p className="pull d rv" style={rv(120)}>
                Mon objectif n&apos;est pas de vous vendre du contenu à tout prix.
                <br />
                <em>C&apos;est de voir si mon approche peut réellement répondre à votre besoin.</em>
              </p>
              <a className="btn rv" style={rv(200)} href="#contact">
                Parler de mon projet
              </a>
            </div>
          </div>
        </section>

        {/* 8. Méthode */}
        <section className="methode light" id="methode" aria-label="La méthode Content Experience">
          <div className="wrap">
            <div className="sec__head">
              <p className="k rv">03 — The Content Experience</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Une méthode pensée
                <br />
                autour de votre expérience.
              </h2>
            </div>
            <ol className="steps">
              {STEPS.map(([n, t, p, img, pos], i) => (
                <li className="step rv" style={rv(i * 120)} key={n}>
                  <figure className="plate plate--photo" data-dev>
                    <img src={img} alt={`${t} : ${p}`} width={1080} height={1350} loading="lazy" style={posOf(pos)} />
                  </figure>
                  <p className="step__n">{n}</p>
                  <h3>{t}</h3>
                  <p>{p}</p>
                </li>
              ))}
            </ol>
            <p className="flow rv" aria-label="Comprendre, révéler, vivre, raconter">
              {STEPS.map(([, t], i) => (
                <span key={t}>
                  {i > 0 && <i aria-hidden="true">→</i>}
                  {t}
                </span>
              ))}
            </p>
          </div>
        </section>

        {/* 9. Une expérience, plusieurs histoires */}
        <section className="histoires sand" aria-label="Une expérience, plusieurs histoires">
          <div className="wrap">
            <div className="sec__head">
              <p className="k rv">One experience. Different stories.</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Une expérience ne se raconte
                <br />
                jamais d&apos;une seule façon.
              </h2>
            </div>
            <div className="histoires__grid">
              <ul className="moments rv" style={rv(120)}>
                {MOMENTS.map((m) => (
                  <li className="d" key={m}>
                    {m}
                  </li>
                ))}
              </ul>
              <div className="histoires__side">
                <div className="histoires__pics rv" style={rv(160)}>
                  <figure className="plate" data-dev>
                    <img src="/realisations/shooting-hotel-balcon.jpg" alt="Un réveil sur un balcon d'hôtel" width={1080} height={1616} loading="lazy" style={posOf("50% 40%")} />
                  </figure>
                  <figure className="plate" data-dev>
                    <img src="/wall/unamas.jpg" alt="Un dîner entre amis" width={392} height={629} loading="lazy" style={posOf("50% 40%")} />
                  </figure>
                  <figure className="plate" data-dev>
                    <img src="/wall/ugc-bateau.jpg" alt="Une activité en mer" width={386} height={615} loading="lazy" style={posOf("50% 40%")} />
                  </figure>
                </div>
                <p className="lede rv" style={rv(200)}>C&apos;est à partir de ces moments que je construis vos contenus.</p>
                <ul className="formats rv" style={rv(240)} aria-label="Formats">
                  {FORMATS.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="pull d rv" style={rv(280)}>
                  Je ne pars pas d&apos;un nombre de Reels à produire.
                  <br />
                  <em>Je pars de ce qu&apos;il y a à raconter.</em>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 10. Pour qui */}
        <section className="pourqui light" id="pour-qui" aria-label="Pour qui">
          <div className="wrap">
            <div className="sec__head">
              <p className="k rv">Hospitality • Tourism • Experiences</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Pour les lieux que l&apos;on choisit
                <br />
                autant pour ce qu&apos;ils proposent
                <br />
                que pour ce qu&apos;on va y vivre.
              </h2>
            </div>
            <ul className="tiles">
              {UNIVERS.map(([t, sub, img, pos], i) => (
                <li className="tile rv" style={rv((i % 3) * 90)} key={t}>
                  <figure className="plate plate--photo" data-dev>
                    <img src={img} alt={`${t} : ${sub}`} width={1080} height={1350} loading="lazy" style={posOf(pos)} />
                  </figure>
                  <h3>{t}</h3>
                  <p>{sub}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 11. Selected work */}
        <section className="work light" id="experiences" aria-label="Selected work">
          <div className="wrap sec__head sec__head--row">
            <div>
              <p className="k rv">Selected work</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Des expériences
                <br />
                racontées par June.
              </h2>
            </div>
            <a className="btn rv" style={rv(160)} href="/portfolio">
              Voir toutes les réalisations
            </a>
          </div>
          <div className="rail" aria-label="Sélection de réalisations">
            {selected.map((wk, i) => {
              const inner = (
                <>
                  <figure className="plate" data-dev>
                    <img src={wk.image} alt={`${wk.nom} : ${wk.univers}, ${wk.type}`} width={wk.w} height={wk.h} loading="lazy" style={posOf(wk.pos)} />
                    {wk.video && (
                      <video data-auto="hover" muted loop playsInline preload="none" poster={wk.image} aria-hidden="true" style={posOf(wk.pos)}>
                        <source src={wk.video} type="video/mp4" />
                      </video>
                    )}
                    {wk.video && <span className="plate__play" aria-hidden="true" />}
                  </figure>
                  <span className="rail__cap">
                    <b>{wk.nom}</b>
                    <span>
                      {wk.univers} • {wk.type}
                    </span>
                  </span>
                </>
              );
              return wk.href ? (
                <a className="rail__it rv" style={rv((i % 4) * 80)} href={wk.href} target="_blank" rel="noopener noreferrer" key={wk.nom} data-hover-host>
                  {inner}
                </a>
              ) : (
                <div className="rail__it rv" style={rv((i % 4) * 80)} key={wk.nom} data-hover-host>
                  {inner}
                </div>
              );
            })}
          </div>
        </section>

        {/* 12. Offre */}
        <section className="offre night" id="offre" data-dark aria-label="Work with June">
          <div className="wrap offre__grid">
            <div className="offre__side">
              <p className="k rv">Work with June</p>
              <h2 className="d offre__title rv" style={rv(80)}>
                Content{" "}
                <span className="nowrap">
                  Experience <span className="star">✦</span>
                </span>
              </h2>
              <p className="lede rv" style={rv(160)}>Une Content Experience est construite autour de votre expérience, de vos objectifs et de ce que nous souhaitons raconter.</p>
              <p className="offre__price rv" style={rv(240)}>
                À partir de 490 <span className="eur">€ TTC</span>
              </p>
              <p className="muted rv" style={rv(300)}>Chaque projet étant différent, la Content Experience est adaptée à vos besoins après notre premier échange.</p>
              <a className="btn btn--fill rv" style={rv(360)} href="#contact">
                Discuter de mon projet
              </a>
            </div>
            <ul className="offre__list rv" style={rv(160)}>
              {OFFRE.map(([t, p]) => (
                <li key={t}>
                  <b>{t}</b>
                  <p>{p}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 13. About */}
        <section className="about light" id="apropos" aria-label="Behind June">
          <div className="wrap about__grid">
            <figure className="about__media plate plate--photo rv" data-dev>
              <img src="/portrait.jpg" alt="Ludivine, fondatrice de June" width={1122} height={1402} loading="lazy" style={posOf("50% 30%")} />
            </figure>
            <div className="about__copy">
              <p className="k rv">Behind June</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Moi, c&apos;est Ludivine.
              </h2>
              <div className="ed rv" style={rv(160)}>
                <p className="big">Créatrice de contenu, entrepreneuse et saisonnière.</p>
                <p>J&apos;ai toujours eu ce réflexe lorsque je découvre un endroit : observer ce que l&apos;on y vit.</p>
                <p>L&apos;ambiance. Les petits détails. Les moments auxquels on ne pense pas forcément. Ce qui fait qu&apos;une expérience nous reste en tête.</p>
                <p>C&apos;est ce regard que j&apos;ai transformé avec June.</p>
                <p>Aujourd&apos;hui, j&apos;accompagne les établissements à prendre du recul sur leur propre expérience, à comprendre ce qui mérite d&apos;être montré et raconté, puis à le transformer en contenu.</p>
                <p>Je peux être derrière la caméra, devant lorsqu&apos;il faut incarner l&apos;expérience, mais mon rôle commence toujours avant :</p>
                <p className="turn">comprendre ce que l&apos;on veut réellement faire vivre à travers le contenu.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 14. Alpe d'Huez */}
        <section className="alpe" id="alpe" data-dark aria-label="Alpe d'Huez, hiver 26/27">
          <Media video={VIDEO.alpe} poster="/realisations/shooting-hotel-jardins-vue.jpg" alt="En attendant les images de l'Alpe d'Huez" pos="50% 35%" w={1080} h={1616} px={26} />
          <div className="wrap alpe__inner">
            <p className="k rv">Winter 26/27</p>
            <h2 className="d h2 rv" style={rv(80)}>
              Cet hiver,
              <br />
              June prend de l&apos;altitude.
            </h2>
            <div className="ed rv" style={rv(160)}>
              <p>Je pose mes valises à l&apos;Alpe d&apos;Huez pour la saison hiver 2026/27.</p>
              <p>Étant moi-même saisonnière, je connais cet univers, son rythme et ses temps forts.</p>
              <p>Pendant toute la saison, je serai disponible directement sur place pour accompagner hôtels, chalets, restaurants, spas, activités et expériences qui souhaitent révéler autrement ce qu&apos;ils font vivre à leurs clients.</p>
            </div>
            <a className="btn btn--light rv" style={rv(240)} href="#contact" data-offre="Alpe d'Huez">
              Créer ensemble à l&apos;Alpe d&apos;Huez
            </a>
          </div>
        </section>

        {/* 15. FAQ */}
        <section className="faq light" id="faq" aria-label="Questions fréquentes">
          <div className="wrap faq__grid">
            <div className="faq__head">
              <p className="k rv">FAQ</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Les questions que l&apos;on me pose.
              </h2>
            </div>
            <div className="rv" style={rv(120)}>
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </summary>
                  {a.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 16. CTA final */}
        <section className="fin" data-dark aria-label="Parlons de votre expérience">
          <Media poster="/realisations/shooting-hotel-piscine-ext.jpg" alt="Piscine extérieure d'un hôtel & spa" pos="50% 55%" w={1080} h={1616} px={30} />
          <div className="wrap fin__inner">
            <h2 className="d h2 rv">
              Vous avez une expérience à faire vivre ?
              <br />
              <em>Voyons comment la raconter.</em>
            </h2>
            <div className="ed rv" style={rv(120)}>
              <p>Racontez-moi votre établissement, votre projet, ce que vous faites vivre aujourd&apos;hui et ce que vous aimeriez réussir à mieux montrer.</p>
              <p>Je prendrai le temps de regarder votre univers avant notre échange pour voir comment — et si — June peut vous accompagner.</p>
            </div>
            <a className="btn btn--light rv" style={rv(200)} href="#contact">
              Me parler de mon projet
            </a>
          </div>
        </section>

        {/* Contact */}
        <section className="contact sand" id="contact" aria-label="Contact">
          <div className="wrap contact__grid">
            <div className="contact__head">
              <p className="k rv">Contact</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Racontez-moi votre projet.
              </h2>
              <p className="muted rv" style={rv(160)}>Je vous réponds personnellement, en général sous 48 h.</p>
            </div>
            <div className="contact__form rv" style={rv(120)}>
              <JuneContact />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

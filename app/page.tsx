import type React from "react";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import JuneContact from "@/components/june/JuneContact";
type Step = { n: string; title: string; text: string[]; image: string; pos?: string; alt: string };
import SiteNav from "@/components/june/SiteNav";
import SiteFooter from "@/components/june/SiteFooter";
import { VIDEO } from "@/lib/site";
import { works } from "@/lib/work";

/*
   Accueil June Content Studio, refonte du 2026-09-21 : sept grands blocs,
   une idée par écran, les réalisations tôt, un seul chemin vers le contact.
   Hero sombre, puis ivoire ; brun très foncé pour l'offre et le pied de page.
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

const STEPS: Step[] = [
  {
    n: "01",
    title: "Comprendre",
    text: ["Votre expérience, vos clients, vos objectifs et ce que vous souhaitez leur faire ressentir.", "L'objectif est aussi d'identifier ce qui fonctionne déjà, ce qui manque et ce que votre communication ne raconte pas encore suffisamment."],
    image: "/realisations/shooting-hotel-jardins-vue.jpg",
    pos: "50% 40%",
    alt: "Vue sur les jardins d'un hôtel",
  },
  {
    n: "02",
    title: "Révéler & raconter",
    text: ["Identifier les moments, détails, émotions, histoires et angles qui permettront à votre futur client de comprendre ce qui rend votre expérience particulière.", "À cette étape, June apporte ses recommandations et construit la direction créative."],
    image: "/realisations/shooting-hotel-balcon-fleuri.jpg",
    pos: "50% 45%",
    alt: "Un balcon fleuri au petit matin",
  },
  {
    n: "03",
    title: "Vivre & créer",
    text: ["Lorsque la création de contenu est pertinente, je viens vivre l'expérience sur place comme pourrait le faire votre client.", "Je capture et/ou incarne les moments nécessaires pour donner vie aux histoires identifiées ensemble."],
    image: "/wall/ugc-hotel.jpg",
    pos: "50% 50%",
    alt: "Ludivine vit l'expérience d'une chambre d'hôtel",
  },
  {
    n: "04",
    title: "Vous donner la matière",
    text: ["Vous repartez avec les contenus, formats et recommandations nécessaires pour raconter votre expérience sous différents angles.", "Reels, UGC, vidéos, photos ou autres formats sont choisis en fonction de ce qu'il y a réellement à raconter."],
    image: "/wall/yacht-reel.jpg",
    pos: "50% 40%",
    alt: "Une vidéo publiée pour Harmonie Yacht",
  },
];

const CATEGORY: Record<string, string> = { Tourisme: "Tourism", Hébergement: "Hospitality", "Bien-être": "Wellness", "Restaurant & bar": "Food & Lifestyle" };

const INCLUS: Array<[string, string]> = [
  ["Regard extérieur", "Analyse de votre expérience et de votre communication."],
  ["Recommandations", "Ce qui manque, ce qui mérite d'être raconté et les opportunités de contenu."],
  ["Direction créative", "Histoires, angles, moments et formats à privilégier."],
  ["Création", "Immersion et production de la matière nécessaire lorsque le projet le demande."],
];

const FAQ: Array<[string, string[]]> = [
  ["Qu'est-ce qu'une Content Experience ?", ["Un accompagnement qui commence par votre expérience : ce que vos clients vivent réellement chez vous et ce que votre communication ne montre pas encore.", "J'apporte d'abord un regard extérieur et des recommandations, puis je construis la manière de la raconter et je crée la matière nécessaire."]],
  ["Est-ce que je dois déjà savoir quels contenus je veux ?", ["Non. C'est justement le point de départ de mon travail.", "On commence par votre expérience et votre communication actuelle. Les formats viennent ensuite, en fonction de ce qu'il y a réellement à raconter."]],
  ["Quels types d'établissements accompagnez-vous ?", ["Les lieux et expériences qui ont quelque chose à faire vivre : hôtels, chalets, hébergements, spas, restaurants, activités touristiques, retraites, séjours ou événements intimistes."]],
  ["Combien coûte une Content Experience ?", ["Les projets débutent à partir de 490 € TTC.", "Le tarif dépend ensuite de l'expérience, de l'immersion, des contenus à créer et des éventuels déplacements. Un devis est réalisé avant chaque collaboration."]],
  ["Où vous déplacez-vous ?", ["June est basée entre Montpellier et l'Alpe d'Huez pour la saison hiver 2026/27, et je me déplace ailleurs en France selon les projets.", "Les éventuels frais de déplacement sont définis en amont, dans le devis."]],
];

export default function Home() {
  const selected = works.filter((w) => w.home);
  return (
    <>
      <JuneV3Engine />
      <SiteNav />

      <main id="top">
        {/* 1. Hero */}
        <section className="hero" data-dark aria-label="June, Content Experience Studio">
          <Media video={VIDEO.hero} poster="/hero.jpg" alt="Ludivine photographie un petit-déjeuner dans une chambre avec vue sur les montagnes" pos="72% 50%" w={1672} h={941} eager px={30} />
          <div className="hero__inner">
            <p className="k hero__k rise" style={{ "--d": "100ms" } as React.CSSProperties}>
              Content Experience Studio
            </p>
            <h1 className="d hero__title rise" style={{ "--d": "220ms" } as React.CSSProperties}>
              Des lieux qui font vivre une expérience. <em>Des contenus qui donnent envie de la vivre.</em>
            </h1>
            <p className="hero__lede rise" style={{ "--d": "360ms" } as React.CSSProperties}>
              J&apos;accompagne les établissements à révéler leur expérience pour que leurs futurs clients puissent la comprendre, la ressentir et s&apos;y projeter avant même de venir.
            </p>
            <a className="btn btn--light rise" style={{ "--d": "480ms" } as React.CSSProperties} href="#approche">
              Découvrir la Content Experience
            </a>
          </div>
          <div className="hero__foot rise" style={{ "--d": "700ms" } as React.CSSProperties}>
            <span>Hospitality • Tourism • Experiences</span>
            <span>Montpellier • France • Alpe d&apos;Huez — Hiver 26/27</span>
          </div>
        </section>

        {/* 2. Le problème */}
        <section className="probleme light" aria-label="Le point de départ">
          <div className="wrap probleme__grid">
            <div className="probleme__copy">
              <p className="k rv">01 — Le point de départ</p>
              <h2 className="d h2 h2--xl rv" style={rv(80)}>
                Votre expérience est peut-être plus forte dans la vraie vie <em>que dans votre communication.</em>
              </h2>
              <div className="ed rv" style={rv(160)}>
                <p className="lines">
                  Votre lieu peut être magnifique.
                  <br />
                  Votre accueil peut être incroyable.
                  <br />
                  Vos clients peuvent repartir enchantés.
                </p>
                <p>Mais si tout cela ne se ressent pas dans votre contenu, votre futur client ne peut pas encore comprendre ce qui rend réellement votre expérience différente.</p>
              </div>
              <p className="d strong rv" style={rv(240)}>
                C&apos;est là que June intervient.
              </p>
            </div>
            <figure className="probleme__media rv" style={rv(120)}>
              <Media poster="/realisations/shooting-hotel-moment-a-deux.jpg" alt="Un moment à deux sur un balcon d'hôtel" pos="50% 40%" w={1080} h={1616} px={20} />
            </figure>
          </div>
        </section>

        {/* 3. Mon approche : le regard, puis comment ça se passe */}
        <section className="approche light" id="approche" aria-label="Mon approche">
          <div className="wrap approche__head">
            <div>
              <p className="k rv">02 — Mon approche</p>
              <h2 className="d h2 rv" style={rv(80)}>
                Je ne viens pas simplement
                <br />
                filmer votre établissement.
              </h2>
            </div>
            <div className="ed rv" style={rv(160)}>
              <p>Je découvre votre expérience comme pourrait le faire votre futur client : ce qu&apos;il voit, ce qu&apos;il ressent, les moments qu&apos;il vit et les détails dont il se souviendra.</p>
              <p>Je cherche ce qui va lui permettre de se projeter, de s&apos;imaginer ici et d&apos;avoir envie de vivre l&apos;expérience à son tour.</p>
              <p>Puis je transforme tout cela en histoires et en contenus.</p>
            </div>
          </div>

          <div className="wrap regard">
            <figure className="regard__media rv" data-px="16">
              <Media video={VIDEO.approche} poster="/wall/ugc-hotel.jpg" alt="Ludivine en immersion dans une chambre d'hôtel" pos="50% 50%" w={393} h={622} />
            </figure>
            <div className="regard__copy">
              <p className="k rv">Mon regard extérieur</p>
              <p className="regard__lead d rv" style={rv(80)}>
                Avant de créer quoi que ce soit, <em>je regarde ce qui existe déjà.</em>
              </p>
              <ul className="regard__list rv" style={rv(160)}>
                <li>Ce que votre communication raconte.</li>
                <li>Ce qu&apos;elle ne raconte pas encore.</li>
                <li>Ce que vos clients vivent réellement.</li>
                <li>Ce qui pourrait permettre à quelqu&apos;un qui ne vous connaît pas encore de comprendre pourquoi venir chez vous.</li>
              </ul>
              <p className="regard__after rv" style={rv(240)}>Je vous conseille ensuite sur ce qui mérite d&apos;être montré, raconté ou créé.</p>
            </div>
          </div>

          <div className="wrap methode" id="methode">
            <div className="methode__head">
              <p className="k rv">Comment ça se passe</p>
              <h3 className="d h2 rv" style={rv(80)}>
                Votre expérience est le point de départ. <em>Le contenu vient ensuite.</em>
              </h3>
            </div>
            <ol className="steps">
              {STEPS.map((st, i) => (
                <li className="step rv" style={rv(i * 100)} key={st.n}>
                  <p className="step__n">{st.n}</p>
                  <h4 className="d">{st.title}</h4>
                  {st.text.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </li>
              ))}
            </ol>
            <p className="flow rv" aria-label="Comprendre, révéler, vivre, raconter">
              {["Comprendre", "Révéler", "Vivre", "Raconter"].map((t, i) => (
                <span key={t}>
                  {i > 0 && <i aria-hidden="true">→</i>}
                  {t}
                </span>
              ))}
            </p>
          </div>

          <div className="wrap">
            <p className="d signature rv">
              Vous faites vivre l&apos;expérience.
              <br />
              <em>June trouve comment la raconter.</em>
            </p>
          </div>
        </section>

        {/* 4. Mon travail */}
        <section className="work sand" id="travail" aria-label="Mon travail">
          <div className="wrap">
            <div className="sec__head sec__head--row">
              <div>
                <p className="k rv">03 — Mon travail</p>
                <h2 className="d h2 rv" style={rv(80)}>
                  Des expériences
                  <br />
                  racontées par June.
                </h2>
              </div>
              <p className="work__sub rv" style={rv(160)}>Parce que le meilleur moyen de comprendre mon travail reste encore de le voir.</p>
            </div>
            <div className="grid">
              {selected.map((wk, i) => {
                const cat = `${CATEGORY[wk.univers] ?? wk.univers} • ${wk.type}`;
                const inner = (
                  <>
                    <figure className="plate" data-dev>
                      <img src={wk.image} alt={`${wk.nom} : ${cat}`} width={wk.w} height={wk.h} loading="lazy" style={posOf(wk.pos)} />
                      {wk.video && (
                        <video data-auto="hover" muted loop playsInline preload="none" poster={wk.image} aria-hidden="true" style={posOf(wk.pos)}>
                          <source src={wk.video} type="video/mp4" />
                        </video>
                      )}
                      {wk.vues && (
                        <span className="plate__vues">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          {wk.vues} vues
                        </span>
                      )}
                      {wk.video && <span className="plate__play" aria-hidden="true" />}
                    </figure>
                    <span className="grid__cap">
                      <b>{wk.nom}</b>
                      <span>{cat}</span>
                    </span>
                  </>
                );
                return wk.href ? (
                  <a className="grid__it rv" style={rv((i % 5) * 70)} href={wk.href} target="_blank" rel="noopener noreferrer" key={wk.nom} data-hover-host>
                    {inner}
                  </a>
                ) : (
                  <div className="grid__it rv" style={rv((i % 5) * 70)} key={wk.nom} data-hover-host>
                    {inner}
                  </div>
                );
              })}
            </div>
            <div className="work__more rv">
              <a className="btn" href="/portfolio">
                Voir toutes les expériences
              </a>
            </div>
          </div>
        </section>

        {/* 5. L'accompagnement */}
        <section className="offre night" id="offre" data-dark aria-label="Work with June">
          <div className="wrap offre__grid">
            <div className="offre__side">
              <p className="k rv">04 — Work with June</p>
              <h2 className="d offre__title rv" style={rv(80)}>
                Content{" "}
                <span className="nowrap">
                  Experience <span className="star">✦</span>
                </span>
              </h2>
              <div className="ed offre__text rv" style={rv(160)}>
                <p>Vous n&apos;avez pas besoin de savoir exactement combien de Reels, de vidéos ou de photos il vous faut avant de me contacter.</p>
                <p>On commence par votre expérience, votre communication actuelle et ce que vous souhaitez améliorer.</p>
                <p>J&apos;apporte ensuite mon regard extérieur pour identifier ce qui mérite d&apos;être révélé, les histoires que l&apos;on peut raconter et la matière dont vous avez réellement besoin.</p>
                <p>Puis, si nous sommes la bonne personne l&apos;une pour l&apos;autre, je construis votre Content Experience.</p>
              </div>
            </div>
            <div className="offre__right">
              <ul className="offre__list rv" style={rv(120)}>
                {INCLUS.map(([t, p]) => (
                  <li key={t}>
                    <b>{t}</b>
                    <p>{p}</p>
                  </li>
                ))}
              </ul>
              <p className="offre__price rv" style={rv(200)}>
                À partir de 490 <span className="eur">€ TTC</span>
              </p>
              <p className="muted rv" style={rv(240)}>Chaque Content Experience est construite selon votre établissement, vos objectifs et vos besoins.</p>
              <div className="offre__ctas rv" style={rv(300)}>
                <a className="btn btn--fill" href="#contact">
                  Parler de mon expérience
                </a>
                <a className="link-arrow" href="/content-experience">
                  Découvrir l&apos;offre
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Ludivine */}
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
                <p>Créatrice de contenu, entrepreneuse et saisonnière, j&apos;ai créé June autour d&apos;un regard que j&apos;ai naturellement lorsque je découvre un lieu : observer ce que l&apos;on y vit vraiment.</p>
                <p className="lines d about__lines">
                  L&apos;ambiance.
                  <br />
                  Les détails.
                  <br />
                  Les moments auxquels on ne pense pas forcément.
                  <br />
                  Ce qui fait qu&apos;une expérience reste en tête.
                </p>
                <p>Aujourd&apos;hui, j&apos;utilise ce regard pour aider les établissements à prendre du recul sur leur propre expérience et leur communication.</p>
                <p>Je peux conseiller, imaginer la manière de la raconter, être derrière la caméra ou devant lorsqu&apos;il faut l&apos;incarner.</p>
                <p>Mais mon rôle commence toujours au même endroit :</p>
                <p className="turn">comprendre ce que votre client doit ressentir avant même d&apos;être venu.</p>
              </div>
              <p className="about__place rv" style={rv(240)}>
                Montpellier • France
                <br />
                Alpe d&apos;Huez • Hiver 26/27
              </p>
            </div>
          </div>
        </section>

        {/* Bandeau saisonnier */}
        <section className="alpe" id="alpe" data-dark aria-label="Alpe d'Huez, hiver 26/27">
          <Media video={VIDEO.alpe} poster="/realisations/shooting-hotel-jardins-vue.jpg" alt="En attendant les images de l'Alpe d'Huez" pos="50% 35%" w={1080} h={1616} px={24} />
          <div className="wrap alpe__inner">
            <div className="alpe__copy">
              <p className="k rv">Winter 26/27</p>
              <h2 className="d h2 rv" style={rv(80)}>
                June sera à l&apos;Alpe d&apos;Huez
                <br />
                tout l&apos;hiver.
              </h2>
              <p className="alpe__list rv" style={rv(160)}>
                Disponible sur place pour : <span>hôtels • chalets • restaurants • spas • activités • expériences</span>
              </p>
            </div>
            <a className="btn btn--light rv" style={rv(240)} href="#contact" data-offre="Alpe d'Huez">
              Créer ensemble à l&apos;Alpe d&apos;Huez
            </a>
          </div>
        </section>

        {/* FAQ */}
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

        {/* CTA final + formulaire */}
        <section className="fin" id="contact" data-dark aria-label="Parlons de votre expérience">
          <Media poster="/realisations/shooting-hotel-piscine-ext.jpg" alt="Piscine extérieure d'un hôtel & spa" pos="50% 55%" w={1080} h={1616} px={30} />
          <div className="wrap fin__grid">
            <div className="fin__copy">
              <h2 className="d h2 rv">
                Votre expérience mérite
                <br />
                <em>peut-être d&apos;être mieux racontée.</em>
              </h2>
              <div className="ed rv" style={rv(120)}>
                <p>Parlez-moi de votre établissement, de ce que vos clients vivent chez vous et de ce que vous aimeriez réussir à mieux faire ressentir.</p>
                <p>Avant de parler de contenus, je regarderai d&apos;abord votre univers et votre besoin pour voir comment — et si — June peut vous accompagner.</p>
              </div>
              <a className="btn btn--light fin__btn rv" style={rv(200)} href="#formulaire">
                Parler de mon projet
              </a>
            </div>
            <div className="fin__form rv" id="formulaire" style={rv(160)}>
              <JuneContact />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

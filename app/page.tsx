import type React from "react";
import JuneV2Engine from "@/components/june/JuneV2Engine";
import { APPEL_EXTERNE, APPEL_URL, CONTACT_EMAIL, CTA, INSTAGRAM_URL } from "@/lib/site";

/* Accueil V2 « Content Experience ». Une page, dans l'ordre du brief :
   le mur de preuves, le problème dans ses mots, l'immersion, ce que vous
   recevez, le prix, Ludivine, contact. Copy : docs/copy-june-content-experience.md */

const appel = APPEL_EXTERNE ? { target: "_blank", rel: "noopener noreferrer" } : {};
const col = (i: number, off: string, sp: number) =>
  ({ "--i": i, "--off": off, "--sp": sp }) as React.CSSProperties;

function Plate({
  src,
  alt,
  lieu,
  loc,
  meta,
  count,
  photo,
  pos,
  w,
  h,
  eager,
}: {
  src: string;
  alt: string;
  lieu: string;
  loc?: string;
  meta: string;
  count?: string;
  photo?: boolean;
  pos?: string;
  w: number;
  h: number;
  eager?: boolean;
}) {
  return (
    <figure className={photo ? "plate plate--photo" : "plate"} data-dev>
      <img
        src={src}
        alt={alt}
        width={w}
        height={h}
        loading={eager ? "eager" : "lazy"}
        style={pos ? ({ "--pos": pos } as React.CSSProperties) : undefined}
      />
      <figcaption className="etq">
        <b>
          {lieu}
          {loc && <small className="loc"> · {loc}</small>}
        </b>
        <span>
          {count ? (
            <>
              <svg className="eye" aria-hidden="true">
                <use href="#i-eye" />
              </svg>
              <i data-count>{count} vues</i>
              <i className="fmt-l"> · {meta}</i>
            </>
          ) : (
            <>
              {meta !== "Photo" && (
                <svg className="eye" aria-hidden="true">
                  <use href="#i-play" />
                </svg>
              )}
              {meta}
            </>
          )}
        </span>
      </figcaption>
    </figure>
  );
}

export default function Home() {
  return (
    <>
      <JuneV2Engine />

      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <symbol id="i-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
        </symbol>
        <symbol id="i-play" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </symbol>
        <symbol id="i-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v16M6 14l6 6 6-6" />
        </symbol>
      </svg>

      <header className="nav" id="nav">
        <a className="mark" href="#top" aria-label="June, retour en haut">
          June
        </a>
        <a className="btn" href={APPEL_URL} {...appel}>
          <span className="l">{CTA} →</span>
          <span className="s">Un appel →</span>
        </a>
      </header>

      <main id="top">
        {/* 1 — Le mur : la preuve avant la promesse */}
        <section className="wall" aria-label="Contenus publiés">
          <div className="wall__cols" id="wall">
            <div className="col" style={col(0, "14vh", 0.16)}>
              <Plate src="/realisations/shooting-hotel-terrasse.jpg" alt="Photo : terrasse d'un hôtel & spa au soleil couchant" lieu="Hôtel & spa" meta="Photo" photo w={1080} h={1616} eager />
              <Plate src="/realisations/shooting-hotel-couple-terrasse.jpg" alt="Photo : un couple en terrasse d'hôtel" lieu="Hôtel & spa" meta="Photo" photo w={1080} h={1616} />
            </div>
            <div className="col" style={col(1, "0vh", 0.32)}>
              <Plate src="/realisations/shooting-hotel-piscine.jpg" alt="Photo : piscine intérieure d'un hôtel & spa" lieu="Hôtel & spa" meta="Photo" photo pos="50% 60%" w={1200} h={1464} eager />
              <Plate src="/realisations/shooting-hotel-chambre.jpg" alt="Photo : chambre d'hôtel baignée de lumière" lieu="Hôtel & spa" meta="Photo" photo w={1200} h={1600} />
            </div>
            <div className="col" style={col(2, "10vh", 0.08)}>
              <Plate src="/realisations/shooting-hotel-balcon-fleuri.jpg" alt="Photo : balcon fleuri d'un hôtel & spa" lieu="Hôtel & spa" meta="Photo" photo w={1080} h={1616} eager />
              <Plate src="/wall/ugc-bateau.jpg" alt="Vidéo UGC : sortie en mer, chapeau de paille et bateau au large" lieu="Sortie en mer" meta="Vidéo UGC" w={386} h={615} />
            </div>
            <div className="col col--m" style={col(3, "2vh", 0.28)}>
              <Plate src="/wall/gite.jpg" alt="Réel publié : petit-déjeuner sous la treille du Gîte de l'Abric, Cévennes" lieu="Gîte de l'Abric" loc="Cévennes" meta="Réel" count="4 403" pos="50% 30%" w={393} h={633} eager />
              <Plate src="/realisations/shooting-hotel-jardins-vue.jpg" alt="Photo : jardins d'un hôtel & spa avec vue" lieu="Hôtel & spa" meta="Photo" photo w={1080} h={1616} />
            </div>
            <div className="col col--m" style={col(4, "16vh", 0.2)}>
              <Plate src="/wall/ugc-hotel.jpg" alt="Vidéo UGC : réveil en peignoir dans une chambre d'hôtel" lieu="Expérience hôtel" meta="Vidéo UGC" w={393} h={622} eager />
              <Plate src="/wall/unamas.jpg" alt="Réel publié : cocktails trinqués en terrasse chez Una Mas, Carnon" lieu="Una Mas" loc="Carnon" meta="Réel" count="3 865" w={392} h={629} />
            </div>
            <div className="col col--m" style={col(5, "8vh", 0.24)}>
              <Plate src="/wall/yacht-reel.jpg" alt="Réel publié : déjeuner à bord face à la mer avec Harmonie Yacht" lieu="Harmonie Yacht" meta="Réel" count="20,3 K" w={389} h={614} eager />
              <Plate src="/realisations/shooting-hotel-moment-a-deux.jpg" alt="Photo : un moment à deux dans un hôtel & spa" lieu="Hôtel & spa" meta="Photo" photo w={1080} h={1616} />
            </div>
          </div>

          <div className="wall__head">
            <h1 className="d h1">
              Faire ressentir l&apos;expérience <em>avant même de l&apos;avoir vécue.</em>
            </h1>
            <p className="lede">
              Je viens vivre chez vous ce que vos clients vivent. Quinze jours plus tard, vous avez de quoi le montrer : des reels, des photos, des stories, et votre annonce dans le bon ordre. Vous avez juste à poster.
            </p>
            <p className="wall__who">Pour les villas, maisons d&apos;hôtes, gîtes et chalets dont le propriétaire fait déjà tout lui-même.</p>
            <div className="wall__actions">
              <a className="btn" href={APPEL_URL} {...appel}>
                {CTA} →
              </a>
              <p className="wall__price">
                <b>490 € TTC</b>, tout compris. Sans engagement.
              </p>
            </div>
          </div>
          <p className="wall__hint" aria-hidden="true">
            <svg>
              <use href="#i-down" />
            </svg>
            Longez le mur
          </p>
        </section>

        {/* 2 — Le problème, dans ses mots */}
        <section className="mirror" id="mirror" aria-label="Ce que vous vivez">
          <div className="mirror__stage">
            <div className="mirror__inner">
              <p className="mirror__title">Vous vous reconnaissez ?</p>
              <p className="mirror__l">Vos photos ne rendent pas justice au lieu.</p>
              <p className="mirror__l">Vous les avez faites vous-même, entre deux départs. Vous savez qu&apos;elles ne sont pas terribles. Vous avez fait de votre mieux.</p>
              <p className="mirror__l">Beaucoup de vues. Pas assez de réservations.</p>
              <p className="mirror__l">Vous avez baissé le prix, faute de savoir quoi faire d&apos;autre.</p>
              <p className="mirror__l">Debout à 6 h, couché à minuit, tout de A à Z. Pas une minute pour refaire des photos correctes.</p>
              <p className="mirror__l">Et aucune envie de vous mettre en scène. Vous voulez juste que votre lieu soit vu comme il est.</p>
            </div>
            <div className="mirror__bar" aria-hidden="true">
              <i />
            </div>
          </div>
        </section>

        <section className="chute" aria-label="Le recadrage">
          <div className="wrap">
            <h2 className="d h2 rv">
              Votre établissement peut être incroyable dans la vraie vie. <em>Mais est-ce que ça se voit vraiment ?</em>
            </h2>
            <p className="lede rv" style={{ "--rd": "120ms" } as React.CSSProperties}>
              Vous n&apos;avez peut-être pas besoin de poster plus. Vous avez surtout besoin de mieux montrer.
            </p>
            <p className="lede muted rv" style={{ "--rd": "240ms", marginTop: "1rem" } as React.CSSProperties}>
              Ce n&apos;est pas que vous photographiez mal. C&apos;est que personne ne vous a dit ce qui fait cliquer, et ce qui fait ressentir.
            </p>
          </div>
        </section>

        {/* 3 — Le mécanisme : l'immersion */}
        <section className="how" id="immersion" aria-label="L'immersion">
          <div className="wrap">
            <div className="how__head">
              <h2 className="d h2 rv">
                Je ne viens pas seulement filmer votre lieu. <em>Je viens comprendre ce que l&apos;on ressent lorsqu&apos;on y est.</em>
              </h2>
              <p className="how__intro muted rv" style={{ "--rd": "120ms" } as React.CSSProperties}>
                Un photographe vient trois heures et repart avec un catalogue. Une agence n&apos;a jamais mis les pieds chez vous. Moi, je vis ce que votre client vivra. C&apos;est ça, l&apos;immersion.
              </p>
            </div>
            <ol className="steps" id="steps">
              <li className="step">
                <span className="step__n">01</span>
                <h3 className="d h3">Comprendre</h3>
                <p>Avant de venir, on regarde ensemble ce que vos clients disent le plus dans leurs avis, et votre annonce à côté de celles de vos voisins. On choisit trois moments à raconter, pas tout. Et on se met d&apos;accord sur une règle : on ne triche pas.</p>
              </li>
              <li className="step">
                <span className="step__n">02</span>
                <h3 className="d h3">Vivre</h3>
                <p>Je suis chez vous aux moments qui font le séjour : l&apos;arrivée, la fin de journée quand la lumière fait que votre terrasse ressemble à votre terrasse, le matin. Une journée, ou deux demi-journées. Vous n&apos;avez pas à poser : s&apos;il faut quelqu&apos;un dans l&apos;image, c&apos;est moi.</p>
              </li>
              <li className="step">
                <span className="step__n">03</span>
                <h3 className="d h3">Créer</h3>
                <p>Reels, photos, stories, vidéo immersive. Vrai, en mieux : perspectives réalistes, couleurs naturelles, rien de masqué. Les photos trop belles préparent un mauvais avis à l&apos;arrivée. Les photos fidèles rassurent les bons clients.</p>
              </li>
              <li className="step">
                <span className="step__n">04</span>
                <h3 className="d h3">Exploiter</h3>
                <p>Vous ne recevez pas un dossier de quatre-vingts fichiers qui dort. Vous recevez votre annonce dans le bon ordre, et une banque de contenus organisée : quoi poster, dans quel ordre, avec les légendes. Vous avez juste à poster.</p>
              </li>
            </ol>
            <p className="how__sig rv">
              Vous faites vivre l&apos;expérience. <em>Moi, je la raconte pour ceux qui ne l&apos;ont pas encore vécue.</em>
            </p>
          </div>
        </section>

        {/* 4 — Ce que vous recevez */}
        <section className="get" id="livrables" aria-label="Ce que vous recevez">
          <div className="wrap">
            <div className="get__head">
              <h2 className="d h2 rv">
                Sous 14 jours, tout est chez vous. <em>Prêt à publier.</em>
              </h2>
            </div>
            <div className="set rv" aria-label="Votre annonce dans le bon ordre : exemple sur un hôtel & spa">
              {[
                ["/realisations/shooting-hotel-piscine-ext.jpg", "Piscine extérieure d'un hôtel & spa", "Couverture", "50% 55%"],
                ["/realisations/shooting-hotel-terrasse.jpg", "Terrasse au soleil couchant", "02", "50% 40%"],
                ["/realisations/shooting-hotel-chambre.jpg", "Chambre baignée de lumière", "03", "50% 40%"],
                ["/realisations/shooting-hotel-jardins.jpg", "Jardins de l'hôtel", "04", "50% 40%"],
                ["/realisations/shooting-hotel-moment-a-deux.jpg", "Un moment à deux", "05", "50% 40%"],
              ].map(([src, alt, n, pos]) => (
                <figure className="plate" data-dev key={src}>
                  <img src={src} alt={`Photo : ${alt}`} width={1080} height={1350} loading="lazy" style={{ "--pos": pos } as React.CSSProperties} />
                  <span className="set__n">{n === "Couverture" ? <b>Couverture</b> : <b>{n}</b>}</span>
                </figure>
              ))}
              <p className="set__cap">Votre annonce dans le bon ordre : vingt photos classées, photo de couverture désignée. Ici, les cinq premières d&apos;un hôtel &amp; spa.</p>
            </div>
            <div className="get__grid">
              <ul className="get__list rv">
                <li><span><b>Votre annonce dans le bon ordre.</b><p>Vingt photos classées, photo de couverture désignée, déjà aux bons formats.</p></span></li>
                <li><span><b>Des reels.</b><p>La visite que vos futurs clients aimeraient faire avant de payer. Vous n&apos;y apparaissez pas.</p></span></li>
                <li><span><b>Des photos qui ressemblent vraiment à votre lieu.</b><p>Rangées par canal : Airbnb, Booking, Google, Instagram, votre site.</p></span></li>
                <li><span><b>Des stories</b><p>prêtes à poster.</p></span></li>
                <li><span><b>Le Content Board.</b><p>Quoi poster, dans quel ordre, sur 30 jours, avec dix légendes écrites dans le ton du lieu.</p></span></li>
                <li><span><b>Vos droits.</b><p>Tous canaux, sans limite de durée. Ce sont vos images, pas celles d&apos;une plateforme.</p></span></li>
                <li><span><b>La lecture à 30 et 90 jours.</b><p>On regarde ensemble ce qui a bougé sur les vues et les clics de votre annonce. Vous saurez.</p></span></li>
              </ul>
              <aside className="get__side rv" style={{ "--rd": "140ms" } as React.CSSProperties}>
                <p className="d h3">
                  Rien à monter, rien à écrire. <em>Vous avez juste à poster.</em>
                </p>
                <p className="muted">Livré sous 14 jours, rangé par canal, avec l&apos;ordre de publication.</p>
                <a className="btn" href={APPEL_URL} {...appel}>
                  {CTA} →
                </a>
              </aside>
            </div>
          </div>
        </section>

        {/* 5 — Le prix */}
        <section className="dark price" id="prix" data-dark aria-label="Le prix">
          <div className="wrap price__grid">
            <div className="price__tag rv">
              <p className="d">Content Experience</p>
              <p className="price__num">
                490<span className="eur">€</span> <span className="ttc">TTC</span>
              </p>
              <p className="price__all">Tout compris.</p>
              <p className="price__nights">Si votre nuit est à 150 €, c&apos;est le prix de trois nuits. Pour une saison de contenus.</p>
              <a className="btn btn--honey" href={APPEL_URL} {...appel}>
                {CTA} →
              </a>
            </div>
            <div className="price__copy rv" style={{ "--rd": "160ms" } as React.CSSProperties}>
              <p>
                <b>Le brief, l&apos;immersion, la création, votre annonce dans le bon ordre, le Content Board, vos droits, la lecture à 30 et 90 jours.</b> Sans engagement, rien à payer chaque mois.
              </p>
              <div className="price__no">
                <h3>Ce que je ne promets pas</h3>
                <p>Un nombre de réservations. Personne ne peut le promettre honnêtement. Ce que je promets : des images fidèles à ce qu&apos;on vit chez vous, prêtes à publier, à vous.</p>
              </div>
              <p className="price__opts">
                <b>Options, sur devis</b>
                UGC dédié avec script · contenus supplémentaires · Content Direction (plus de légendes, plus loin) · droits publicitaires · nouvelle immersion, au rythme des saisons · déplacement hors zone.
              </p>
            </div>
          </div>
        </section>

        {/* 6 — Ludivine */}
        <section className="about" aria-label="Ludivine">
          <div className="wrap about__grid">
            <figure className="plate rv" data-dev>
              <img src="/portrait.jpg" alt="Ludivine, créatrice de June, dans la lumière du soir" width={1122} height={1402} loading="lazy" style={{ "--pos": "50% 20%" } as React.CSSProperties} />
              <figcaption className="etq">
                <b>Ludivine</b>
                <span>June Content Studio</span>
              </figcaption>
            </figure>
            <div className="about__txt rv" style={{ "--rd": "140ms" } as React.CSSProperties}>
              <h2 className="d h2">Ludivine</h2>
              <p className="about__role">Creative Content Partner · Hospitality · Tourisme · Expériences</p>
              <p className="about__l">Je ne viens pas seulement filmer votre lieu. Je viens comprendre ce que l&apos;on ressent lorsqu&apos;on y est.</p>
              <p className="about__l">Je travaille seule, chez vous, aux moments qui comptent.</p>
              <p className="about__l">
                Vous faites vivre l&apos;expérience. <em>Moi, je la raconte pour ceux qui ne l&apos;ont pas encore vécue.</em>
              </p>
            </div>
          </div>
        </section>

        {/* 7 — Contact (8 — Témoignages : section prévue, vide, non affichée) */}
        <section className="dark fin" id="contact" data-dark aria-label="Contact">
          <div className="wrap">
            <div className="fin__grid">
              <div className="fin__side rv">
                <h2 className="d h2">
                  On en <em>parle ?</em>
                </h2>
                <p>Un appel pour regarder votre annonce, vos avis, et voir si l&apos;immersion a du sens chez vous. Sans engagement.</p>
              </div>
              <div className="fin__act rv" style={{ "--rd": "140ms" } as React.CSSProperties}>
                <a className="btn btn--honey" href={APPEL_URL} {...appel}>
                  {CTA} →
                </a>
                <p className="fin__mail">
                  Ou par email :{" "}
                  <a className="link" href={`mailto:${CONTACT_EMAIL}`}>
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>
            </div>
            <footer className="foot">
              <p>
                <a className="mark" href="#top">
                  June
                </a>{" "}
                Creative Content Partner · Hospitality · Tourisme · Expériences
              </p>
              <nav aria-label="Liens">
                <a className="link" href="#prix">
                  Le prix
                </a>
                <a className="link" href="/portfolio">
                  Réalisations
                </a>
                {INSTAGRAM_URL && (
                  <a className="link" href={INSTAGRAM_URL} rel="noopener noreferrer" target="_blank">
                    Instagram
                  </a>
                )}
              </nav>
            </footer>
          </div>
        </section>
      </main>
    </>
  );
}

import type { CSSProperties } from "react";
import JuneEngine from "@/components/june/JuneEngine";
import JuneContact from "@/components/june/JuneContact";

/* La landing est une galerie : le travail d'abord, des étiquettes de fait,
   l'offre ensuite, la demande à la fin. L'engine scrollcraft lit les
   attributs data-sc-* ; le soleil de la page est piloté par JuneEngine. */

const i = (n: number) => ({ "--i": n }) as CSSProperties;

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
        <nav aria-label="Index">
          <ul className="june-index__list">
            <li>
              <a href="#collection">La collection</a>
            </li>
            <li>
              <a href="#journee">La journée</a>
            </li>
            <li>
              <a href="#ludivine">Ludivine</a>
            </li>
            <li>
              <a href="#offre">L&apos;offre</a>
            </li>
            <li>
              <a className="is-cta" href="#reserver">
                Réserver
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <main id="haut">
        {/* Acte 1 : l'entrée. L'objet un est déjà là, déjà étiqueté. */}
        <section data-sc-act="pin" data-sc-span="1.65" data-sc-dwell="0.25" className="j-hero" aria-label="Entrée de la collection">
          <div data-sc-stage>
            <figure className="j-hero__media">
              <img
                src="/realisations/shooting-hotel-piscine.jpg"
                alt="Piscine intérieure d'un hôtel et spa en Provence, arches blanches et lumière chaude de fin de matinée"
                width={1200}
                height={1464}
              />
            </figure>
            <div className="sc-scrim sc-scrim--lead" aria-hidden="true"></div>
            <div className="sc-copy sc-copy--lead" data-sc-cue="0 1 0 0.3">
              <p className="j-label">
                <strong>Hôtel &amp; spa, Provence</strong>
                <span>Shooting photo. Piscine intérieure, fin de matinée.</span>
              </p>
              <h1 className="j-walltext sc-display">
                Studio de contenu pour les lieux de tourisme.
              </h1>
              <p className="j-hero__note">
                June photographie et filme des hôtels, restaurants, logements
                insolites et expériences en Occitanie. Tout est livré prêt à
                publier. La collection commence ici.
              </p>
            </div>
          </div>
        </section>

        {/* Acte 2 : la salle. La collection défile latéralement. */}
        <section
          id="collection"
          data-sc-act="pan"
          data-sc-span="2.7"
          aria-label="La collection"
        >
          <div data-sc-stage className="j-room">
            <div className="j-rail" data-sc-pan="0.06">
              <div className="j-rail__intro" style={i(0)}>
                <h2 className="sc-display sc-display--md">La collection</h2>
                <p className="sc-body">
                  Six lieux, trois formats : reels montés, vidéos UGC, shooting
                  photo. Chaque projet est visible sur Instagram.
                </p>
              </div>

              <figure className="j-object j-object--p910" style={i(1)}>
                <div className="j-object__media">
                  <img
                    src="/realisations/harmonie-yacht-shooting.jpg"
                    alt="Quatre amis au soleil couchant sur le pont d'un yacht, verres à la main"
                    width={1179}
                    height={1456}
                  />
                </div>
                <figcaption className="j-label">
                  <strong>Harmonie Yacht, Carnon</strong>
                  <span>
                    Location de yacht. Shooting photo, reels.{" "}
                    <a
                      href="https://www.instagram.com/p/DasUCeeiM1E/?igsh=NXppc2lyZ3NmcHB0"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voir sur Instagram
                    </a>
                  </span>
                </figcaption>
              </figure>

              <figure className="j-object j-object--wide" style={i(2)}>
                <div className="j-object__media">
                  <img
                    src="/realisations/next-yacht.jpg"
                    alt="Yacht à l'ancre en pleine mer, deux personnes assises sur la plateforme de baignade"
                    width={1179}
                    height={1499}
                  />
                </div>
                <figcaption className="j-label">
                  <strong>Next Yacht, en mer</strong>
                  <span>
                    Shooting photo.{" "}
                    <a
                      href="https://www.instagram.com/p/DOTjasHiLwc/?igsh=Z2R0NTZqYWY4OHA1"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voir sur Instagram
                    </a>
                  </span>
                </figcaption>
              </figure>

              <figure className="j-object j-object--reel" style={i(3)}>
                <div className="j-object__media">
                  <img
                    src="/realisations/una-mas-carnon.jpg"
                    alt="Verres levés en terrasse au cocktail bar Una Mas à Carnon"
                    width={385}
                    height={679}
                  />
                </div>
                <figcaption className="j-label">
                  <strong>Una Mas, Carnon</strong>
                  <span>
                    Cocktail bar. Reel publié.{" "}
                    <a
                      href="https://www.instagram.com/reel/DYwjsCSM7wb/?igsh=MTUzbXluNXBxMDdmYQ=="
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voir le reel
                    </a>
                  </span>
                </figcaption>
              </figure>

              <figure className="j-object j-object--sq" style={i(4)}>
                <div className="j-object__media">
                  <img
                    src="/realisations/beltra-therapy.jpg"
                    alt="Séance de thérapie manuelle au cabinet Beltra Physical Therapy"
                    width={1179}
                    height={1465}
                  />
                </div>
                <figcaption className="j-label">
                  <strong>Beltra Physical Therapy</strong>
                  <span>
                    Thérapie manuelle. Shooting photo.{" "}
                    <a
                      href="https://www.instagram.com/p/DSKXshciI5F/?img_index=1&igsh=NnV2cnc3ejduaGZp"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voir sur Instagram
                    </a>
                  </span>
                </figcaption>
              </figure>

              <figure className="j-object j-object--reel" style={i(5)}>
                <div className="j-object__media">
                  <img
                    src="/realisations/gite-abric-cevennes.jpg"
                    alt="Couverture du reel du Gîte de l'Abric dans les Cévennes, table dressée sous la treille"
                    width={393}
                    height={700}
                  />
                </div>
                <figcaption className="j-label">
                  <strong>Gîte de l&apos;Abric, Cévennes</strong>
                  <span>
                    Logement insolite. Reel publié.{" "}
                    <a
                      href="https://www.instagram.com/reel/DMVPrINId35/?igsh=ZDNnb20zYzJwY3Ax"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voir le reel
                    </a>
                  </span>
                </figcaption>
              </figure>

              <div className="j-rail__outro" style={i(6)}>
                <p>Chaque lieu est un projet.</p>
                <a href="/portfolio" className="j-label">
                  Voir des réalisations
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Acte 3, le pic : une prestation entière se déroule, du matin au soir. */}
        <section
          id="journee"
          data-sc-act="pin"
          data-sc-span="4.2"
          className="j-day"
          aria-label="Une journée de prestation"
        >
          <div data-sc-stage>
            <p className="j-day__open j-label" data-sc-cue="0 0.16 0 0.5">
              Une seule prestation. Un séjour, du matin au soir.
            </p>

            <div className="j-day__table">
              <figure className="j-print">
                <img
                  src="/realisations/shooting-hotel-jardins.jpg"
                  alt="Arrivée à l'hôtel : bastide ocre, cyprès et jardins sous le ciel du matin"
                  width={1080}
                  height={1616}
                />
              </figure>
              <figure className="j-print">
                <img
                  src="/realisations/shooting-hotel-chambre.jpg"
                  alt="Salle de bain de la chambre, peignoir et serviettes brodées"
                  width={1200}
                  height={1600}
                />
              </figure>
              <figure className="j-print">
                <img
                  src="/realisations/shooting-hotel-balcon.jpg"
                  alt="Ludivine au balcon de la chambre, face à la piscine et aux jardins"
                  width={1080}
                  height={1616}
                />
              </figure>
              <figure className="j-print">
                <img
                  src="/realisations/shooting-hotel-piscine-ext.jpg"
                  alt="Piscine extérieure de l'hôtel, transats et parasols dans l'après-midi"
                  width={1080}
                  height={1616}
                />
              </figure>
              <figure className="j-print">
                <img
                  src="/realisations/shooting-hotel-terrasse.jpg"
                  alt="Lecture sur la terrasse de la chambre, vue à travers la porte-fenêtre"
                  width={1080}
                  height={1616}
                />
              </figure>
              <figure className="j-print">
                <img
                  src="/realisations/shooting-hotel-jardins-vue.jpg"
                  alt="Vue du balcon sur la piscine et les jardins de l'hôtel"
                  width={1080}
                  height={1616}
                />
              </figure>
              <figure className="j-print">
                <img
                  src="/realisations/shooting-hotel-couple-terrasse.jpg"
                  alt="Le couple attablé sur la terrasse en fin de journée"
                  width={1080}
                  height={1616}
                />
              </figure>
              <figure className="j-print">
                <img
                  src="/realisations/shooting-hotel-moment-a-deux.jpg"
                  alt="Moment à deux au balcon, dans la dernière lumière du soir"
                  width={1080}
                  height={1616}
                />
              </figure>
            </div>

            <div className="j-day__aside">
              <p className="j-label" data-sc-cue="0.05 0.34 0.2 0.3">
                Le matin. L&apos;arrivée, la chambre.
              </p>
              <p className="j-label" data-sc-cue="0.36 0.64 0.2 0.3">
                L&apos;après-midi. La piscine, un livre.
              </p>
              <p className="j-label" data-sc-cue="0.66 0.87 0.2 0.3">
                Le soir. La lumière tombe, ils restent.
              </p>
            </div>

            <div className="j-day__wash" aria-hidden="true"></div>
            <div className="j-day__close" data-sc-cue="0.74 0.995 0.18 0.12">
              <p className="sc-lede">Imaginez la même journée, chez vous.</p>
              <p className="j-label">
                <strong>Hôtel &amp; spa, Provence</strong>
                <span>
                  Séjour complet : arrivée, chambre, piscine, terrasse, soir.
                  Livré prêt à publier.
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Acte 4 : Ludivine. La page ralentit, quelqu'un parle. */}
        <section
          id="ludivine"
          data-sc-act="flow"
          className="sc-section j-lud"
          aria-label="Ludivine"
        >
          <div className="sc-wrap j-lud__grid">
            <figure
              className="j-lud__media"
              data-sc-reveal="up"
              data-sc-reveal-at="0.14 0.42"
            >
              <img
                src="/portrait.jpg"
                alt="Ludivine, créatrice de June, assise dans la lumière du soir"
                width={1122}
                height={1402}
              />
            </figure>
            <div className="j-lud__text">
              <h2 className="sc-display sc-display--md">
                Je vis votre expérience.
              </h2>
              <p className="sc-lede">
                Contrairement à un simple shooting, je prends le temps de vivre
                réellement votre lieu : déguster vos plats, dormir dans vos
                chambres, participer à votre activité.
              </p>
              <p className="sc-body">
                Chaque établissement a une identité, une ambiance, une histoire.
                Mon rôle est de les capturer dans un contenu fidèle à ce que
                découvriront vos futurs clients. Le but n&apos;est pas seulement
                de faire de belles images : c&apos;est de créer l&apos;envie de
                venir les vivre.
              </p>
              <p className="j-label">
                <strong>Ludivine</strong>
                <span>Créatrice de June. Occitanie, Montpellier et littoral.</span>
              </p>
            </div>
          </div>
        </section>

        {/* Acte 5 : l'offre, en plaque d'exposition. */}
        <section
          id="offre"
          data-sc-act="flow"
          className="sc-section j-offer"
          aria-label="L'offre"
        >
          <div className="sc-wrap">
            <div className="j-plate" data-sc-in data-sc-stagger="70">
              <p className="j-label">L&apos;offre. Tarif de lancement.</p>
              <h2 className="sc-display sc-display--lg">
                L&apos;Expérience Content &amp; UGC
              </h2>
              <p className="sc-lede">
                Je vis votre expérience pour donner envie à vos futurs clients
                de la vivre à leur tour.
              </p>
              <p className="j-price">
                <span className="j-price__num">390&nbsp;€</span>
                <span className="j-price__note">
                  une fois. Pas d&apos;abonnement : vous repartez avec vos
                  fichiers.
                </span>
              </p>

              <ul className="j-rows">
                <li>
                  <h3>Une galerie de photos professionnelles</h3>
                  <p>
                    Votre établissement, vos espaces, vos produits, votre équipe
                    et les détails qui font votre différence.
                  </p>
                </li>
                <li>
                  <h3>Des vidéos verticales prêtes à publier</h3>
                  <p>Pensées pour Instagram Reels, TikTok, Facebook et votre site.</p>
                </li>
                <li>
                  <h3>1 vidéo UGC</h3>
                  <p>
                    Naturelle et immersive, comme si j&apos;étais votre cliente.
                    Diffusée en organique sur vos réseaux, pas en publicité.
                  </p>
                </li>
                <li>
                  <h3>Hooks &amp; légendes</h3>
                  <p>Des idées de textes et d&apos;accroches pour vos publications.</p>
                </li>
                <li>
                  <h3>Contenu optimisé</h3>
                  <p>Fichiers haute qualité, prêts à publier, à garder.</p>
                </li>
              </ul>

              <div className="j-how">
                <div>
                  <h3>Restaurant</h3>
                  <p>Découverte et dégustation sur place.</p>
                </div>
                <div>
                  <h3>Hôtel, gîte, logement insolite</h3>
                  <p>
                    Séjour complet : arrivée, ambiance, détails, services,
                    réveil, petit-déjeuner.
                  </p>
                </div>
                <div>
                  <h3>Activité touristique</h3>
                  <p>Participation réelle pour capturer les émotions.</p>
                </div>
              </div>

              <div className="j-carte">
                <p className="j-label">
                  À la carte. Chaque option se réserve seule, on en parle
                  simplement.
                </p>
                <ul>
                  <li>
                    <strong>1 vidéo UGC complète.</strong> Découverte et
                    expérience face caméra, montage inclus.
                  </li>
                  <li>
                    <strong>Shooting photo / vidéo.</strong> Une demi-journée
                    sur place, sans le volet UGC.
                  </li>
                  <li>
                    <strong>Collab Instagram.</strong> Publication en
                    collaboration : nos deux audiences se cumulent.
                  </li>
                </ul>
              </div>

              <p className="j-fine">
                Les frais liés à l&apos;expérience (repas, nuitée ou activité)
                sont à prévoir par l&apos;établissement, ou peuvent faire
                l&apos;objet d&apos;un échange en collaboration selon le projet.
              </p>

              <a className="j-cta" href="#reserver">
                Réserver un shooting
              </a>
            </div>
          </div>
        </section>

        {/* Acte 6 : le soir. La page arrive au crépuscule et s'arrête. */}
        <section
          id="reserver"
          data-sc-act="pin"
          data-sc-span="1.35"
          className="j-dusk"
          aria-label="Réservation"
        >
          <div data-sc-stage className="j-dusk__stage">
            <div className="j-dusk__inner" data-sc-cue="0 1 0 0">
              <div className="j-dusk__intro">
                <p className="j-label">
                  Réservation. Réponse rapide, sans engagement.
                </p>
                <h2 className="sc-display sc-display--md">
                  Envie de voir ce que ça donnerait chez vous ?
                </h2>
                <p className="sc-body">
                  Écrivez-nous quelques mots sur votre lieu. On revient vers
                  vous rapidement pour en parler.
                </p>
                <div className="j-dusk__meta">
                  <span>June. Studio de contenu, Occitanie.</span>
                  <a href="mailto:harmonieyacht@gmail.com">
                    harmonieyacht@gmail.com
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Instagram
                  </a>
                  <a href="/portfolio">Voir des réalisations</a>
                </div>
              </div>
              <JuneContact />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

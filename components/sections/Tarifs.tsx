import {
  Camera,
  Clapperboard,
  FolderCheck,
  PenLine,
  Plus,
  UserRound,
} from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";

const inclus = [
  {
    icon: Camera,
    titre: "Une galerie de photos professionnelles",
    texte:
      "Des images qui mettent en valeur votre établissement, vos espaces, vos produits, votre équipe et les détails qui font votre différence.",
  },
  {
    icon: Clapperboard,
    titre: "Des vidéos verticales prêtes à publier",
    texte:
      "Créées pour Instagram Reels, TikTok, Facebook ou votre site internet.",
  },
  {
    icon: UserRound,
    titre: "1 vidéo UGC",
    texte:
      "Une vidéo naturelle et immersive racontant l'expérience comme si j'étais votre cliente. Idéale pour créer de la confiance, sur vos réseaux sociaux ou dans vos publicités.",
  },
  {
    icon: PenLine,
    titre: "Hooks & légendes",
    texte:
      "Des idées de textes et d'accroches pour faciliter votre communication.",
  },
  {
    icon: FolderCheck,
    titre: "Contenu optimisé",
    texte:
      "Tous les fichiers sont livrés en haute qualité, prêts à être publiés.",
  },
];

const options = [
  {
    nom: "1 vidéo UGC complète",
    detail:
      "Je découvre et vis votre expérience face caméra, montage inclus. Idéal pour tester le format.",
  },
  {
    nom: "Shooting photo / vidéo",
    detail:
      "Une demi-journée sur place : photos retouchées et séquences vidéo, sans le volet UGC.",
  },
  {
    nom: "Collab Instagram",
    detail:
      "On publie en collaboration : votre lieu apparaît sur mon compte et sur le vôtre. Nos deux audiences se cumulent et l'algorithme pousse la publication plus loin.",
  },
];

export default function Tarifs() {
  return (
    <section id="tarifs" className="tarifs bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <Reveal>
          <Eyebrow>L&apos;offre</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-[clamp(28px,4vw,44px)] leading-tight">
            L&apos;Expérience <em className="italic text-chestnut">Content &amp; UGC</em>.
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-espresso">
            Je vis votre expérience pour donner envie à vos futurs clients de
            la vivre à leur tour.
          </p>
          <div className="mt-5 flex max-w-2xl flex-col gap-4 leading-relaxed text-muted">
            <p>
              Chaque établissement possède une identité, une ambiance et une
              histoire qui lui sont propres. Mon rôle est de les capturer à
              travers un contenu authentique, esthétique et immersif.
            </p>
            <p>
              Contrairement à un simple shooting photo, je prends le temps de
              vivre réellement votre expérience : déguster vos plats, séjourner
              dans votre établissement ou participer à votre activité, afin de
              créer un contenu fidèle à ce que découvriront vos futurs clients.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid items-start gap-8 md:mt-16 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* Carte tarif */}
          <Reveal>
            <article className="flex flex-col rounded-[20px] bg-espresso p-8 text-cream shadow-card md:sticky md:top-24 md:p-9">
              <p className="self-start rounded-full bg-honey/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-honey">
                Tarif de lancement
              </p>
              <p className="mt-6 font-display text-6xl font-light">390 €</p>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-cream/80">
                Immersion · Photos · Vidéos · UGC · Hooks &amp; légendes
              </p>
              <p className="mt-6 text-sm leading-relaxed text-cream/70">
                Une banque de contenus premium à utiliser pendant plusieurs
                semaines : réseaux sociaux, site internet, campagnes
                publicitaires.
              </p>

              <a
                href="#contact"
                className="mt-8 rounded-full bg-cream px-6 py-3 text-center text-sm font-semibold text-espresso transition-transform hover:-translate-y-0.5"
              >
                Réserver un shooting
              </a>

              <p className="mt-6 border-t border-cream/15 pt-5 text-xs leading-relaxed text-cream/60">
                Les frais liés à l&apos;expérience (repas, nuitée ou activité)
                sont à prévoir par l&apos;établissement, ou peuvent faire
                l&apos;objet d&apos;un échange en collaboration selon le projet.
              </p>
            </article>
          </Reveal>

          {/* Ce que comprend l'offre */}
          <Reveal delay={0.12}>
            <h3 className="font-display text-2xl">
              Ce que comprend l&apos;offre
            </h3>
            <ul className="mt-6 flex flex-col divide-y divide-[rgba(36,29,23,.12)]">
              {inclus.map((item) => (
                <li key={item.titre} className="flex items-start gap-5 py-5">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-honey/15">
                    <item.icon
                      className="h-5 w-5 text-chestnut"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>
                  <div>
                    <h4 className="font-semibold">{item.titre}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {item.texte}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* À la carte */}
        <Reveal delay={0.1}>
          <article className="mt-10 rounded-[20px] border border-line bg-limestone p-8 md:p-9">
            <div className="md:flex md:items-baseline md:justify-between md:gap-8">
              <h3 className="font-display text-2xl">À la carte</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted md:mt-0">
                Un seul format vous suffit ? Chaque option se réserve seule —
                le tarif dépend du projet, on en parle simplement par message.
              </p>
            </div>
            <ul className="mt-7 grid gap-6 md:grid-cols-3 md:gap-8">
              {options.map((option) => (
                <li key={option.nom} className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-honey/15">
                    <Plus
                      className="h-4 w-4 text-chestnut"
                      strokeWidth={2.4}
                      aria-hidden="true"
                    />
                  </span>
                  <div>
                    <h4 className="font-semibold">{option.nom}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {option.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </Reveal>

        {/* L'objectif */}
        <Reveal delay={0.1}>
          <div className="mx-auto mt-16 max-w-2xl text-center md:mt-20">
            <p className="font-display text-[clamp(22px,3vw,32px)] leading-snug">
              Le but n&apos;est pas seulement de créer de belles images. Le but
              est de créer <em className="italic text-chestnut">l&apos;envie</em>{" "}
              de vivre votre expérience.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

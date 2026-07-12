import { BedDouble, UtensilsCrossed, Waves } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";

const experiences = [
  {
    icon: UtensilsCrossed,
    titre: "Restaurant",
    texte:
      "Je viens découvrir votre établissement, déguster vos plats et vivre l'expérience afin de créer un contenu authentique.",
  },
  {
    icon: BedDouble,
    titre: "Hôtel, Airbnb & logement insolite",
    texte:
      "Je séjourne dans votre établissement afin de raconter toute l'expérience : l'arrivée, l'ambiance, les détails, les services, le réveil, le petit-déjeuner… Tout ce qui donnera envie à vos futurs clients de réserver.",
  },
  {
    icon: Waves,
    titre: "Activité touristique",
    texte:
      "Je participe réellement à l'activité afin de capturer les émotions et l'expérience vécue.",
  },
];

export default function CommentCaMarche() {
  return (
    <section id="comment" className="comment py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <Reveal>
          <Eyebrow>Comment ça se passe</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-[clamp(28px,4vw,44px)] leading-tight">
            Chaque projet est <em className="italic text-chestnut">différent</em>.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-muted">
            Je ne photographie pas votre lieu de l&apos;extérieur : je vis
            réellement votre expérience, comme vos futurs clients la vivront.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
          {experiences.map((experience, index) => (
            <Reveal key={experience.titre} delay={index * 0.12}>
              <article className="h-full rounded-[20px] border border-line bg-cream p-7 md:p-8">
                <experience.icon
                  className="h-6 w-6 text-honey"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
                <h3 className="mt-5 font-display text-xl leading-snug">
                  {experience.titre}
                </h3>
                <p className="mt-3 leading-relaxed text-muted">
                  {experience.texte}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

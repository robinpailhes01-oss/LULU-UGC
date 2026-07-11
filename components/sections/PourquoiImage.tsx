import { Eye, HeartHandshake, Sparkles } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";

const points = [
  {
    icon: Eye,
    titre: "On vous visite d'abord en ligne",
    texte:
      "Avant de réserver une chambre, une table ou une activité, on regarde vos photos et vos vidéos. C'est là que la décision se joue.",
  },
  {
    icon: Sparkles,
    titre: "Votre image doit être à la hauteur du réel",
    texte:
      "Un lieu magnifique avec des visuels ternes perd des réservations. Votre contenu doit refléter exactement ce qu'on ressent sur place.",
  },
  {
    icon: HeartHandshake,
    titre: "Et je suis là pour ça",
    texte:
      "Je viens vivre votre expérience, je la filme comme vos futurs clients la vivront, et je vous livre des images fidèles qui donnent envie de venir.",
  },
];

export default function ImageImportance() {
  return (
    <section id="image" className="image bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center">
              <Eyebrow>Pourquoi l&apos;image compte</Eyebrow>
            </div>
            <h2 className="mt-4 font-display text-[clamp(28px,4vw,44px)] leading-tight">
              Votre image est la{" "}
              <em className="italic text-chestnut">première visite</em> de vos
              clients.
            </h2>
            <p className="mx-auto mt-5 max-w-xl leading-relaxed text-muted">
              Dans le tourisme, l&apos;expérience commence bien avant
              l&apos;arrivée : elle commence sur un écran. De belles images qui
              reflètent vraiment votre lieu, c&apos;est ce qui transforme un
              regard en réservation.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
          {points.map((point, index) => (
            <Reveal key={point.titre} delay={index * 0.12}>
              <article className="h-full rounded-[20px] border border-line bg-limestone p-7 text-center md:p-8">
                <point.icon
                  className="mx-auto h-6 w-6 text-honey"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
                <h3 className="mt-5 font-display text-xl leading-snug">
                  {point.titre}
                </h3>
                <p className="mt-3 leading-relaxed text-muted">{point.texte}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

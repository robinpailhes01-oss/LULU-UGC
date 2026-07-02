import { Clapperboard, Camera, Send } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";

const prestations = [
  {
    icon: Clapperboard,
    titre: "Des reels qui s'arrêtent sous le pouce",
    texte:
      "Des vidéos verticales courtes, tournées sur place et montées avec soin. Le genre d'images qui donne envie de pousser la porte.",
  },
  {
    icon: Camera,
    titre: "Des photos qui donnent envie de réserver",
    texte:
      "La lumière de votre lieu, ses matières, ses détails. Des photos retouchées qui donnent faim, envie de dormir là, envie d'y être.",
  },
  {
    icon: Send,
    titre: "Tout au bon format, prêt à publier",
    texte:
      "Formats verticaux, recadrages, idées de légendes. Vous recevez des fichiers publiables tels quels, sans retouche de votre côté.",
  },
];

export default function Prestations() {
  return (
    <section id="prestations" className="prestations bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <Reveal>
          <Eyebrow>Ce qu&apos;on livre</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-[clamp(28px,4vw,44px)] leading-tight">
            Du contenu qui donne envie de <em className="italic text-oxblood">venir</em>.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
          {prestations.map((prestation, index) => (
            <Reveal key={prestation.titre} delay={index * 0.12}>
              <article className="h-full rounded-[20px] border border-line bg-limestone p-7 md:p-8">
                <prestation.icon
                  className="h-6 w-6 text-honey"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
                <h3 className="mt-5 font-display text-xl leading-snug">
                  {prestation.titre}
                </h3>
                <p className="mt-3 leading-relaxed text-muted">{prestation.texte}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

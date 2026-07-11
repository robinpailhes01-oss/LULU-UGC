import { Clapperboard, UserRound, Camera } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";

const prestations = [
  {
    icon: Clapperboard,
    titre: "Des reels qui inspirent et donnent envie de venir",
    texte:
      "Des vidéos verticales courtes, tournées sur place et montées avec soin. Le genre d'images qui inspire et donne envie de réserver.",
  },
  {
    icon: UserRound,
    titre: "Des vidéos UGC qui créent la confiance",
    texte:
      "Je vis votre expérience face caméra, comme une cliente : on me voit dormir dans le logement, goûter le plat, tester l'activité. Le format le plus crédible aux yeux de vos futurs visiteurs.",
  },
  {
    icon: Camera,
    titre: "Des photos qui donnent envie de réserver",
    texte:
      "La lumière de votre lieu, ses matières, ses détails. Des photos retouchées qui donnent faim, envie de dormir là, envie d'y être.",
  },
];

export default function Prestations() {
  return (
    <section id="prestations" className="prestations py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <Reveal>
          <Eyebrow>Ce qu&apos;on livre</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-[clamp(28px,4vw,44px)] leading-tight">
            Du contenu qui donne envie de <em className="italic text-chestnut">venir</em>.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
          {prestations.map((prestation, index) => (
            <Reveal key={prestation.titre} delay={index * 0.12}>
              <article className="h-full rounded-[20px] border border-line bg-cream p-7 md:p-8">
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

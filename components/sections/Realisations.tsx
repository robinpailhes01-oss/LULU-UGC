import ContentCard from "@/components/ui/ContentCard";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";
import { categories, realisations } from "@/lib/realisations";

export default function Realisations() {
  return (
    <section id="realisations" className="realisations bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <Reveal>
          <Eyebrow>Réalisations</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-[clamp(28px,4vw,44px)] leading-tight">
            On montre peu, mais on montre <em className="italic text-chestnut">bien</em>.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-muted">
            Trois formats, un même objectif : refléter l&apos;expérience de
            votre lieu. Cliquez sur un projet pour voir le reel.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-8">
          {categories.map((categorie, index) => {
            const items = realisations.filter(
              (realisation) => realisation.categorie === categorie.nom
            );
            return (
              <Reveal key={categorie.nom} delay={index * 0.12}>
                <article>
                  <h3 className="font-display text-2xl">{categorie.nom}</h3>
                  <p className="mt-2 min-h-0 text-sm leading-relaxed text-muted md:min-h-[84px]">
                    {categorie.description}
                  </p>
                  <div className="mt-5 flex flex-col gap-6">
                    {items.map((realisation, itemIndex) => (
                      <ContentCard
                        key={`${categorie.nom}-${itemIndex}`}
                        label={realisation.titre}
                        gradient={realisation.gradient}
                        src={realisation.src}
                        href={realisation.href}
                        showBadge={Boolean(realisation.src)}
                        floatDelay={index * 1.8}
                        className="max-w-[300px]"
                      />
                    ))}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

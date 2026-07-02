import ContentCard from "@/components/ui/ContentCard";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";
import { realisations } from "@/lib/realisations";

export default function Realisations() {
  return (
    <section id="realisations" className="realisations py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <Reveal>
          <Eyebrow>Réalisations</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-[clamp(28px,4vw,44px)] leading-tight">
            On montre peu, mais on montre <em className="italic text-oxblood">bien</em>.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-muted">
            Le portfolio grandit tournage après tournage. Premier cas en cours :
            un logement insolite au Port de Carnon.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-5 md:mt-16 md:grid-cols-3 md:gap-7">
          {realisations.map((realisation, index) => (
            <Reveal
              key={`${realisation.titre}-${index}`}
              delay={index * 0.12}
              className={index === 2 ? "hidden md:block" : undefined}
            >
              <ContentCard
                label={`${realisation.type} — ${realisation.titre}`}
                gradient={realisation.gradient}
                floatDelay={index * 1.8}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

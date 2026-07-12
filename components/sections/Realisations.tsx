import ContentCard from "@/components/ui/ContentCard";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";
import { projets } from "@/lib/realisations";

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
            Chaque lieu est un projet : reels, vidéos UGC ou shooting photo
            selon l&apos;expérience. Cliquez sur un projet pour le voir sur
            Instagram.
          </p>
          <a
            href="/portfolio"
            className="mt-5 inline-block text-sm font-semibold text-espresso underline decoration-line decoration-1 underline-offset-8 transition-colors hover:decoration-chestnut"
          >
            Voir tout le portfolio
          </a>
        </Reveal>

        {/* Une carte par lieu — le portfolio complet est sur /portfolio */}
        <div className="mt-12 grid grid-cols-2 gap-5 md:mt-16 md:grid-cols-3 md:gap-7">
          {projets.slice(0, 6).map((projet, index) => {
            const cover = projet.medias[0];
            return (
              <Reveal key={projet.lieu} delay={(index % 3) * 0.12}>
                <ContentCard
                  label={projet.lieu}
                  gradient={cover.gradient}
                  src={cover.src}
                  href={cover.href}
                  showBadge={false}
                  showPlay={Boolean(cover.video)}
                  floatDelay={index * 1.4}
                />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {projet.formats.join(" · ")}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

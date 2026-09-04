import ContentCard from "@/components/ui/ContentCard";
import {
  categories,
  projets,
  type CategorieRealisation,
  type Media,
} from "@/lib/realisations";

type Entree = { media: Media; lieu: string; index: number };

/* Un média vidéo relève des formats vidéo de son projet (Réels, UGC) ; une
   photo relève du shooting photo. Un même reel peut apparaître sous Réels et
   sous UGC quand le projet couvre les deux. */
function mediasPour(format: CategorieRealisation): Entree[] {
  const out: Entree[] = [];
  projets.forEach((projet) => {
    if (!projet.formats.includes(format)) return;
    projet.medias.forEach((media, index) => {
      const estVideo = Boolean(media.video);
      const formatVideo = format !== "Shooting photo";
      if (estVideo === formatVideo) out.push({ media, lieu: projet.lieu, index });
    });
  });
  return out;
}

export default function PortfolioGrid() {
  const sections = categories.map((c) => ({ ...c, entrees: mediasPour(c.nom) }));

  return (
    <div>
      <nav aria-label="Aller à un format" className="flex flex-wrap gap-3">
        {sections.map((s) => (
          <a
            key={s.nom}
            href={`#${s.ancre}`}
            className="rounded-full border border-line bg-cream px-5 py-2.5 text-sm font-semibold text-espresso transition-colors hover:bg-espresso hover:text-cream"
          >
            {s.titre}
          </a>
        ))}
      </nav>

      {sections.map((s) => (
        <section
          key={s.nom}
          id={s.ancre}
          className="scroll-mt-28 border-b border-line py-12 last:border-b-0 md:py-16"
          aria-label={s.titre}
        >
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-chestnut">
              {s.accroche}
            </p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">{s.titre}</h2>
            <p className="mt-3 leading-relaxed text-muted">{s.description}</p>
          </div>

          {s.entrees.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {s.entrees.map(({ media, lieu, index }) => (
                <ContentCard
                  key={`${lieu}-${index}`}
                  label={lieu}
                  gradient={media.gradient}
                  src={media.src}
                  href={media.href}
                  position={media.position}
                  showBadge={false}
                  showPlay={Boolean(media.video)}
                  floatDelay={index * 1.2}
                />
              ))}
            </div>
          ) : (
            <p className="mt-8 italic text-muted">Exemples à venir.</p>
          )}
        </section>
      ))}
    </div>
  );
}

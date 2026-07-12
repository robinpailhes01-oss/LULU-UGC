"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ContentCard from "@/components/ui/ContentCard";
import {
  categories,
  projets,
  type CategorieRealisation,
} from "@/lib/realisations";

type Filtre = "Tous" | CategorieRealisation;

const filtres: Filtre[] = ["Tous", ...categories.map((c) => c.nom)];

export default function PortfolioGrid() {
  const [filtre, setFiltre] = useState<Filtre>("Tous");
  const reduceMotion = useReducedMotion();

  const visibles = projets.filter(
    (projet) => filtre === "Tous" || projet.formats.includes(filtre)
  );

  return (
    <div>
      <div
        className="flex flex-wrap gap-3"
        role="group"
        aria-label="Filtrer le portfolio par format"
      >
        {filtres.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltre(f)}
            aria-pressed={filtre === f}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
              filtre === f
                ? "bg-espresso text-cream shadow-soft"
                : "border border-line bg-cream text-muted hover:text-espresso"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {visibles.length > 0 ? (
        <div className="mt-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {visibles.map((projet) => (
              <motion.section
                key={projet.lieu}
                layout={!reduceMotion}
                initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="border-b border-line py-10 last:border-b-0"
                aria-label={projet.lieu}
              >
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                  <h2 className="font-display text-2xl md:text-3xl">
                    {projet.lieu}
                  </h2>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    {projet.formats.join(" · ")}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
                  {projet.medias.map((media, index) => (
                    <ContentCard
                      key={`${projet.lieu}-${index}`}
                      label={projet.lieu}
                      gradient={media.gradient}
                      src={media.src}
                      href={media.href}
                      showBadge={false}
                      showPlay={Boolean(media.video)}
                      showLabel={false}
                      floatDelay={index * 1.2}
                    />
                  ))}
                </div>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <p className="mt-10 italic text-muted">
          Rien dans cette catégorie pour l&apos;instant — ça arrive bientôt.
        </p>
      )}
    </div>
  );
}

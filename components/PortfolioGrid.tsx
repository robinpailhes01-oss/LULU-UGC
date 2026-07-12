"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ContentCard from "@/components/ui/ContentCard";
import {
  categories,
  realisations,
  type CategorieRealisation,
} from "@/lib/realisations";

type Filtre = "Tous" | CategorieRealisation;

const filtres: Filtre[] = ["Tous", ...categories.map((c) => c.nom)];

export default function PortfolioGrid() {
  const [filtre, setFiltre] = useState<Filtre>("Tous");
  const reduceMotion = useReducedMotion();

  const items = realisations.filter(
    (realisation) =>
      filtre === "Tous" || realisation.categories.includes(filtre)
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

      {items.length > 0 ? (
        <motion.div layout={!reduceMotion} className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 md:gap-7 lg:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((realisation, index) => (
              <motion.div
                key={realisation.titre}
                layout={!reduceMotion}
                initial={reduceMotion ? undefined : { opacity: 0, scale: 0.94 }}
                animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <ContentCard
                  label={realisation.titre}
                  gradient={realisation.gradient}
                  src={realisation.src}
                  href={realisation.href}
                  showBadge={false}
                  showPlay={!realisation.categories.every((c) => c === "Shooting photo")}
                  floatDelay={index * 1.4}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <p className="mt-10 italic text-muted">
          Rien dans cette catégorie pour l&apos;instant — ça arrive bientôt.
        </p>
      )}
    </div>
  );
}

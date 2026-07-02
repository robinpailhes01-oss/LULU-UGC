"use client";

import { motion, useReducedMotion } from "framer-motion";
import ContentCard from "@/components/ui/ContentCard";
import Eyebrow from "@/components/ui/Eyebrow";

const heroCards = [
  {
    label: "Reel restaurant",
    gradient: "linear-gradient(160deg, #E8C495 0%, #C98A3C 55%, #8A3B33 100%)",
    floatDelay: 0,
    className: "",
  },
  {
    label: "Logement insolite",
    gradient: "linear-gradient(200deg, #C98A3C 0%, #8A3B33 60%, #241D17 100%)",
    floatDelay: 1.6,
    className: "mt-10",
  },
  {
    label: "Hôtel & spa",
    gradient: "linear-gradient(150deg, #F0D9B8 0%, #C98A3C 50%, #6B3F2E 100%)",
    floatDelay: 3.1,
    className: "hidden sm:block",
  },
  {
    label: "Lieu d'activité",
    gradient: "linear-gradient(190deg, #E3B87F 0%, #A65E38 55%, #241D17 100%)",
    floatDelay: 4.4,
    className: "mt-12 hidden lg:block",
  },
];

export default function Hero() {
  const reduceMotion = useReducedMotion();

  const cascade = (index: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.85,
            delay: 0.12 * index,
            ease: [0.22, 1, 0.36, 1] as const,
          },
        };

  return (
    <section className="hero relative overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40">
      {/* Halo golden-hour en lente dérive */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(201,138,60,.28) 0%, rgba(201,138,60,.08) 45%, transparent 70%)",
        }}
        animate={reduceMotion ? undefined : { x: [-40, 40, -40], y: [-20, 24, -20] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 18, repeat: Infinity, ease: "easeInOut" }
        }
      />

      <div className="relative mx-auto max-w-container px-5 md:px-7">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div {...cascade(0)} className="flex justify-center">
            <Eyebrow>Contenu clé en main · Occitanie</Eyebrow>
          </motion.div>

          <h1 className="mt-6 font-display text-[clamp(38px,6vw,76px)] font-normal leading-[1.04] tracking-[-0.01em]">
            <motion.span {...cascade(1)} className="block">
              Du contenu <em className="italic text-oxblood">prêt à publier</em>
            </motion.span>
            <motion.span {...cascade(2)} className="block">
              pour les lieux qu&apos;on a envie de visiter.
            </motion.span>
          </h1>

          <motion.p
            {...cascade(3)}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted"
          >
            Reels, photos et vidéos pensés pour vos réseaux. On vient, on filme,
            on monte — vous n&apos;avez plus qu&apos;à publier.
          </motion.p>

          <motion.div
            {...cascade(4)}
            className="mt-9 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="#contact"
              className="rounded-full bg-espresso px-7 py-3.5 text-sm font-semibold text-cream shadow-soft transition-transform hover:-translate-y-0.5"
            >
              Réserver un shooting
            </a>
            <a
              href="#realisations"
              className="text-sm font-semibold text-espresso underline decoration-line decoration-1 underline-offset-8 transition-colors hover:decoration-oxblood"
            >
              Voir des réalisations
            </a>
          </motion.div>

          <motion.p {...cascade(5)} className="mt-8 text-sm text-muted">
            Pour les restaurants, hôtels, logements insolites et lieux
            d&apos;activité qui veulent de belles images sans s&apos;engager.
          </motion.p>
        </div>

        {/* Bande de cartes verticales 9:16 — la signature de la page */}
        <div className="mt-16 grid grid-cols-2 gap-5 sm:grid-cols-3 md:mt-20 md:gap-7 lg:grid-cols-4">
          {heroCards.map((card, index) => (
            <motion.div
              key={card.label}
              className={card.className}
              initial={reduceMotion ? undefined : { opacity: 0, y: 32 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 0.9,
                      delay: 0.7 + index * 0.15,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
            >
              <ContentCard
                label={card.label}
                gradient={card.gradient}
                floatDelay={card.floatDelay}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

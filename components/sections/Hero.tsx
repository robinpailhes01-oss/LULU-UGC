"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Clock, Smartphone } from "lucide-react";
import ContentCard from "@/components/ui/ContentCard";

const heroCards = [
  {
    label: "Reel restaurant",
    gradient: "linear-gradient(160deg, #E8C495 0%, #C98A3C 55%, #8A3B33 100%)",
    rotate: -7,
    floatDelay: 0,
    showBadge: false,
    className: "z-10 w-[34%] max-w-[220px] sm:w-[26%]",
  },
  {
    label: "Logement insolite",
    gradient: "linear-gradient(200deg, #C98A3C 0%, #8A3B33 60%, #241D17 100%)",
    rotate: 0,
    floatDelay: 1.6,
    showBadge: true,
    className: "z-20 -mx-[4%] w-[38%] max-w-[250px] sm:w-[29%]",
  },
  {
    label: "Hôtel & spa",
    gradient: "linear-gradient(150deg, #F0D9B8 0%, #C98A3C 50%, #6B3F2E 100%)",
    rotate: 7,
    floatDelay: 3.1,
    showBadge: false,
    className: "z-10 w-[34%] max-w-[220px] sm:w-[26%]",
  },
];

const floatingChips = [
  {
    icon: BadgeCheck,
    label: "Prêt à publier",
    className: "left-[2%] top-[12%] sm:left-[8%]",
    delay: 1.4,
  },
  {
    icon: Clock,
    label: "Livré sous 7 jours",
    className: "right-[1%] top-[30%] sm:right-[6%]",
    delay: 1.7,
  },
  {
    icon: Smartphone,
    label: "9:16 + 4:5",
    className: "bottom-[18%] left-[1%] sm:left-[5%]",
    delay: 2,
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
    <section className="hero relative overflow-hidden pt-32 md:pt-40">
      {/* Halo golden-hour en lente dérive */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/4 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
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
          {/* Badge pill avec pastilles empilées — sans faux chiffres */}
          <motion.div {...cascade(0)} className="flex justify-center">
            <p className="flex items-center gap-2.5 rounded-full border border-line bg-cream/80 py-1.5 pl-2 pr-4 text-xs font-semibold text-muted shadow-soft backdrop-blur-sm">
              <span className="flex -space-x-1.5" aria-hidden="true">
                <span className="h-5 w-5 rounded-full border-2 border-cream bg-[linear-gradient(140deg,#E8C495,#C98A3C)]" />
                <span className="h-5 w-5 rounded-full border-2 border-cream bg-[linear-gradient(140deg,#C98A3C,#8A3B33)]" />
                <span className="h-5 w-5 rounded-full border-2 border-cream bg-[linear-gradient(140deg,#8A3B33,#241D17)]" />
              </span>
              Contenu clé en main · Occitanie
            </p>
          </motion.div>

          <h1 className="mt-7 font-display text-[clamp(38px,6vw,76px)] font-normal leading-[1.04] tracking-[-0.01em]">
            <motion.span {...cascade(1)} className="block">
              On filme votre lieu.
            </motion.span>
            <motion.span {...cascade(2)} className="block">
              Vous n&apos;avez{" "}
              <em className="italic text-oxblood">plus qu&apos;à publier</em>.
            </motion.span>
          </h1>

          <motion.p
            {...cascade(3)}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted"
          >
            Reels, photos et vidéos pensés pour vos réseaux. On vient, on filme,
            on monte — du contenu prêt à poster, sans abonnement.
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
        </div>

        {/* Scène façon Nevra : arc sombre derrière les cartes qui se chevauchent */}
        <div className="relative mt-14 md:mt-20">
          {/* Arc espresso */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 mx-auto h-[78%] max-w-[920px] rounded-t-[999px] bg-espresso"
            initial={reduceMotion ? undefined : { opacity: 0, y: 40 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 1, delay: 0.55, ease: [0.22, 1, 0.36, 1] }
            }
          >
            {/* Lueur honey dans l'arc */}
            <div
              className="absolute inset-0 rounded-t-[999px]"
              style={{
                background:
                  "radial-gradient(ellipse 70% 55% at 50% 100%, rgba(201,138,60,.35) 0%, transparent 65%)",
              }}
            />
          </motion.div>

          {/* Cartes 9:16 inclinées et chevauchées */}
          <div className="relative flex items-end justify-center px-2 pb-10 pt-6 sm:pb-14">
            {heroCards.map((card, index) => (
              <motion.div
                key={card.label}
                className={card.className}
                style={{ rotate: card.rotate }}
                initial={reduceMotion ? undefined : { opacity: 0, y: 46 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        duration: 0.9,
                        delay: 0.75 + index * 0.15,
                        ease: [0.22, 1, 0.36, 1],
                      }
                }
              >
                <ContentCard
                  label={card.label}
                  gradient={card.gradient}
                  floatDelay={card.floatDelay}
                  showBadge={card.showBadge}
                  className="border-4 border-cream sm:border-8"
                />
              </motion.div>
            ))}

            {/* Chips flottants — bénéfices réels, pas de faux compteurs */}
            {floatingChips.map((chip) => (
              <motion.p
                key={chip.label}
                className={`absolute z-30 hidden items-center gap-2 rounded-full bg-cream px-4 py-2 text-xs font-semibold text-espresso shadow-card sm:flex ${chip.className}`}
                initial={reduceMotion ? undefined : { opacity: 0, scale: 0.8 }}
                animate={
                  reduceMotion ? undefined : { opacity: 1, scale: 1, y: [0, -8, 0] }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: { duration: 0.5, delay: chip.delay },
                        scale: { duration: 0.5, delay: chip.delay },
                        y: {
                          duration: 6,
                          delay: chip.delay,
                          repeat: Infinity,
                          ease: "easeInOut",
                        },
                      }
                }
              >
                <chip.icon className="h-4 w-4 text-honey" aria-hidden="true" />
                {chip.label}
              </motion.p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

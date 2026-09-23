"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/*
   Hero « marquee » adapté de 21st.dev (hero-3) à l'image de marque June :
   texte centré en Fraunces, pastille ivoire, bouton filaire du site, et un
   défilé de vraies photos June légèrement inclinées en bas d'écran.
*/

interface AnimatedMarqueeHeroProps {
  tagline: string;
  title: React.ReactNode;
  description: string;
  ctaText: string;
  ctaHref?: string;
  images: string[];
  note?: string;
  className?: string;
}

const FADE = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 20 } },
} as const;

export const AnimatedMarqueeHero: React.FC<AnimatedMarqueeHeroProps> = ({ tagline, title, description, ctaText, ctaHref = "#contact", images, note, className }) => {
  const reduce = useReducedMotion();
  const strip = [...images, ...images];

  return (
    <section className={cn("relative flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden bg-ivory px-5 pb-[38svh] pt-28 text-center text-ink md:pb-[42svh]", className)}>
      <div className="z-10 flex max-w-4xl flex-col items-center">
        <motion.div initial="hidden" animate="show" variants={FADE} className="mb-6 inline-flex items-center gap-3 rounded-full border border-ink/15 bg-ivory/70 px-4 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-taupe backdrop-blur-sm">
          <span className="h-px w-5 bg-brown" />
          {tagline}
        </motion.div>

        <motion.h1 initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }} className="font-display text-[clamp(2.4rem,1.2rem+4.6vw,5.4rem)] leading-[1.02] tracking-[-0.015em] text-ink [font-variation-settings:'opsz'_144,'SOFT'_10]" style={{ fontWeight: 340 }}>
          {typeof title === "string"
            ? title.split(" ").map((word, i) => (
                <motion.span key={i} variants={FADE} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))
            : title}
        </motion.h1>

        <motion.p initial="hidden" animate="show" variants={FADE} transition={{ delay: 0.5 }} className="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-taupe md:text-lg">
          {description}
        </motion.p>

        <motion.div initial="hidden" animate="show" variants={FADE} transition={{ delay: 0.65 }} className="mt-9">
          <a href={ctaHref} className="btn btn--fill">
            {ctaText}
          </a>
        </motion.div>

        {note && (
          <motion.p initial="hidden" animate="show" variants={FADE} transition={{ delay: 0.8 }} className="mt-8 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-taupe/80">
            {note}
          </motion.p>
        )}
      </div>

      {/* défilé de photos */}
      <div className="absolute bottom-0 left-0 h-[34svh] w-full md:h-[38svh] [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <motion.div className="flex h-full items-center gap-5 px-3" animate={reduce ? undefined : { x: ["0%", "-50%"] }} transition={{ ease: "linear", duration: 60, repeat: Infinity }} style={{ width: "max-content" }}>
          {strip.map((src, i) => (
            <div key={i} className="relative aspect-[3/4] h-[62%] flex-shrink-0 md:h-[68%]" style={{ rotate: `${i % 2 === 0 ? -2.5 : 3}deg` }}>
              <img src={src} alt="" loading={i < 8 ? "eager" : "lazy"} className="!h-full !w-full rounded-[3px] object-cover shadow-[0_18px_40px_-18px_rgba(33,28,24,0.45)]" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AnimatedMarqueeHero;

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Play } from "lucide-react";

export type ContentCardProps = {
  label: string;
  gradient: string;
  /** Seconds of offset so cards float out of sync. */
  floatDelay?: number;
  showBadge?: boolean;
  className?: string;
};

/**
 * Carte verticale 9:16 façon reel — la signature de la page.
 * Placeholders en dégradés chauds tant qu'il n'y a pas de vrais médias.
 */
export default function ContentCard({
  label,
  gradient,
  floatDelay = 0,
  showBadge = true,
  className = "",
}: ContentCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.figure
      className={`group relative aspect-[9/16] overflow-hidden rounded-[20px] shadow-card ${className}`}
      style={{ background: gradient }}
      animate={reduceMotion ? undefined : { y: [0, -14, 0] }}
      transition={
        reduceMotion
          ? undefined
          : {
              duration: 8,
              delay: floatDelay,
              repeat: Infinity,
              ease: "easeInOut",
            }
      }
      whileHover={reduceMotion ? undefined : { scale: 1.02, y: -6 }}
    >
      {showBadge && (
        <span className="absolute left-3 top-3 rounded-full bg-cream/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-espresso">
          Prêt à publier
        </span>
      )}

      <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream/85 text-espresso transition-transform duration-300 group-hover:scale-110">
        <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
      </span>

      <div
        className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-espresso/70 to-transparent"
        aria-hidden="true"
      />
      <figcaption className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-cream">
        {label}
      </figcaption>
    </motion.figure>
  );
}

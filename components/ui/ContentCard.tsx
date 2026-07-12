"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Play } from "lucide-react";

export type ContentCardProps = {
  label: string;
  gradient: string;
  /** Vrai média (chemin sous public/) ; le dégradé reste en fallback. */
  src?: string;
  /** Lien externe (reel Instagram…) : toute la carte devient cliquable. */
  href?: string;
  /** Seconds of offset so cards float out of sync. */
  floatDelay?: number;
  showBadge?: boolean;
  /** Masquer le bouton play pour les contenus photo. */
  showPlay?: boolean;
  /** Masquer le libellé (quand le nom du lieu est déjà affiché à côté). */
  showLabel?: boolean;
  className?: string;
};

/**
 * Carte verticale 9:16 façon reel — la signature de la page.
 * Placeholders en dégradés chauds tant qu'il n'y a pas de vrais médias.
 */
export default function ContentCard({
  label,
  gradient,
  src,
  href,
  floatDelay = 0,
  showBadge = true,
  showPlay = true,
  showLabel = true,
  className = "",
}: ContentCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.figure
      className={`group relative aspect-[9/16] overflow-hidden rounded-[20px] shadow-card ${className}`}
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
      {/* Média en calque séparé : zoom lent au survol, sans déborder du cadre */}
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.07]"
        style={{
          background: src
            ? `url('${src}') center / cover no-repeat, ${gradient}`
            : gradient,
        }}
      />

      {showBadge && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-cream/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-espresso">
          Prêt à publier
        </span>
      )}

      {showPlay && (
        <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream/85 text-espresso transition-transform duration-300 group-hover:scale-110">
          <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
        </span>
      )}

      {showLabel && (
        <>
          <div
            className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-espresso/70 to-transparent"
            aria-hidden="true"
          />
          <figcaption className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-cream">
            {label}
          </figcaption>
        </>
      )}

      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-20 rounded-[20px]"
          aria-label={`Voir sur Instagram : ${label}`}
        />
      )}
    </motion.figure>
  );
}

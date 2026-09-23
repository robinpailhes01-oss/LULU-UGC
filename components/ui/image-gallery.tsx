"use client";

import { ArrowUpRight } from "lucide-react";
import type { Work } from "@/lib/work";
import { cn } from "@/lib/utils";

/*
   Galerie adaptée de 21st.dev (image-gallery) : une rangée qui s'ouvre au
   survol sur ordinateur, puis une grille avec légende au survol. Typo et
   couleurs June, vraies réalisations.
*/
const CAT: Record<string, string> = { Tourisme: "Tourism", Hébergement: "Hospitality", "Bien-être": "Wellness", "Restaurant & bar": "Food & Lifestyle" };

export default function ImageGallery({ works, label, title, sub }: { works: Work[]; label: string; title: string; sub: string }) {
  const row = works.slice(0, 6);
  const rest = works.slice(6);
  const Tile = ({ w, className }: { w: Work; className?: string }) => {
    const Tag = w.href ? "a" : "div";
    return (
      <Tag href={w.href} target={w.href ? "_blank" : undefined} rel={w.href ? "noopener noreferrer" : undefined} className={cn("group relative block overflow-hidden rounded-[3px] bg-sand", className)}>
        <img src={w.image} alt={`${w.nom} : ${w.univers}, ${w.type}`} width={w.w} height={w.h} loading="lazy" className="!h-full !w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" style={{ objectPosition: w.pos ?? "50% 40%" }} />
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/70 via-ink/10 to-transparent p-4 text-ivory opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em]">{w.nom}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[0.78rem] text-ivory/80">
            {CAT[w.univers] ?? w.univers} • {w.type}
            {w.href && <ArrowUpRight className="size-3.5" />}
          </p>
        </div>
      </Tag>
    );
  };

  return (
    <section className="bg-ivory px-5 py-24 md:py-32" id="travail" aria-label="Mon travail">
      <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
        <p className="k">{label}</p>
        <h2 className="mt-4 font-display text-[clamp(2rem,1.1rem+2.9vw,3.6rem)] leading-[1.04] text-ink [font-variation-settings:'opsz'_144,'SOFT'_10]" style={{ fontWeight: 340 }}>
          {title}
        </h2>
        <p className="mt-4 max-w-md text-taupe">{sub}</p>
      </div>

      {/* rangée qui s'ouvre au survol (ordinateur) */}
      <div className="mx-auto mt-14 hidden h-[460px] max-w-6xl items-stretch gap-2 md:flex">
        {row.map((w) => (
          <Tile key={w.nom} w={w} className="h-full w-40 flex-grow transition-[width] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:w-full" />
        ))}
      </div>

      {/* grille : tout sur téléphone, le reste sur ordinateur */}
      <div className="mx-auto mt-4 grid max-w-6xl grid-cols-2 gap-2 md:mt-2 md:grid-cols-4 md:gap-3">
        {row.map((w) => (
          <Tile key={w.nom} w={w} className="aspect-[3/4] md:hidden" />
        ))}
        {rest.map((w) => (
          <Tile key={w.nom} w={w} className="aspect-[3/4]" />
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <a href="/portfolio" className="btn">
          Voir toutes les expériences
        </a>
      </div>
    </section>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Avis } from "@/lib/avis";

/*
   Avis en éventail, adapté de 21st.dev (stagger-testimonials) : cartes à
   coin coupé, la carte centrale en brun presque noir, les autres ivoire.
*/
const SQRT_5000 = Math.sqrt(5000);

function Card({ position, avis, onMove, size }: { position: number; avis: Avis; onMove: (n: number) => void; size: number }) {
  const center = position === 0;
  return (
    <div
      onClick={() => onMove(position)}
      className={cn("absolute left-1/2 top-1/2 cursor-pointer border p-7 transition-all duration-500 ease-in-out sm:p-8", center ? "z-10 border-ink bg-ink text-ivory" : "z-0 border-ink/15 bg-ivory text-ink hover:border-brown/60")}
      style={{
        width: size,
        height: size,
        clipPath: "polygon(44px 0%, calc(100% - 44px) 0%, 100% 44px, 100% 100%, calc(100% - 44px) 100%, 44px 100%, 0 100%, 0 0)",
        transform: `translate(-50%, -50%) translateX(${(size / 1.5) * position}px) translateY(${center ? -60 : position % 2 ? 14 : -14}px) rotate(${center ? 0 : position % 2 ? 2.5 : -2.5}deg)`,
        boxShadow: center ? "0 30px 60px -30px rgba(33,28,24,0.6)" : "none",
      }}
    >
      <span className={cn("absolute block origin-top-right rotate-45", center ? "bg-ink" : "bg-ink/15")} style={{ right: -1, top: 43, width: SQRT_5000, height: 1 }} />
      <img src={avis.image} alt="" className="mb-4 h-14 w-12 object-cover object-top" />
      {avis.placeholder && <span className={cn("mb-2 inline-block text-[0.58rem] font-semibold uppercase tracking-[0.22em]", center ? "text-ivory/60" : "text-taupe")}>Exemple à remplacer</span>}
      <p className="font-display text-[1.05rem] leading-snug sm:text-[1.25rem] [font-variation-settings:'opsz'_144,'SOFT'_10]" style={{ fontWeight: 360 }}>
        « {avis.texte} »
      </p>
      <p className={cn("absolute bottom-7 left-7 right-7 text-[0.8rem] italic sm:bottom-8 sm:left-8 sm:right-8", center ? "text-ivory/75" : "text-taupe")}>— {avis.par}</p>
    </div>
  );
}

export function StaggerTestimonials({ items, label, title }: { items: Avis[]; label: string; title: string }) {
  const [size, setSize] = useState(360);
  const [list, setList] = useState(items);

  const move = (steps: number) => {
    const next = [...list];
    if (steps > 0) for (let i = steps; i > 0; i--) { const it = next.shift(); if (!it) return; next.push({ ...it, id: Math.random() }); }
    else for (let i = steps; i < 0; i++) { const it = next.pop(); if (!it) return; next.unshift({ ...it, id: Math.random() }); }
    setList(next);
  };

  useEffect(() => {
    const update = () => setSize(matchMedia("(min-width: 640px)").matches ? 360 : 280);
    update();
    addEventListener("resize", update);
    return () => removeEventListener("resize", update);
  }, []);

  return (
    <section className="bg-sand pt-24 md:pt-32" aria-label="Avis">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-5 text-center">
        <p className="k">{label}</p>
        <h2 className="mt-4 font-display text-[clamp(2rem,1.1rem+2.9vw,3.6rem)] leading-[1.04] text-ink [font-variation-settings:'opsz'_144,'SOFT'_10]" style={{ fontWeight: 340 }}>
          {title}
        </h2>
      </div>
      <div className="relative w-full overflow-hidden" style={{ height: 600 }}>
        {list.map((avis, i) => {
          const position = list.length % 2 ? i - (list.length + 1) / 2 : i - list.length / 2;
          return <Card key={avis.id} avis={avis} onMove={move} position={position} size={size} />;
        })}
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          <button onClick={() => move(-1)} className="flex size-12 items-center justify-center border border-ink/25 bg-ivory text-ink transition-colors hover:bg-ink hover:text-ivory" aria-label="Avis précédent">
            <ChevronLeft className="size-5" />
          </button>
          <button onClick={() => move(1)} className="flex size-12 items-center justify-center border border-ink/25 bg-ivory text-ink transition-colors hover:bg-ink hover:text-ivory" aria-label="Avis suivant">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default StaggerTestimonials;

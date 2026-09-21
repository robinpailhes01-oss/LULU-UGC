"use client";

import { useEffect, useRef } from "react";
import type React from "react";

export type Step = { n: string; title: string; text: string[]; image: string; pos?: string; alt: string };

/**
 * La méthode : grande image à gauche qui change discrètement selon l'étape
 * visible à droite. Sur téléphone, chaque étape garde sa propre image.
 */
export default function MethodSteps({ steps }: { steps: Step[] }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>(".mstep"));
    const pics = Array.from(el.querySelectorAll<HTMLElement>(".mpic"));
    const set = (i: number) => {
      pics.forEach((p, j) => p.classList.toggle("is-on", j === i));
      items.forEach((s, j) => s.classList.toggle("is-on", j === i));
    };
    set(0);
    const io = new IntersectionObserver(
      (entries) => {
        const best = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (best) set(items.indexOf(best.target as HTMLElement));
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    items.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <div className="method" ref={root}>
      <div className="method__media">
        <div className="plate plate--photo method__stack" data-dev>
          {steps.map((s, i) => (
            <img key={s.n} className="mpic" src={s.image} alt={s.alt} width={1080} height={1350} loading={i === 0 ? "eager" : "lazy"} style={s.pos ? ({ "--pos": s.pos } as React.CSSProperties) : undefined} />
          ))}
        </div>
      </div>
      <ol className="method__list">
        {steps.map((s, i) => (
          <li className="mstep rv" style={{ "--rd": `${i * 80}ms` } as React.CSSProperties} key={s.n}>
            <figure className="plate plate--photo mstep__pic" data-dev>
              <img src={s.image} alt="" width={1080} height={1350} loading="lazy" style={s.pos ? ({ "--pos": s.pos } as React.CSSProperties) : undefined} />
            </figure>
            <p className="mstep__n">{s.n}</p>
            <h3 className="d">{s.title}</h3>
            {s.text.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </li>
        ))}
      </ol>
    </div>
  );
}

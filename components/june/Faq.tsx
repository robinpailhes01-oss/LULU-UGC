"use client";

import { useState } from "react";

/** Accordéon numéroté, sans bordure, croix qui tourne. Hauteur animée par grid. */
export default function Faq({ items }: { items: Array<[string, string[]]> }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="acc">
      {items.map(([q, a], i) => {
        const on = open === i;
        return (
          <div className={on ? "acc__it is-open" : "acc__it"} key={q}>
            <button type="button" className="acc__q" aria-expanded={on} aria-controls={`acc-p-${i}`} id={`acc-b-${i}`} onClick={() => setOpen(on ? null : i)}>
              <span className="acc__n">0{i + 1}</span>
              <span className="acc__t">{q}</span>
              <span className="acc__x" aria-hidden="true" />
            </button>
            <div className="acc__p" id={`acc-p-${i}`} role="region" aria-labelledby={`acc-b-${i}`}>
              <div className="acc__pi">
                {a.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

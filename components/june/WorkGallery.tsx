"use client";

import { useState } from "react";
import type React from "react";
import { UNIVERS, type Univers, type Work } from "@/lib/work";

/**
 * Galerie des réalisations : une pièce mise en avant en grand, des filtres par
 * univers, puis une grille. Les vidéos se lancent au survol (ordinateur) ou
 * au scroll (téléphone) via JuneV3Engine ; le filtrage masque sans démonter,
 * pour garder les écouteurs vidéo.
 */
export default function WorkGallery({ works, featured = false, all = false }: { works: Work[]; featured?: boolean; all?: boolean }) {
  const [filter, setFilter] = useState<Univers | "Tout">("Tout");
  const feat = featured ? works.find((w) => w.feature) : undefined;
  const rest = works.filter((w) => w !== feat);
  const count = (u: Univers | "Tout") => (u === "Tout" ? rest.length : rest.filter((w) => w.univers === u).length);

  return (
    <div className="gal">
      {feat && (
        <a className="gal__feat rv" href={feat.href ?? "/portfolio"} target={feat.href ? "_blank" : undefined} rel={feat.href ? "noopener noreferrer" : undefined} data-hover-host>
          <figure className="plate plate--cinema" data-dev>
            <Media w={feat} eager />
          </figure>
          <span className="gal__featcap">
            <span className="k">{feat.univers} • {feat.type}</span>
            <b className="d">{feat.nom}</b>
            <span className="gal__cta">{feat.href ? "Voir sur Instagram" : "Voir la série"}</span>
          </span>
        </a>
      )}

      <div className="chips rv" role="tablist" aria-label="Filtrer par univers">
        {(["Tout", ...UNIVERS] as const).map((u) => (
          <button key={u} type="button" role="tab" aria-selected={filter === u} className={filter === u ? "chip is-on" : "chip"} onClick={() => setFilter(u)}>
            {u} <i>{count(u)}</i>
          </button>
        ))}
      </div>

      <div className={all ? "wk wk--all" : "wk"}>
        {rest.map((wk, i) => {
          const hidden = filter !== "Tout" && wk.univers !== filter;
          const inner = (
            <>
              <figure className={wk.large ? "plate plate--wide" : "plate"} data-dev>
                <Media w={wk} />
                {wk.vues && (
                  <span className="plate__vues">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {wk.vues} vues
                  </span>
                )}
                {wk.video && <span className="plate__play" aria-hidden="true" />}
              </figure>
              <span className="wk__cap">
                <b>{wk.nom}</b>
                <span>
                  {wk.univers} • {wk.type}
                </span>
              </span>
            </>
          );
          const style = { "--rd": `${(i % 3) * 80}ms` } as React.CSSProperties;
          return wk.href ? (
            <a className="wk__it rv" style={style} href={wk.href} target="_blank" rel="noopener noreferrer" key={wk.nom} data-hover-host hidden={hidden}>
              {inner}
            </a>
          ) : (
            <div className="wk__it rv" style={style} key={wk.nom} data-hover-host hidden={hidden}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Media({ w, eager }: { w: Work; eager?: boolean }) {
  const pos = w.pos ? ({ "--pos": w.pos } as React.CSSProperties) : undefined;
  return (
    <>
      <img src={w.image} alt={`${w.nom} : ${w.univers}, ${w.type}`} width={w.w} height={w.h} loading={eager ? "eager" : "lazy"} style={pos} />
      {w.video && (
        <video data-auto="hover" muted loop playsInline preload="none" poster={w.image} aria-hidden="true" style={pos}>
          <source src={w.video} type="video/mp4" />
        </video>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import type React from "react";
import ProjectCard from "@/components/june/ProjectCard";
import { CATEGORIES, type Categorie, type Projet } from "@/lib/projets";

/** Portfolio regroupé par projet, filtres par catégorie (masquage sans démontage pour garder les vidéos). */
export default function Portfolio({ projets }: { projets: Projet[] }) {
  const [filter, setFilter] = useState<Categorie | "all">("all");
  const count = (c: Categorie | "all") => (c === "all" ? projets.length : projets.filter((p) => p.categorie === c).length);
  return (
    <section className="light pfl" aria-label="Tous les projets">
      <div className="wrap">
        <div className="chips rv" role="tablist" aria-label="Filtrer par catégorie">
          {(["all", ...CATEGORIES] as const).map((c) => (
            <button key={c} type="button" role="tab" aria-selected={filter === c} className={filter === c ? "chip is-on" : "chip"} onClick={() => setFilter(c)}>
              {c === "all" ? "All projects" : c} <i>{count(c)}</i>
            </button>
          ))}
        </div>
        {projets.map((p, i) => {
          const hidden = filter !== "all" && p.categorie !== filter;
          const all = [p.cover, ...p.medias];
          return (
            <article className="proj" id={p.slug} key={p.slug} hidden={hidden} style={{ "--rd": `${(i % 2) * 80}ms` } as React.CSSProperties}>
              <header className="proj__head rv">
                <div>
                  <p className="k">
                    {p.categorie} · {p.sousCategorie}
                    {p.lieu && ` · ${p.lieu}`}
                  </p>
                  <h2 className="d h2">{p.titre}</h2>
                </div>
                <p className="proj__desc">{p.description}</p>
              </header>
              <div className={all.length > 1 ? "proj__grid" : "proj__grid proj__grid--one"}>
                {all.map((m, j) => (
                  <div className="rv" style={{ "--rd": `${(j % 4) * 70}ms` } as React.CSSProperties} key={m.image}>
                    <ProjectCard m={m} className={j === 0 && all.length > 1 ? "pc--lead" : ""} />
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

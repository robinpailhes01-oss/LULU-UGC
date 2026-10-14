import type React from "react";
import ProjectCard from "@/components/june/ProjectCard";
import type { Projet } from "@/lib/projets";

/*
   Galerie éditoriale de l'accueil : sept vrais médias aux formats variés,
   composés en grille asymétrique (large, vertical, carré), chacun relié à
   son projet dans le portfolio.
*/
const RATIOS = ["4 / 5", "9 / 16", "1 / 1", "16 / 10", "9 / 16", "4 / 5", "1 / 1"];

export default function Mosaic({ projets }: { projets: Projet[] }) {
  const items = projets.flatMap((p) => [p.cover, ...p.medias].map((m) => ({ m, p })));
  const pick = [
    items.find((i) => i.p.slug === "hotel-spa" && i.m.image.includes("piscine-ext")),
    items.find((i) => i.p.slug === "gite-de-l-abric"),
    items.find((i) => i.p.slug === "beltra-physical-therapy"),
    items.find((i) => i.p.slug === "harmonie-yacht" && i.m.image.includes("harmonie-yacht-shooting")),
    items.find((i) => i.p.slug === "sejour-vecu-hotel"),
    items.find((i) => i.p.slug === "hotel-spa" && i.m.image.includes("moment-a-deux")),
    items.find((i) => i.p.slug === "una-mas"),
  ].filter(Boolean) as typeof items;
  return (
    <div className="mosaic-ed">
      {pick.map(({ m, p }, i) => (
        <div className={`mosaic-ed__it mosaic-ed__it--${i + 1} rv`} style={{ "--rd": `${(i % 3) * 90}ms` } as React.CSSProperties} key={m.image}>
          <ProjectCard m={m} href={`/realisations#${p.slug}`} ratio={RATIOS[i]} titre={p.titre} />
          <span className="mosaic-ed__cat">{p.sousCategorie}</span>
        </div>
      ))}
    </div>
  );
}

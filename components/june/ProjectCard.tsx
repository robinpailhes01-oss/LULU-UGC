import type React from "react";
import type { Media as M } from "@/lib/projets";

/** Vignette d'un média de projet : image, vidéo au survol, badge de vues, lien Instagram. */
export default function ProjectCard({ m, titre, href, className = "", ratio }: { m: M; titre?: string; href?: string; className?: string; ratio?: string }) {
  const link = href ?? m.href;
  const external = link?.startsWith("http");
  const Tag = link ? "a" : "div";
  const style = { ...(m.pos ? { "--pos": m.pos } : {}), ...(ratio ? { "--ratio": ratio } : {}) } as React.CSSProperties;
  return (
    <Tag className={`pc ${className}`.trim()} href={link} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} data-hover-host>
      <figure className="plate pc__plate" data-dev style={style}>
        <img src={m.image} alt={m.alt} width={m.w} height={m.h} loading="lazy" decoding="async" style={m.pos ? ({ "--pos": m.pos } as React.CSSProperties) : undefined} />
        {m.video && (
          <video data-auto="hover" muted loop playsInline preload="none" poster={m.image} aria-hidden="true" style={m.pos ? ({ "--pos": m.pos } as React.CSSProperties) : undefined}>
            <source src={m.video} type="video/mp4" />
          </video>
        )}
        {m.vues && (
          <span className="plate__vues">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {m.vues} vues
          </span>
        )}
        {m.video && <span className="plate__play" aria-hidden="true" />}
      </figure>
      {titre && (
        <span className="pc__cap">
          <b>{titre}</b>
        </span>
      )}
    </Tag>
  );
}

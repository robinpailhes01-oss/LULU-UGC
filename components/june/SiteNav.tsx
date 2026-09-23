"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { CTA, NAV, NAV_MOBILE } from "@/lib/site";

/**
 * Barre de navigation commune. Sur ordinateur : cinq liens et un bouton.
 * Sur téléphone : un menu plein écran brun très foncé, typographie crème.
 */
export default function SiteNav({ home = true }: { home?: boolean }) {
  const [open, setOpen] = useState(false);
  const p = home ? "" : "/";
  const href = (h: string) => (h === "#top" ? (home ? "#top" : "/") : `${p}${h}`);

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      document.body.classList.remove("menu-open");
    };
  }, [open]);

  return (
    <>
      <header className="nav" id="nav">
        <a className="mark" href={home ? "#top" : "/"} aria-label="June, retour à l'accueil">
          <b>June</b>
          <small>Content Studio</small>
        </a>
        <nav className="nav__links" aria-label="Navigation">
          {NAV.map(([label, h]) => (
            <a key={h} href={href(h)} className="lnk">
              <span data-text={label}>{label}</span>
            </a>
          ))}
        </nav>
        <a className="btn nav__cta" href={href("#contact")}>
          {CTA}
        </a>
        <button type="button" className="nav__burger" aria-expanded={open} aria-controls="menu" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOpen((o) => !o)}>
          <span />
          <span />
        </button>
      </header>

      <div className={open ? "menu is-open" : "menu"} id="menu" aria-hidden={!open}>
        <nav className="menu__links" aria-label="Menu">
          {NAV_MOBILE.map(([label, h], i) => (
            <a key={h} href={href(h)} style={{ "--i": i } as React.CSSProperties} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
        <a className="btn btn--fill menu__cta" href={href("#contact")} onClick={() => setOpen(false)}>
          {CTA}
        </a>
        <p className="menu__place">Montpellier • Alpe d&apos;Huez</p>
      </div>
    </>
  );
}

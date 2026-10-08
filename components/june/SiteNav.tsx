"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { CTA, CTA_HREF, LIEUX, NAV, NAV_MOBILE } from "@/lib/site";

/** Barre de navigation commune : quatre liens et un bouton ; menu plein écran sur téléphone. */
export default function SiteNav() {
  const [open, setOpen] = useState(false);

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
        <a className="mark" href="/" aria-label="June Content Studio, retour à l'accueil">
          <b>June</b>
          <small>Content Studio</small>
        </a>
        <nav className="nav__links" aria-label="Navigation principale">
          {NAV.map(([label, h]) => (
            <a key={h} href={h} className="lnk">
              <span data-text={label}>{label}</span>
            </a>
          ))}
        </nav>
        <a className="btn btn--up nav__cta" href={CTA_HREF}>
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
            <a key={h} href={h} style={{ "--i": i } as React.CSSProperties} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
              {label}
            </a>
          ))}
        </nav>
        <a className="btn btn--fill btn--up menu__cta" href={CTA_HREF} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
          {CTA}
        </a>
        <p className="menu__place">{LIEUX}</p>
      </div>
    </>
  );
}

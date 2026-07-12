"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/#prestations", label: "Prestations" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/#a-propos", label: "À propos" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-line bg-limestone/90 backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-container items-center justify-between px-5 md:px-7">
        <a
          href="#"
          className="font-display text-xl tracking-tight text-espresso"
          aria-label="Divine — retour en haut de page"
        >
          Divine<span className="text-chestnut">.</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navigation principale">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative text-sm font-medium text-muted transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-espresso after:transition-transform after:duration-300 hover:text-espresso hover:after:origin-left hover:after:scale-x-100"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/#contact"
            className="rounded-full bg-espresso px-5 py-2.5 text-sm font-semibold text-cream shadow-soft transition-transform hover:-translate-y-0.5"
          >
            Réserver un shooting
          </a>
        </nav>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center text-espresso md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav
          className="border-b border-line bg-limestone px-5 pb-6 pt-2 md:hidden"
          aria-label="Navigation mobile"
        >
          <ul className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block py-1 text-base font-medium text-espresso"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/#contact"
                className="mt-1 inline-block rounded-full bg-espresso px-5 py-2.5 text-sm font-semibold text-cream"
                onClick={() => setMenuOpen(false)}
              >
                Réserver un shooting
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

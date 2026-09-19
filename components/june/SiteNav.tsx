import { CTA } from "@/lib/site";

/** Barre de navigation commune à l'accueil et aux réalisations. */
export default function SiteNav({ home = true }: { home?: boolean }) {
  const p = home ? "" : "/";
  return (
    <header className="nav nav--hero" id="nav">
      <a className="mark" href={home ? "#top" : "/"} aria-label="June, retour à l'accueil">
        <b>June</b>
        <small>Content Studio</small>
      </a>
      <nav className="nav__links" aria-label="Navigation">
        <a href={`${p}#comment`}>Comment ça se passe</a>
        <a href={home ? "#realisations" : "/portfolio"}>Réalisations</a>
        <a href={`${p}#ludivine`}>Ludivine</a>
        <a href={`${p}#contact`}>Contact</a>
      </nav>
      <a className="btn" href={`${p}#contact`}>
        <span className="l">{CTA}</span>
        <span className="s">Mon projet</span>
      </a>
    </header>
  );
}

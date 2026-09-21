import { CONTACT_EMAIL, INSTAGRAM_URL, LINKEDIN_URL, NAV_MOBILE, TIKTOK_URL } from "@/lib/site";

/** Pied de page commun, brun très foncé. */
export default function SiteFooter({ home = true }: { home?: boolean }) {
  const p = home ? "" : "/";
  const socials = [
    ["Instagram", INSTAGRAM_URL],
    ["TikTok", TIKTOK_URL],
    ["LinkedIn", LINKEDIN_URL],
  ].filter(([, url]) => url);
  return (
    <footer className="foot night" data-dark>
      <div className="wrap foot__grid">
        <a className="mark" href={home ? "#top" : "/"} aria-label="June Content Studio">
          <b>June</b>
          <small>Content Studio</small>
        </a>
        <nav className="foot__nav" aria-label="Plan du site">
          {NAV_MOBILE.map(([label, h]) => (
            <a key={h} href={h === "#top" ? (home ? "#top" : "/") : `${p}${h}`}>
              {label}
            </a>
          ))}
          <a href="/portfolio">Réalisations</a>
        </nav>
        <nav className="foot__social" aria-label="Réseaux">
          {socials.map(([label, url]) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          ))}
          <a href={`mailto:${CONTACT_EMAIL}`}>Email</a>
        </nav>
        <p className="foot__place">Montpellier • France • Alpe d&apos;Huez 26/27</p>
      </div>
    </footer>
  );
}

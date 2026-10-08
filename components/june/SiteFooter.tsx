import { CONTACT_EMAIL, INSTAGRAM_URL, LIEUX, LINKEDIN_URL, NAV_MOBILE, SIGNATURE, TIKTOK_URL } from "@/lib/site";

/** Pied de page commun, espresso. Contact direct visible. */
export default function SiteFooter() {
  const socials = [
    ["Instagram", INSTAGRAM_URL],
    ["TikTok", TIKTOK_URL],
    ["LinkedIn", LINKEDIN_URL],
  ].filter(([, url]) => url);
  return (
    <footer className="foot night" data-dark>
      <div className="wrap foot__grid">
        <div className="foot__brand">
          <a className="mark" href="/" aria-label="June Content Studio">
            <b>June</b>
            <small>Content Studio</small>
          </a>
          <p className="foot__sig">{SIGNATURE}</p>
        </div>
        <nav className="foot__nav" aria-label="Plan du site">
          {NAV_MOBILE.map(([label, h]) => (
            <a key={h} href={h} className="lnk">
              <span data-text={label}>{label}</span>
            </a>
          ))}
        </nav>
        <nav className="foot__social" aria-label="Contact direct">
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          {socials.map(([label, url]) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          ))}
        </nav>
        <p className="foot__place">
          <span>{LIEUX}</span>
          <a href="/confidentialite">Politique de confidentialité</a>
        </p>
      </div>
    </footer>
  );
}

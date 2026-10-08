import type { Metadata } from "next";
import type React from "react";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import SiteNav from "@/components/june/SiteNav";
import SiteFooter from "@/components/june/SiteFooter";
import Split from "@/components/june/Split";
import { OFFRES } from "@/lib/offres";
import { PRICE_CTA, PRICE_HIDDEN_TEXT, priceLabel } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services · création de contenu hôtel, hébergement et expériences",
  description: "Trois façons de collaborer avec June Content Studio : Experience Content Day, The Experience Stay et Experience Coverage. Création de contenu photo et vidéo pour hôtels, hébergements touristiques, spas, restaurants et événements.",
  alternates: { canonical: `${SITE_URL}/services` },
};

const rv = (ms: number) => ({ "--rd": `${ms}ms` }) as React.CSSProperties;

export default function ServicesPage() {
  return (
    <>
      <JuneV3Engine />
      <SiteNav />
      <main id="top">
        <section className="pf light" aria-label="Services">
          <div className="wrap pf__inner">
            <p className="k rv">Services</p>
            <Split as="h1" className="d h1" delay={80}>
              Trois façons de collaborer <em>avec June.</em>
            </Split>
            <p className="pf__lede rv" style={rv(160)}>Chaque offre possède un cadre clair. La durée, les livrables et les options s&apos;adaptent ensuite à votre établissement et à votre projet.</p>
          </div>
        </section>

        {OFFRES.map((o, i) => {
          const price = priceLabel(o.slug);
          return (
            <section className={i % 2 ? "offer sand" : "offer light"} id={o.slug} key={o.slug} aria-label={o.nom}>
              <div className={i % 2 ? "wrap offer__grid offer__grid--flip" : "wrap offer__grid"}>
                <figure className="offer__media plate plate--photo rv rv--mask" data-dev>
                  <img src={o.image} alt={o.alt} width={1080} height={1350} loading="lazy" decoding="async" style={{ "--pos": o.pos } as React.CSSProperties} />
                </figure>
                <div className="offer__copy">
                  <p className="k rv">
                    0{i + 1} — {o.categorie}
                  </p>
                  <Split as="h2" className="d h2" delay={80}>
                    {o.nom}
                  </Split>
                  <p className="offer__sub rv" style={rv(140)}>{o.sousTitre}</p>
                  <p className="ed rv" style={rv(200)}>{o.pour}</p>
                  <div className="offer__format rv" style={rv(260)}>
                    <p className="k">Format de référence</p>
                    <ul>
                      {o.format.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    <p className="offer__note">Les livrables sont adaptables selon le projet.</p>
                  </div>
                  <div className="offer__foot rv" style={rv(320)}>
                    <p className="offer__price">{price ?? PRICE_HIDDEN_TEXT}</p>
                    <a className="btn btn--fill btn--up" href={`/contact?prestation=${encodeURIComponent(o.nom)}`}>
                      {PRICE_CTA}
                    </a>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        <section className="light" aria-label="Vous hésitez ?">
          <div className="wrap pf__end">
            <p className="k rv">Vous hésitez entre deux offres ?</p>
            <Split as="h2" className="d h2" delay={80}>
              On commence simplement <em>par parler de votre projet.</em>
            </Split>
            <a className="btn btn--up rv" style={rv(160)} href="/contact?prestation=Je%20souhaite%20%C3%AAtre%20conseill%C3%A9e">
              Je souhaite être conseillée
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

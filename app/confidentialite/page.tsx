import type { Metadata } from "next";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import SiteNav from "@/components/june/SiteNav";
import SiteFooter from "@/components/june/SiteFooter";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: `Comment ${SITE_NAME} utilise les informations transmises via le formulaire de contact.`,
  alternates: { canonical: `${SITE_URL}/confidentialite` },
  robots: { index: false, follow: true },
};

export default function ConfidentialitePage() {
  return (
    <>
      <JuneV3Engine />
      <SiteNav />
      <main id="top">
        <section className="pf light" aria-label="Politique de confidentialité">
          <div className="wrap legal">
            <p className="k">Politique de confidentialité</p>
            <h1 className="d h2">Vos informations, et ce que j&apos;en fais.</h1>
            <h2>Données collectées</h2>
            <p>Le formulaire « Start a project » recueille votre nom et prénom, votre email, le nom de votre établissement, votre site ou compte Instagram (facultatif), la prestation souhaitée, la période envisagée (facultatif) et la description de votre projet.</p>
            <h2>Finalité</h2>
            <p>Ces informations servent uniquement à répondre à votre demande et à préparer notre échange. Elles ne sont ni vendues, ni transmises à des tiers à des fins commerciales, ni utilisées pour vous envoyer des communications non sollicitées.</p>
            <h2>Conservation</h2>
            <p>Les demandes sont conservées le temps nécessaire au suivi de l&apos;échange et de l&apos;éventuelle collaboration, puis supprimées.</p>
            <h2>Hébergement</h2>
            <p>Le site est hébergé par Vercel. Lorsque l&apos;enregistrement des demandes est activé, elles sont stockées chez Supabase, dans l&apos;Union européenne. À défaut, votre messagerie s&apos;ouvre avec un e-mail prérempli à destination de {SITE_NAME} : aucune donnée n&apos;est alors stockée par le site.</p>
            <h2>Vos droits</h2>
            <p>
              Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos informations à tout moment en écrivant à{" "}
              <a className="link" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <h2>Cookies</h2>
            <p>Le site n&apos;utilise pas de cookies de suivi publicitaire.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

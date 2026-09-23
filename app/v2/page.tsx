import type { Metadata } from "next";
import JuneV3Engine from "@/components/june/JuneV3Engine";
import SiteNav from "@/components/june/SiteNav";
import SiteFooter from "@/components/june/SiteFooter";
import AnimatedMarqueeHero from "@/components/ui/hero-3";
import Vsl from "@/components/ui/vsl";
import ImageGallery from "@/components/ui/image-gallery";
import StaggerTestimonials from "@/components/ui/stagger-testimonials";
import Contact16 from "@/components/ui/contact-16";
import { works } from "@/lib/work";
import { AVIS } from "@/lib/avis";

export const metadata: Metadata = {
  title: "June · Content Experience Studio (version test)",
  description: "Version test de la refonte : hero, vidéo de présentation, portfolio, avis et formulaire.",
  robots: { index: false, follow: false },
};

/* Version test (/v2) : l'accueil actuel reste intact. */
export default function V2Page() {
  const marquee = ["/hero.jpg", "/realisations/shooting-hotel-piscine-ext.jpg", "/wall/gite.jpg", "/regard.jpg", "/wall/yacht-reel.jpg", "/realisations/shooting-hotel-chambre.jpg", "/wall/unamas.jpg", "/realisations/shooting-hotel-terrasse.jpg", "/wall/ugc-bateau.jpg", "/realisations/harmonie-yacht-shooting.jpg", "/alpe.jpg", "/realisations/shooting-hotel-balcon-fleuri.jpg"];
  return (
    <>
      <JuneV3Engine />
      <SiteNav home={false} />
      <main id="top">
        <AnimatedMarqueeHero
          tagline="Content Experience Studio"
          title={
            <>
              Des lieux qui font vivre une expérience.
              <br />
              <em className="mt-3 block text-[0.78em] text-brown">Des contenus qui donnent envie de la vivre.</em>
            </>
          }
          description="J'accompagne les établissements à révéler leur expérience pour que leurs futurs clients puissent la comprendre, la ressentir et s'y projeter avant même de venir."
          ctaText="Parler de mon projet"
          ctaHref="#contact"
          note="Hospitality • Tourism • Experiences — Montpellier • Alpe d'Huez, hiver 26/27"
          images={marquee}
        />
        <Vsl src="/video/vsl.mp4" poster="/hero.jpg" label="En deux minutes" title="Ce qu'est une Content Experience, et pourquoi elle commence avant la caméra." />
        <ImageGallery works={works.filter((w) => w.home)} label="Mon travail" title="Des expériences racontées par June." sub="Parce que le meilleur moyen de comprendre mon travail reste encore de le voir." />
        <StaggerTestimonials items={AVIS} label="Ils en parlent" title="Ce que disent les établissements accompagnés." />
        <Contact16 label="Parlons de votre expérience" title="Votre expérience mérite peut-être d'être mieux racontée." sub="Racontez-moi votre établissement et ce que vous aimeriez réussir à mieux faire ressentir. Je regarde votre univers avant notre échange." />
      </main>
      <SiteFooter home={false} />
    </>
  );
}

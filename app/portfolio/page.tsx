import type { Metadata } from "next";
import Header from "@/components/sections/Header";
import Footer from "@/components/sections/Footer";
import PortfolioGrid from "@/components/PortfolioGrid";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Portfolio — June",
  description:
    "Réels, vidéos UGC et shootings photo réalisés par June pour des lieux, des expériences et des marques.",
};

export default function PortfolioPage() {
  return (
    <>
      <Header />
      <main className="pb-20 pt-32 md:pb-28 md:pt-40">
        <div className="mx-auto max-w-container px-5 md:px-7">
          <Reveal>
            <Eyebrow>Portfolio</Eyebrow>
            <h1 className="mt-4 max-w-2xl font-display text-[clamp(34px,5vw,60px)] leading-tight">
              Des lieux qu&apos;on a eu la chance de{" "}
              <em className="italic text-chestnut">raconter</em>.
            </h1>
            <p className="mt-4 max-w-xl leading-relaxed text-muted">
              Reels, vidéos UGC et shootings photo — mis à jour au fil des
              tournages. Cliquez sur un projet pour le voir sur Instagram.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="mt-12">
            <PortfolioGrid />
          </Reveal>

          <Reveal delay={0.1} className="mt-16 text-center md:mt-20">
            <p className="font-display text-2xl">
              Envie d&apos;y voir votre lieu ?
            </p>
            <a
              href="/#contact"
              className="mt-6 inline-block rounded-full bg-espresso px-7 py-3.5 text-sm font-semibold text-cream shadow-soft transition-transform hover:-translate-y-0.5"
            >
              Réserver un shooting
            </a>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

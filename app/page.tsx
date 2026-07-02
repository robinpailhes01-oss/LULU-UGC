import Header from "@/components/sections/Header";
import Hero from "@/components/sections/Hero";
import Prestations from "@/components/sections/Prestations";
import Realisations from "@/components/sections/Realisations";
import CommentCaMarche from "@/components/sections/CommentCaMarche";
import Tarifs from "@/components/sections/Tarifs";
import Faq from "@/components/sections/Faq";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Prestations />
        <Realisations />
        <CommentCaMarche />
        <Tarifs />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

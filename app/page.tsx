import Header from "@/components/sections/Header";
import Hero from "@/components/sections/Hero";
import PourquoiImage from "@/components/sections/PourquoiImage";
import Prestations from "@/components/sections/Prestations";
import Realisations from "@/components/sections/Realisations";
import CommentCaMarche from "@/components/sections/CommentCaMarche";
import Tarifs from "@/components/sections/Tarifs";
import APropos from "@/components/sections/APropos";
import Faq from "@/components/sections/Faq";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <PourquoiImage />
        <Prestations />
        <Realisations />
        <CommentCaMarche />
        <Tarifs />
        <APropos />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

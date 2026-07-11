"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";

const questions = [
  {
    question: "C'est quoi, une vidéo UGC ?",
    reponse:
      "Une vidéo où je vis votre expérience face caméra, comme une cliente : j'arrive, je découvre, je teste. C'est le format le plus authentique — vos futurs visiteurs se projettent à travers quelqu'un de vrai, pas une publicité.",
  },
  {
    question: "C'est un abonnement ?",
    reponse:
      "Non. Une prestation, une fois. Vous repartez avec vos fichiers et vous en faites ce que vous voulez.",
  },
  {
    question: "Vous gérez mes comptes ?",
    reponse:
      "Non, vous gardez la main sur vos réseaux. On vous livre la matière prête à publier — photos, reels, formats et idées de légendes.",
  },
  {
    question: "Et si je veux du contenu régulièrement ?",
    reponse:
      "On peut en reparler après une première prestation. Beaucoup de lieux repartent d'abord avec leur pack, puis reviennent quand le feed a besoin d'être réalimenté.",
  },
  {
    question: "Vous vous déplacez où ?",
    reponse:
      "En Occitanie, autour de Montpellier et du littoral. Au-delà, on en discute.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="faq bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <Eyebrow>Questions fréquentes</Eyebrow>
            <h2 className="mt-4 font-display text-[clamp(28px,4vw,44px)] leading-tight">
              Les questions qu&apos;on nous pose <em className="italic text-chestnut">vraiment</em>.
            </h2>
          </Reveal>

          <Reveal delay={0.15}>
            <ul className="mt-10 divide-y divide-[rgba(36,29,23,.12)] border-y border-line">
              {questions.map((item, index) => {
                const isOpen = openIndex === index;
                return (
                  <li key={item.question}>
                    <h3>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 py-5 text-left font-medium text-espresso"
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${index}`}
                        id={`faq-trigger-${index}`}
                        onClick={() => setOpenIndex(isOpen ? null : index)}
                      >
                        {item.question}
                        <ChevronDown
                          className={`h-5 w-5 shrink-0 text-muted transition-transform duration-300 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    </h3>
                    <div
                      id={`faq-panel-${index}`}
                      role="region"
                      aria-labelledby={`faq-trigger-${index}`}
                      hidden={!isOpen}
                      className="pb-5 leading-relaxed text-muted"
                    >
                      {item.reponse}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

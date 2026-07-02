import { Check } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";

const packs = [
  {
    nom: "Essentiel",
    prix: "390 €",
    pour: "Pour les restaurants, cafés et lieux d'activité.",
    inclus: [
      "Demi-journée de tournage sur place",
      "3 reels verticaux montés (15–25 s)",
      "15 photos retouchées",
      "Livrés en 9:16 + 4:5, prêts à publier",
      "Livraison sous 7 jours",
    ],
    highlight: false,
  },
  {
    nom: "Signature",
    prix: "690 €",
    pour: "Pour les logements insolites, hôtels et lieux à forte valeur.",
    inclus: [
      "Journée complète de tournage",
      "5 reels + 1 format long de présentation",
      "30 photos retouchées",
      "Déclinaisons stories / posts",
      "1 idée de légende par contenu",
      "Livraison sous 7 jours",
    ],
    highlight: true,
  },
];

export default function Tarifs() {
  return (
    <section id="tarifs" className="tarifs py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <Reveal>
          <Eyebrow>Tarifs</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-[clamp(28px,4vw,44px)] leading-tight">
            Une prestation, <em className="italic text-oxblood">une fois</em>. Vous
            gardez vos fichiers.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-muted">
            Pas d&apos;abonnement, pas de « sur devis ». Le palier dépend de la
            valeur que le contenu apporte à votre lieu, pas du nombre de fichiers.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl gap-8 md:mt-16 md:grid-cols-2">
          {packs.map((pack, index) => (
            <Reveal key={pack.nom} delay={index * 0.12}>
              <article
                className={`flex h-full flex-col rounded-[20px] p-8 md:p-9 ${
                  pack.highlight
                    ? "bg-espresso text-cream shadow-card"
                    : "border border-line bg-cream"
                }`}
              >
                <h3 className="font-display text-2xl">{pack.nom}</h3>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    pack.highlight ? "text-cream/70" : "text-muted"
                  }`}
                >
                  {pack.pour}
                </p>
                <p className="mt-6 font-display text-5xl font-light">
                  {pack.prix}
                </p>

                <ul className="mt-7 flex flex-col gap-3">
                  {pack.inclus.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          pack.highlight ? "text-honey" : "text-oxblood"
                        }`}
                        strokeWidth={2.4}
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                <a
                  href="#contact"
                  className={`mt-8 rounded-full px-6 py-3 text-center text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
                    pack.highlight
                      ? "bg-cream text-espresso"
                      : "bg-espresso text-cream shadow-soft"
                  }`}
                >
                  Réserver un shooting
                </a>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

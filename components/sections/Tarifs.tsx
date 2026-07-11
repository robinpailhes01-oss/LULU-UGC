import { Check, Plus } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";

const packComplet = {
  nom: "Pack Content & UGC",
  prix: "390 €",
  pour: "Le format complet pour montrer et faire vivre votre expérience à travers votre communication.",
  inclus: [
    "Shooting photo / vidéo sur place",
    "30 photos minimum livrées + tous les rushs vidéo",
    "2 reels montés, prêts à publier",
    "1 vidéo UGC : je vis votre expérience face caméra",
    "Idées de hooks et de contenus pour 1 mois minimum",
    "Livraison sous 7 jours, prêt à poster",
  ],
  supplements:
    "En supplément : reels montés ou photos en plus, selon vos besoins.",
};

const options = [
  {
    nom: "1 vidéo UGC complète",
    detail:
      "Je découvre et vis votre expérience face caméra, montage inclus. Idéal pour tester le format.",
  },
  {
    nom: "Shooting photo / vidéo",
    detail:
      "Une demi-journée sur place : photos retouchées et séquences vidéo, sans le volet UGC.",
  },
  {
    nom: "Collab Instagram",
    detail:
      "On publie en collaboration : votre lieu apparaît sur mon compte et sur le vôtre. Nos deux audiences se cumulent et l'algorithme pousse la publication plus loin.",
  },
];

export default function Tarifs() {
  return (
    <section id="tarifs" className="tarifs bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <Reveal>
          <Eyebrow>Tarifs</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-[clamp(28px,4vw,44px)] leading-tight">
            Une prestation, <em className="italic text-chestnut">une fois</em>. Vous
            gardez vos fichiers.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-muted">
            Pas d&apos;abonnement. Le pack Content &amp; UGC couvre tout ; les
            options à la carte se composent selon votre lieu et vos besoins.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl gap-8 md:mt-16 md:grid-cols-2">
          {/* Pack principal */}
          <Reveal>
            <article className="flex h-full flex-col rounded-[20px] bg-espresso p-8 text-cream shadow-card md:p-9">
              <p className="self-start rounded-full bg-honey/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-honey">
                Le plus complet
              </p>
              <h3 className="mt-4 font-display text-2xl">{packComplet.nom}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream/70">
                {packComplet.pour}
              </p>
              <p className="mt-6 font-display text-5xl font-light">
                {packComplet.prix}
              </p>

              <ul className="mt-7 flex flex-col gap-3">
                {packComplet.inclus.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-honey"
                      strokeWidth={2.4}
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-sm leading-relaxed text-cream/70">
                {packComplet.supplements}
              </p>

              <a
                href="#contact"
                className="mt-6 rounded-full bg-cream px-6 py-3 text-center text-sm font-semibold text-espresso transition-transform hover:-translate-y-0.5"
              >
                Réserver un shooting
              </a>
            </article>
          </Reveal>

          {/* Menu à la carte */}
          <Reveal delay={0.12}>
            <article className="flex h-full flex-col rounded-[20px] border border-line bg-limestone p-8 md:p-9">
              <h3 className="font-display text-2xl">À la carte</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Un seul format vous suffit ? Chaque option se réserve seule.
              </p>

              <ul className="mt-7 flex flex-1 flex-col divide-y divide-[rgba(36,29,23,.12)]">
                {options.map((option) => (
                  <li key={option.nom} className="flex items-start gap-4 py-5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-honey/15">
                      <Plus className="h-4 w-4 text-chestnut" strokeWidth={2.4} aria-hidden="true" />
                    </span>
                    <div>
                      <h4 className="font-semibold">{option.nom}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {option.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-sm leading-relaxed text-muted">
                Le tarif dépend du format et de votre lieu — on en parle
                simplement par message.
              </p>

              <a
                href="#contact"
                className="mt-6 rounded-full bg-espresso px-6 py-3 text-center text-sm font-semibold text-cream shadow-soft transition-transform hover:-translate-y-0.5"
              >
                Réserver un shooting
              </a>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

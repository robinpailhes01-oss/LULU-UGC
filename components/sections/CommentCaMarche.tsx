import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";

const etapes = [
  {
    numero: "1",
    titre: "On échange",
    texte:
      "Un appel ou quelques messages pour parler de votre lieu et de ce que vous voulez montrer.",
  },
  {
    numero: "2",
    titre: "On vient tourner",
    texte:
      "Une demi-journée à une journée sur place, au moment où votre lieu est le plus beau.",
  },
  {
    numero: "3",
    titre: "Vous recevez tout sous 7 jours",
    texte:
      "Reels montés, photos retouchées, bons formats, idées de légendes. Prêt à publier.",
  },
];

export default function CommentCaMarche() {
  return (
    <section id="comment" className="comment py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <Reveal>
          <Eyebrow>Comment ça marche</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-[clamp(28px,4vw,44px)] leading-tight">
            Trois temps, <em className="italic text-chestnut">zéro</em> charge mentale.
          </h2>
        </Reveal>

        <ol className="mt-12 grid gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
          {etapes.map((etape, index) => (
            <Reveal key={etape.numero} delay={index * 0.12}>
              <li className="h-full">
                <span className="font-display text-5xl font-light text-honey">
                  {etape.numero}
                </span>
                <h3 className="mt-4 font-display text-xl leading-snug">{etape.titre}</h3>
                <p className="mt-3 leading-relaxed text-muted">{etape.texte}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

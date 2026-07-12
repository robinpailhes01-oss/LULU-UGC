import Eyebrow from "@/components/ui/Eyebrow";
import Reveal from "@/components/ui/Reveal";

export default function APropos() {
  return (
    <section id="a-propos" className="a-propos py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-7">
        <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[minmax(0,340px)_1fr] md:gap-14">
          <Reveal>
            {/* Photo portrait — déposer le fichier dans public/portrait.jpg ;
                en attendant, le dégradé chaud sert de placeholder. */}
            <div
              className="mx-auto aspect-[4/5] w-full max-w-[340px] rounded-[24px] shadow-card"
              style={{
                background:
                  "url('/portrait.jpg') center / cover no-repeat, linear-gradient(170deg, #E8C495 0%, #C98A3C 55%, #7A5230 100%)",
              }}
              role="img"
              aria-label="Portrait de Ludivine, créatrice du studio June"
            />
          </Reveal>

          <Reveal delay={0.15}>
            <Eyebrow>Qui est derrière June</Eyebrow>
            <h2 className="mt-4 font-display text-[clamp(28px,4vw,44px)] leading-tight">
              Moi c&apos;est <em className="italic text-chestnut">Ludivine</em>.
            </h2>
            <div className="mt-5 flex flex-col gap-4 leading-relaxed text-muted">
              <p>
                Passionnée par la création de contenu et la découverte de
                nouveaux lieux et d&apos;expériences, je crée du contenu pour le
                tourisme en Occitanie : hôtels, restaurants, logements
                insolites. Ce qui me plaît, c&apos;est capter ce qu&apos;on
                ressent chez vous — la lumière d&apos;une terrasse en fin de
                journée, le premier regard en entrant dans une chambre — et le
                retranscrire en images.
              </p>
              <p>
                Je viens sur place, je vis l&apos;expérience comme vos futurs
                clients, je filme, je photographie, je monte. Vous recevez du
                contenu fidèle à votre lieu, prêt à poster.
              </p>
            </div>
            <a
              href="#contact"
              className="mt-8 inline-block rounded-full bg-espresso px-7 py-3.5 text-sm font-semibold text-cream shadow-soft transition-transform hover:-translate-y-0.5"
            >
              Réserver un shooting
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

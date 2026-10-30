import type { Metadata } from "next";
import type React from "react";
import "./lp.css";
import { DemoTabs, LpEngine, PainCheck, Rotator, type DemoCase } from "@/components/lp/LpInteractive";
import { EVENT, EXTRAS, EXTRAS_TITRE, OFFRE } from "@/lib/offres";
import { PRICE_HIDDEN_TEXT, PRICE_SCOPE_NOTE, priceLabel } from "@/lib/pricing";
import { CONTACT_EMAIL, LIEUX, SIGNATURE, SITE_URL } from "@/lib/site";

/**
 * Page de vente de l'Experience Content Day (tunnel : en-tête réduit,
 * un seul appel à l'action). Médias réels de June uniquement ; les vues
 * Instagram viennent des captures fournies ; les scénarios de la démo
 * sont présentés comme des exemples.
 */

export const metadata: Metadata = {
  title: "Experience Content Day · Une journée de création, des semaines de contenus",
  description:
    "Je viens sur place, je capte ce que vos clients vivent chez vous et je vous livre des Reels montés, des photos retouchées, des carrousels et les légendes prêtes. Pour les gîtes, maisons d'hôtes, chalets, hôtels et lieux de bien-être. Montpellier, Occitanie, Alpe d'Huez.",
  alternates: { canonical: `${SITE_URL}/experience-content-day` },
  openGraph: {
    title: "Experience Content Day · June Content Studio",
    description: "Une journée de création. Des semaines de contenus prêts à publier.",
    url: `${SITE_URL}/experience-content-day`,
    images: [{ url: "/hero.jpg", width: 1672, height: 941, alt: "Ludivine, June Content Studio, photographie une chambre avec vue" }],
  },
};

const CTA = `/contact?projet=${encodeURIComponent(OFFRE.nom)}`;
const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Check = () => (
  <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Cross = () => (
  <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

function Cta({ label = "Parler de mon projet", light = false }: { label?: string; light?: boolean }) {
  return (
    <a className={`lp-cta${light ? " lp-cta--light" : ""}`} href={CTA}>
      <span className="lp-cta__fill" aria-hidden="true" />
      <span className="lp-cta__label">{label}</span>
      <span className="lp-cta__dot" aria-hidden="true">
        <Arrow />
      </span>
    </a>
  );
}

const RUBAN = ["8 Reels montés", "30 photos retouchées", "4 carrousels", "Légendes prêtes", "Calendrier conseillé", "Vous gardez la main", "Plans pour vos stories"];

const PAINS = [
  { t: "Je sais que je devrais publier, mais je n'ai jamais le temps.", d: "Entre les arrivées, le ménage et les clients, Instagram passe toujours après." },
  { t: "Je ne sais jamais quoi poster.", d: "Vous ouvrez l'application, vous regardez la galerie, vous refermez." },
  { t: "Mes photos ne montrent pas ce qu'on vit vraiment ici.", d: "Le lieu est beau, mais l'émotion ne passe pas à l'écran." },
  { t: "J'ai des vidéos plein le téléphone, jamais montées.", d: "Des rushes de couchers de soleil qui dorment depuis l'été dernier." },
  { t: "Je ne veux pas devenir influenceuse pour exister.", d: "Vous voulez montrer votre lieu, pas vous mettre en scène tous les jours." },
];

const REELS = [
  { img: "/wall/yacht-reel.jpg", w: 389, h: 614, alt: "Petit-déjeuner servi à bord d'un yacht face à la mer", lieu: "Harmonie Yacht", vues: "20,3\u00a0K", href: "https://www.instagram.com/reel/DZ5ER2RsFEt/" },
  { img: "/wall/gite.jpg", w: 393, h: 633, alt: "Petit-déjeuner sous la treille au Gîte de l'Abric, face aux Cévennes", lieu: "Gîte de l'Abric", vues: "4\u00a0403", href: "https://www.instagram.com/reel/DMVPrINId35/" },
  { img: "/wall/unamas.jpg", w: 392, h: 629, alt: "Amis qui trinquent en terrasse chez Una Mas", lieu: "Una Mas · Carnon", vues: "3\u00a0865", href: "https://www.instagram.com/reel/DYwjsCSM7wb/" },
];

const AVANT = [
  "Vous cherchez quoi publier le soir, fatigué·e.",
  "Des photos au téléphone, prises entre deux clients.",
  "Des vidéos jamais montées, des légendes jamais écrites.",
  "Votre compte reste silencieux pendant la saison.",
];
const APRES = [
  "Des semaines de publications prêtes, dans l'ordre.",
  "Des images qui montrent ce qu'on ressent chez vous.",
  "Reels montés, légendes et hooks déjà rédigés.",
  "Vous publiez en quelques minutes, à votre rythme.",
];

const CASES: DemoCase[] = [
  {
    id: "gite",
    tab: "Gîte, maison d'hôtes",
    handle: "@votregite",
    image: "/wall/gite.jpg",
    alt: "Petit-déjeuner sous la treille, création June pour un gîte des Cévennes",
    pos: "50% 30%",
    hook: "Ici, le café se prend dehors.",
    legende: "Le matin sous la treille, avant que la vallée se réveille. Dates d'été ouvertes, lien en bio.",
    steps: [
      "Je repère vos moments forts : la treille, le petit-déjeuner, la lumière du soir",
      "Je filme une matinée au gîte, du premier café au départ en balade",
      "Je monte le Reel et j'écris le hook d'ouverture",
      "Je rédige la légende et l'appel à l'action",
      "Je le place dans votre calendrier conseillé",
    ],
  },
  {
    id: "hotel",
    tab: "Hôtel, chalet",
    handle: "@votrehotel",
    image: "/wall/ugc-hotel.jpg",
    alt: "Moment de détente en peignoir dans une chambre d'hôtel, création June",
    hook: "La chambre où l'on oublie l'heure.",
    legende: "Peignoir, vue et rien de prévu. Réservez votre parenthèse en direct sur notre site.",
    steps: [
      "Je liste ce que vos clients adorent : la vue, le lit, le calme",
      "Je filme l'expérience à la première personne, comme un client",
      "Je monte le Reel et je propose trois hooks au choix",
      "Je rédige la légende avec un appel à réserver en direct",
      "Je prépare les plans courts pour vos stories",
    ],
  },
  {
    id: "bienetre",
    tab: "Bien-être, soin",
    handle: "@votrelieu",
    image: "/wall/beltra.jpg",
    alt: "Séance de thérapie physique, création June pour Beltra",
    pos: "50% 45%",
    hook: "Ce que vos mains font, en 20 secondes.",
    legende: "Une séance, des gestes précis et beaucoup d'attention. Prenez rendez-vous, lien en bio.",
    steps: [
      "Je comprends votre approche et ce qui vous distingue",
      "Je filme les gestes, sans montrer le visage des clients",
      "Je monte un Reel calme, au rythme de la séance",
      "Je rédige une légende simple qui explique le soin",
      "Je crée un carrousel « comment se passe une séance »",
    ],
  },
  {
    id: "experience",
    tab: "Expérience, sortie",
    handle: "@votreexperience",
    image: "/wall/ugc-bateau.jpg",
    alt: "Sortie en mer, chapeau de paille et bateau au large, création June",
    hook: "Le genre de journée qu'on raconte longtemps.",
    legende: "Une sortie en mer, le soleil, les amis. Il reste des places cet été, écrivez-nous.",
    steps: [
      "Je prépare les angles : l'embarquement, le large, le retour",
      "Je filme l'expérience vécue, sans mise en scène forcée",
      "Je monte le Reel souvenir et un Reel « infos pratiques »",
      "J'écris les légendes et les réponses aux questions fréquentes",
      "Je range tout dans votre Content Board",
    ],
  },
];

const POUR_CARTES = [
  { n: "01", t: "Des Reels qui donnent envie", d: "Montés et rythmés, pensés pour retenir dès les premières secondes.", r: "vous publiez une vidéo soignée sans ouvrir une application de montage." },
  { n: "02", t: "Des photos qui ressemblent à votre lieu", d: "La lumière, les détails, les espaces et les gens qui les vivent.", r: "des images utilisables sur vos réseaux, votre site et vos annonces." },
  { n: "03", t: "Des carrousels utiles", d: "Pour présenter le lieu, les prestations ou les informations pratiques.", r: "les informations utiles réunies dans un format facile à partager." },
  { n: "04", t: "Les mots déjà écrits", d: "Légendes, hooks, appels à l'action et idées de stories.", r: "il ne reste qu'à copier, coller et publier." },
];

const ETAPES = [
  { t: "On échange sur votre lieu", d: "Un premier appel pour comprendre votre expérience, vos clients et ce que vous voulez montrer.", c: ["Sans engagement", "Votre lieu, vos envies"] },
  { t: "Je prépare les angles créatifs", d: "Je vous propose les scènes, les moments et les idées de Reels avant de venir.", c: ["Plan de tournage", "Vous validez"] },
  { t: "La session de captation", d: "Je viens sur place et je filme votre lieu comme un client le vivrait. Vous n'apparaissez que si vous le souhaitez.", c: ["Sur place", "Photo et vidéo"] },
  { t: "Montage, retouches et rédaction", d: "Je monte les Reels, je retouche les photos et j'écris les légendes, les hooks et le calendrier.", c: ["Reels", "Photos", "Légendes"] },
  { t: "Vous recevez tout, bien rangé", d: "Votre Content Board : chaque contenu prêt, dans l'ordre conseillé. Vous publiez à votre rythme.", c: ["Content Board", "Prêt à publier"] },
];

const PARCOURS = [
  { k: "Pourquoi June", t: "Raconter ce qui ne se voit pas", d: "L'ambiance d'un lieu, un geste, un détail, le moment dont vos clients se souviendront." },
  { k: "Ma méthode", t: "Regarder avant de filmer", d: "Quand j'arrive chez vous, je regarde d'abord ce que l'on y vit. Ensuite seulement, je sors la caméra." },
  { k: "Mes lieux", t: "Hébergements, bien-être, expériences", d: "Un gîte dans les Cévennes, un yacht, un hôtel avec spa, un cabinet de thérapie physique, une adresse à Carnon." },
  { k: "Hiver 2026/27", t: "Alpe d'Huez", d: "Je passe la saison en montagne : chalets et hôtels de station peuvent réserver leur session." },
];

export default function ExperienceContentDayPage() {
  const price = priceLabel(OFFRE.slug);
  return (
    <div className="lp">
      <LpEngine />
      <a className="lp-skip" href="#lp-main">Aller au contenu</a>

      <header className="lp-head">
        <div className="lp-wrap lp-head__in">
          <a className="lp-logo" href="/" aria-label="June Content Studio, accueil">
            june <span>Content Studio</span>
          </a>
          <a className="lp-head__cta" href={CTA}>Parler de mon projet</a>
        </div>
      </header>

      <main id="lp-main">
        {/* ───────────── Hero ───────────── */}
        <section className="lp-hero lp-dark" aria-labelledby="lp-h1">
          <div className="lp-bgclip" aria-hidden="true"><div className="lp-hero__glow" /></div>
          <div className="lp-wrap lp-hero__grid">
            <div className="lp-hero__copy">
              <p className="lp-pill lp-in" style={d(0)}>
                <span className="lp-pill__dot" aria-hidden="true" />
                <span>Experience Content Day<span className="lp-pill__more"> · {LIEUX.split(" — ")[0]}</span></span>
              </p>
              <h1 id="lp-h1" className="lp-h1 lp-in" style={d(90)}>
                Une journée de création. <em>Des semaines de contenus.</em>
              </h1>
              <div className="lp-in" style={d(180)}>
                <Rotator prefix="Pour votre" words={["gîte", "maison d'hôtes", "chalet", "hôtel", "lieu de bien-être", "retraite"]} />
              </div>
              <p className="lp-hero__lede lp-in" style={d(260)}>
                Je viens sur place, je capte ce que vos clients vivent chez vous, puis je vous livre des Reels montés, des photos retouchées et les légendes déjà écrites. Vous n&apos;avez plus qu&apos;à publier, à votre rythme.
              </p>
              <div className="lp-in" style={d(340)}>
                <Cta />
                <p className="lp-micro">Sans engagement · un échange pour comprendre votre lieu · devis sur mesure</p>
              </div>
              <ul className="lp-checks lp-in" style={d(420)}>
                <li><span className="lp-tick"><Check /></span>Des contenus prêts à publier, légendes comprises</li>
                <li><span className="lp-tick"><Check /></span>Vous gardez la main sur vos comptes</li>
                <li><span className="lp-tick"><Check /></span>Vous n&apos;apparaissez que si vous le souhaitez</li>
              </ul>
            </div>

            <div className="lp-hero__visual lp-in" style={d(200)}>
              <figure className="lp-arch">
                <img src="/regard.jpg" alt="Ludivine prépare une session de création, carnet en main, dans un chalet avec vue sur la montagne" width={1122} height={1402} fetchPriority="high" decoding="async" />
              </figure>
              <div className="lp-float lp-float--a">
                <b>8</b>
                <span>Reels montés,<br />prêts à publier</span>
              </div>
              <div className="lp-float lp-float--b">
                <b>30</b>
                <span>photos retouchées</span>
              </div>
              <div className="lp-float lp-float--c">
                <span className="lp-float__ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
                </span>
                <span><b>20,3 K vues</b><br />un Reel pour Harmonie Yacht</span>
              </div>
              <p className="lp-note lp-hero__note" aria-hidden="true">c&apos;est moi, Ludivine ✦</p>
            </div>
          </div>

          <div className="lp-ribbons" aria-hidden="true">
            {[0, 1].map((r) => (
              <div key={r} className={`lp-ribbon lp-ribbon--${r ? "b" : "a"}`}>
                <div className="lp-ribbon__track">
                  {[...RUBAN, ...RUBAN, ...RUBAN].map((w, k) => (
                    <span key={k}>
                      {w} <i>✦</i>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───────────── Si vous vous reconnaissez ───────────── */}
        <section className="lp-sec lp-paper" aria-labelledby="lp-pain">
          <div className="lp-wrap lp-narrow">
            <div className="lp-sec__head lp-rv">
              <p className="lp-eyebrow">Si vous vous reconnaissez</p>
              <h2 id="lp-pain" className="lp-h2">
                Votre lieu est beau. <em className="lp-hl">Il mérite d&apos;être vu comme il se vit.</em>
              </h2>
              <p className="lp-sub">Des phrases qu&apos;on se dit souvent quand on gère un lieu seul·e. Touchez celles qui vous ressemblent.</p>
            </div>
            <div className="lp-rv">
              <PainCheck items={PAINS} />
            </div>
          </div>
        </section>

        {/* ───────────── Preuves ───────────── */}
        <section className="lp-sec lp-ivory" aria-labelledby="lp-proof">
          <div className="lp-wrap">
            <div className="lp-sec__head lp-rv">
              <p className="lp-eyebrow">Mes vraies créations</p>
              <h2 id="lp-proof" className="lp-h2">
                Des lieux réels. <em className="lp-hl">Des contenus déjà publiés.</em>
              </h2>
              <p className="lp-sub">Un yacht, un gîte dans les Cévennes, une adresse à Carnon : voici ce que mes Reels ont donné une fois en ligne.</p>
            </div>

            <div className="lp-bento">
              <article className="lp-card lp-card--dark lp-bento__big lp-rv">
                <p className="lp-eyebrow lp-eyebrow--dark">Le Reel le plus vu</p>
                <p className="lp-stat">20,3 K<small> vues</small></p>
                <p className="lp-card__txt">Un petit-déjeuner servi à bord, filmé comme on le vit. Publié par Harmonie Yacht sur Instagram.</p>
                <div className="lp-mini">
                  <a className="lp-mini__it" href={REELS[1].href} target="_blank" rel="noopener noreferrer">
                    <b>4 403</b><span>Gîte de l&apos;Abric</span>
                  </a>
                  <a className="lp-mini__it" href={REELS[2].href} target="_blank" rel="noopener noreferrer">
                    <b>3 865</b><span>Una Mas</span>
                  </a>
                  <a className="lp-mini__it" href={REELS[0].href} target="_blank" rel="noopener noreferrer">
                    <b>↗</b><span>Voir le Reel</span>
                  </a>
                </div>
                <img className="lp-bento__peek" src="/wall/yacht-reel.jpg" alt="" width={389} height={614} loading="lazy" decoding="async" />
              </article>

              <article className="lp-card lp-rv" style={d(80)}>
                <p className="lp-card__title">Ce que vous recevez</p>
                <ul className="lp-deliv">
                  {OFFRE.livrables.map((l) => (
                    <li key={l.titre}>
                      <b>{l.n}</b>
                      <span>
                        <strong>{l.titre}</strong>
                        {l.texte}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="lp-card lp-bento__wide lp-rv">
                <p className="lp-card__title">
                  Une journée chez vous, par exemple. <span className="lp-tag">Exemple</span>
                </p>
                <ol className="lp-time">
                  <li><b>8 h 30</b><span>La lumière du matin sur la terrasse, le petit-déjeuner qu&apos;on dresse.</span></li>
                  <li><b>11 h</b><span>Les chambres, les détails, les matières : ce que vos clients touchent.</span></li>
                  <li><b>16 h</b><span>L&apos;expérience vécue : la piscine, le soin, la balade, les gens.</span></li>
                  <li><b>19 h 30</b><span>La golden hour, celle qui fait les plus beaux Reels.</span></li>
                  <li className="lp-time__off"><b>Après</b><span>Vous, vous n&apos;avez rien d&apos;autre à faire que de continuer à accueillir.</span></li>
                </ol>
              </article>

              <article className="lp-card lp-card--quote lp-rv" style={d(80)}>
                <p className="lp-note lp-note--big">« Je regarde d&apos;abord ce que l&apos;on y vit. Ensuite seulement, je sors la caméra. »</p>
                <p className="lp-card__by">Ludivine, fondatrice de June</p>
              </article>
            </div>
            <p className="lp-foot lp-rv">Vues relevées sur Instagram au moment des captures. Ce sont mes créations, pas une promesse de résultat.</p>
          </div>
        </section>

        {/* ───────────── En vrai ───────────── */}
        <section className="lp-sec lp-dark lp-real" aria-labelledby="lp-real">
          <div className="lp-wrap">
            <div className="lp-sec__head lp-rv">
              <p className="lp-eyebrow lp-eyebrow--dark">En vrai</p>
              <h2 id="lp-real" className="lp-h2">
                Pas des images de banque. <em>Vos clients, votre lumière, votre lieu.</em>
              </h2>
            </div>
            <div className="lp-phones">
              {REELS.map((r, k) => (
                <a key={r.href} className="lp-reel lp-rv" style={d(k * 110)} href={r.href} target="_blank" rel="noopener noreferrer" aria-label={`Voir le Reel ${r.lieu} sur Instagram (${r.vues} vues)`}>
                  <span className="lp-reel__frame">
                    <img src={r.img} alt={r.alt} width={r.w} height={r.h} loading="lazy" decoding="async" />
                    <span className="lp-reel__badge">Publié</span>
                    <span className="lp-reel__play" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
                    </span>
                  </span>
                  <span className="lp-reel__cap">
                    <span className="lp-tick"><Check /></span>
                    <span><b>{r.lieu}</b> <span className="lp-nowrap">· {r.vues} vues</span></span>
                  </span>
                </a>
              ))}
            </div>
            <blockquote className="lp-quote lp-rv">
              <p>{SIGNATURE}</p>
            </blockquote>
          </div>
        </section>

        {/* ───────────── Comparaison ───────────── */}
        <section className="lp-sec lp-paper" aria-labelledby="lp-cmp">
          <div className="lp-wrap">
            <div className="lp-sec__head lp-rv">
              <p className="lp-eyebrow">Ce qui change</p>
              <h2 id="lp-cmp" className="lp-h2">
                Aujourd&apos;hui, <em className="lp-hl">et avec June.</em>
              </h2>
            </div>
            <div className="lp-cmp">
              <div className="lp-cmp__col lp-cmp__col--before lp-rv">
                <p className="lp-cmp__k">Aujourd&apos;hui</p>
                <ul>
                  {AVANT.map((t) => (
                    <li key={t}><span className="lp-x"><Cross /></span><s>{t}</s></li>
                  ))}
                </ul>
              </div>
              <div className="lp-cmp__col lp-cmp__col--after lp-rv" style={d(120)}>
                <p className="lp-cmp__k">Avec une Experience Content Day</p>
                <ul>
                  {APRES.map((t) => (
                    <li key={t}><span className="lp-tick"><Check /></span>{t}</li>
                  ))}
                </ul>
                <p className="lp-cmp__out">
                  <span>Une session</span><i aria-hidden="true">→</i><span>des semaines de contenus</span><i aria-hidden="true">→</i><span>vous gardez la main</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── Démo ───────────── */}
        <section className="lp-sec lp-ivory" aria-labelledby="lp-demo">
          <div className="lp-wrap">
            <div className="lp-sec__head lp-rv">
              <p className="lp-eyebrow">Concrètement</p>
              <h2 id="lp-demo" className="lp-h2">
                Ce que je crée <em className="lp-hl">pour votre lieu.</em>
              </h2>
              <p className="lp-sub">Choisissez votre type de lieu : à gauche un contenu, à droite tout ce que je prépare pour qu&apos;il soit prêt à publier.</p>
            </div>
            <div className="lp-rv">
              <DemoTabs cases={CASES} />
            </div>
            <p className="lp-foot">Visuels : créations June. Textes et comptes donnés à titre d&apos;exemple.</p>

            <div className="lp-feats">
              {POUR_CARTES.map((c, k) => (
                <article key={c.n} className="lp-feat lp-rv" style={d((k % 2) * 100)}>
                  <div className="lp-feat__top">
                    <h3>{c.t}</h3>
                    <span className="lp-feat__n" aria-hidden="true">{c.n}</span>
                  </div>
                  <p>{c.d}</p>
                  <p className="lp-feat__r"><b>✦ Pour vous :</b> {c.r}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── Content Board ───────────── */}
        <section className="lp-sec lp-dark lp-hub" aria-labelledby="lp-board">
          <div className="lp-wrap">
            <div className="lp-sec__head lp-rv">
              <p className="lp-eyebrow lp-eyebrow--dark">{OFFRE.board.titre}</p>
              <h2 id="lp-board" className="lp-h2">
                Tout est rangé. <em>Il ne reste qu&apos;à publier.</em>
              </h2>
              <p className="lp-sub">{OFFRE.board.texte}</p>
            </div>
            <div className="lp-hub__map lp-rv">
              <svg className="lp-hub__lines" viewBox="0 0 600 360" preserveAspectRatio="none" aria-hidden="true">
                {[[60, 50], [300, 30], [540, 50], [60, 310], [300, 330], [540, 310]].map(([x, y], k) => (
                  <path key={k} d={`M300 180 L${x} ${y}`} />
                ))}
              </svg>
              <div className="lp-hub__core">
                <span className="lp-orb lp-orb--lg" aria-hidden="true" />
                <b>Votre Content Board</b>
                <span>un seul endroit, tout est prêt</span>
              </div>
              <ul className="lp-hub__nodes">
                {OFFRE.board.items.map((it) => (
                  <li key={it}><span className="lp-tick"><Check /></span>{it}</li>
                ))}
              </ul>
            </div>
            <div className="lp-hub__ex">
              {[
                ["Lundi", "Reel « le matin chez vous »", "Hook, légende et appel à l'action prêts."],
                ["Mercredi", "Carrousel « bon à savoir »", "Accès, horaires, ce qui est inclus."],
                ["Vendredi", "Stories du week-end", "Trois plans courts et une idée de sondage."],
              ].map(([j, t, s], k) => (
                <article key={j} className="lp-ex lp-rv" style={d(k * 90)}>
                  <p className="lp-ex__day">{j}</p>
                  <p className="lp-ex__t">{t}</p>
                  <p className="lp-ex__s">{s}</p>
                </article>
              ))}
            </div>
            <p className="lp-foot lp-foot--dark">Exemple de semaine dans un calendrier conseillé. {OFFRE.rythme}</p>
          </div>
        </section>

        {/* ───────────── Étapes ───────────── */}
        <section className="lp-sec lp-paper" aria-labelledby="lp-steps">
          <div className="lp-wrap lp-steps">
            <div className="lp-steps__intro lp-rv">
              <p className="lp-eyebrow">Comment on travaille</p>
              <h2 id="lp-steps" className="lp-h2">
                Cinq étapes. <em className="lp-hl">Vous n&apos;en gérez qu&apos;une.</em>
              </h2>
              <p className="lp-sub">Vous me parlez de votre lieu, je m&apos;occupe du reste. Pas d&apos;abonnement, pas de gestion quotidienne de vos réseaux.</p>
              <div className="lp-steps__cta">
                <Cta label="Réserver un premier échange" />
                <p className="lp-micro lp-micro--ink">Sans engagement · devis personnalisé</p>
              </div>
            </div>
            <ol className="lp-stack">
              {ETAPES.map((e, k) => (
                <li key={e.t} className="lp-stack__it" style={{ "--i": k } as React.CSSProperties}>
                  <span className="lp-stack__n">{String(k + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{e.t}</h3>
                    <p>{e.d}</p>
                    <p className="lp-stack__chips">
                      {e.c.map((c) => (
                        <span key={c} className="lp-chip lp-chip--static">{c}</span>
                      ))}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ───────────── Bande image ───────────── */}
        <section className="lp-band" aria-labelledby="lp-band">
          <img src="/hero.jpg" alt="" width={1672} height={941} loading="lazy" decoding="async" />
          <div className="lp-wrap lp-band__in lp-rv">
            <p className="lp-eyebrow lp-eyebrow--dark">Ma façon de créer</p>
            <h2 id="lp-band" className="lp-h2">
              Je regarde d&apos;abord. <em>Ensuite, je filme.</em>
            </h2>
            <p>Je prends le temps de vivre votre lieu comme vos clients le vivent. C&apos;est ça que je filme : ce qu&apos;ils ressentiront en poussant la porte.</p>
            <a className="lp-ghost" href="/realisations">Voir le portfolio <Arrow /></a>
          </div>
        </section>

        {/* ───────────── Qui suis-je ───────────── */}
        <section className="lp-sec lp-ivory" aria-labelledby="lp-me">
          <div className="lp-wrap lp-me">
            <figure className="lp-me__photo lp-rv">
              <img src="/ludivine.jpg" alt="Ludivine, appareil photo en main" width={1111} height={1415} loading="lazy" decoding="async" />
              <figcaption className="lp-note">Ludivine ✦ June</figcaption>
            </figure>
            <div className="lp-me__copy">
              <div className="lp-rv">
                <p className="lp-eyebrow">Qui suis-je ?</p>
                <h2 id="lp-me" className="lp-h2">
                  Bonjour, <em className="lp-hl">moi c&apos;est Ludivine.</em>
                </h2>
                <p className="lp-sub lp-sub--left">Derrière June, il n&apos;y a pas d&apos;agence : il y a moi. Je travaille seule, de près, et je prends le temps.</p>
              </div>
              <ol className="lp-tl">
                {PARCOURS.map((p, k) => (
                  <li key={p.t} className="lp-rv" style={d(k * 80)}>
                    <span className="lp-tl__k">{p.k}</span>
                    <b>{p.t}</b>
                    <span>{p.d}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ───────────── Pour vous si ───────────── */}
        <section className="lp-sec lp-paper" aria-labelledby="lp-fit">
          <div className="lp-wrap">
            <div className="lp-sec__head lp-rv">
              <p className="lp-eyebrow">Soyons clairs</p>
              <h2 id="lp-fit" className="lp-h2">
                Pour vous, <em className="lp-hl">si…</em>
              </h2>
            </div>
            <div className="lp-fit">
              <div className="lp-fit__col lp-fit__col--yes lp-rv">
                <p className="lp-fit__k">C&apos;est pour vous si</p>
                <ul>
                  <li><span className="lp-tick"><Check /></span>Vous tenez un gîte, une maison d&apos;hôtes, un chalet, un petit hôtel ou un lieu de bien-être.</li>
                  <li><span className="lp-tick"><Check /></span>Vous voulez des contenus soignés sans y passer vos soirées.</li>
                  <li><span className="lp-tick"><Check /></span>Vous préférez publier vous-même, avec tout prêt à l&apos;avance.</li>
                  <li><span className="lp-tick"><Check /></span>Vous voulez que votre lieu donne envie, sans en faire trop.</li>
                </ul>
              </div>
              <div className="lp-fit__col lp-fit__col--no lp-rv" style={d(120)}>
                <p className="lp-fit__k">Ce n&apos;est pas pour vous si</p>
                <ul>
                  <li><span className="lp-x"><Cross /></span>Vous cherchez quelqu&apos;un pour gérer vos réseaux au quotidien.</li>
                  <li><span className="lp-x"><Cross /></span>Vous voulez des images de banque ou des visuels génériques.</li>
                  <li><span className="lp-x"><Cross /></span>Vous attendez un nombre garanti de réservations ou d&apos;abonnés.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── L'offre ───────────── */}
        <section className="lp-sec lp-ivory" id="offre" aria-labelledby="lp-offer">
          <div className="lp-wrap">
            <div className="lp-sec__head lp-rv">
              <p className="lp-eyebrow">L&apos;offre</p>
              <h2 id="lp-offer" className="lp-h2">
                {OFFRE.nom}. <em className="lp-hl">Tout est compris.</em>
              </h2>
            </div>
            <div className="lp-offer lp-rv">
              <div className="lp-offer__main">
                <p className="lp-offer__acc">{OFFRE.accroche}</p>
                <ul className="lp-offer__list">
                  {OFFRE.livrables.map((l) => (
                    <li key={l.titre}><span className="lp-tick"><Check /></span><span><b>{l.n === "+" ? "" : `${l.n} `}{l.titre}</b> · {l.texte}</span></li>
                  ))}
                  <li><span className="lp-tick"><Check /></span><span><b>{OFFRE.board.titre}</b> · {OFFRE.board.items.join(", ").toLowerCase()}.</span></li>
                </ul>
              </div>
              <div className="lp-offer__side">
                <p className="lp-offer__price">{price ?? PRICE_HIDDEN_TEXT}</p>
                <p className="lp-offer__scope">{PRICE_SCOPE_NOTE}</p>
                <Cta light />
                <p className="lp-micro">Sans engagement · réponse personnelle</p>
              </div>
            </div>

            <div className="lp-extras">
              <div className="lp-extras__col lp-rv">
                <p className="lp-card__title">{EXTRAS_TITRE}</p>
                <ul>
                  {EXTRAS.map((x) => (
                    <li key={x.nom}><b>{x.nom}</b><span>{x.texte}</span></li>
                  ))}
                </ul>
                <p className="lp-foot lp-foot--left">À la carte, sur devis.</p>
              </div>
              <div className="lp-extras__event lp-rv" style={d(120)}>
                <img src={EVENT.image} alt="Groupe d'amis à bord au coucher du soleil, reportage June" width={1179} height={1456} loading="lazy" decoding="async" />
                <div>
                  <p className="lp-eyebrow lp-eyebrow--dark">Event Coverage</p>
                  <p className="lp-extras__t">{EVENT.titre}</p>
                  <p>{EVENT.pour}</p>
                  <p className="lp-extras__chips">
                    {EVENT.possibilites.map((p) => <span key={p} className="lp-chip lp-chip--glass">{p}</span>)}
                  </p>
                  <p className="lp-extras__note">{EVENT.note}</p>
                  <a className="lp-ghost" href={`/contact?projet=${encodeURIComponent("Event Coverage")}`}>Parler de mon événement <Arrow /></a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── FAQ ───────────── */}
        <section className="lp-sec lp-paper" aria-labelledby="lp-faq">
          <div className="lp-wrap lp-narrow">
            <div className="lp-sec__head lp-rv">
              <p className="lp-eyebrow">FAQ</p>
              <h2 id="lp-faq" className="lp-h2">
                Vos questions, <em className="lp-hl">mes réponses.</em>
              </h2>
            </div>
            <div className="lp-faq">
              {OFFRE.faq.map(([q, a]) => (
                <details key={q} className="lp-rv">
                  <summary>
                    {q}
                    <span className="lp-faq__ico" aria-hidden="true" />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
            <p className="lp-foot">Une autre question ? Écrivez-moi : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
          </div>
        </section>

        {/* ───────────── CTA final ───────────── */}
        <section className="lp-final lp-dark" aria-labelledby="lp-final">
          <div className="lp-bgclip" aria-hidden="true"><div className="lp-hero__glow" /></div>
          <div className="lp-wrap lp-final__in lp-rv">
            <span className="lp-final__av" aria-hidden="true"><img src="/regard.jpg" alt="" width={1122} height={1402} loading="lazy" decoding="async" /></span>
            <h2 id="lp-final" className="lp-h2 lp-h2--xl">
              Ce soir, quelqu&apos;un cherche où partir. <em>Que <span className="lp-nowrap">va-t-il</span> voir de chez <span className="lp-nowrap">vous&nbsp;?</span></em>
            </h2>
            <p className="lp-pill lp-pill--soft"><span className="lp-pill__dot" aria-hidden="true" /> {LIEUX}</p>
            <Cta />
            <p className="lp-micro">Sans engagement · un échange pour comprendre votre lieu · devis sur mesure</p>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer__in">
          <a className="lp-logo lp-logo--ink" href="/">june <span>Content Studio</span></a>
          <nav aria-label="Liens utiles">
            <a href="/">Le site</a>
            <a href="/realisations">Portfolio</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <a href="/confidentialite">Confidentialité</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

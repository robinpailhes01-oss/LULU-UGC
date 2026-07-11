const items = [
  "Hôtels",
  "Restaurants",
  "Logements insolites",
  "Expériences",
  "Occitanie",
];

/** Bandeau éditorial défilant entre le hero et la suite de la page. */
export default function Marquee() {
  return (
    <section
      aria-label="Hôtels, restaurants, logements insolites, expériences — Occitanie"
      className="marquee overflow-hidden border-y border-line bg-espresso py-5"
    >
      <div className="marquee-track flex w-max items-center">
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1 || undefined}
            className="flex items-center"
          >
            {items.map((item) => (
              <li
                key={`${copy}-${item}`}
                className="flex items-center gap-10 pr-10 font-display text-2xl font-light italic text-cream md:text-3xl"
              >
                {item}
                <span
                  className="h-1.5 w-1.5 rounded-full bg-honey"
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

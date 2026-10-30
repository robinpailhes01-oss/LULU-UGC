"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Parties interactives de la page de vente /experience-content-day.
 * Tout reste lisible sans JavaScript ; les animations sont coupées
 * quand l'utilisateur a demandé moins de mouvement (voir lp.css).
 */

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Barre de progression de lecture + révélations au scroll (.lp-rv). */
export function LpEngine() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = root.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const els = Array.from(document.querySelectorAll<HTMLElement>(".lp-rv"));
    let io: IntersectionObserver | null = null;
    if (reduced() || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
    } else {
      io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              io?.unobserve(e.target);
            }
          }),
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );
      els.forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) el.classList.add("is-in");
        else io?.observe(el);
      });
    }
    document.documentElement.classList.add("lp-js");
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, []);
  return <div className="lp-progress" aria-hidden="true"><div ref={bar} /></div>;
}

/** Mot qui change sous le titre : « Pour votre gîte », « chalet »… */
export function Rotator({ words, prefix }: { words: string[]; prefix: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % words.length), 2600);
    return () => window.clearInterval(t);
  }, [words.length]);
  return (
    <p className="lp-rotator">
      <span className="lp-sr">{`${prefix} ${words.join(", ")}`}</span>
      <span aria-hidden="true">
        {prefix}{" "}
        <span className="lp-rotator__win">
          <span key={i} className="lp-rotator__word">{words[i]}</span>
        </span>
      </span>
    </p>
  );
}

/** « Si vous vous reconnaissez » : des cases « C'est moi » et un compteur. */
export function PainCheck({ items }: { items: Array<{ t: string; d: string }> }) {
  const [on, setOn] = useState<boolean[]>(() => items.map(() => false));
  const n = on.filter(Boolean).length;
  const msg =
    n === 0
      ? "Touchez les phrases qui vous ressemblent."
      : n === 1
        ? "Une seule ? C'est déjà une bonne raison d'en parler."
        : n < items.length
          ? `${n} sur ${items.length}. C'est exactement pour ça que j'ai créé cette journée.`
          : "Toutes. On a vraiment des choses à se dire.";
  return (
    <div className="lp-pain">
      <div className="lp-pain__head">
        <span className="lp-pain__av" aria-hidden="true">Vous</span>
        <div>
          <p className="lp-pain__who">Vous, dans votre tête</p>
          <p className="lp-pain__when">un dimanche soir, téléphone à la main</p>
        </div>
      </div>
      <ul className="lp-pain__list">
        {items.map((it, k) => (
          <li key={it.t} className={on[k] ? "is-on" : undefined}>
            <p className="lp-pain__t">{`«\u00a0${it.t}\u00a0»`}</p>
            <p className="lp-pain__d">{it.d}</p>
            <button
              type="button"
              className="lp-pain__btn"
              aria-pressed={on[k]}
              onClick={() => setOn((s) => s.map((v, j) => (j === k ? !v : v)))}
            >
              <span className="lp-pain__box" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="12" height="12"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              C&apos;est moi
            </button>
          </li>
        ))}
      </ul>
      <div className="lp-pain__foot" aria-live="polite">
        <p className="lp-pain__count">
          <span>Et vous ?</span> <b>{n}</b>/{items.length}
        </p>
        <p className="lp-pain__msg">{msg}</p>
      </div>
    </div>
  );
}

export type DemoCase = {
  id: string;
  tab: string;
  handle: string;
  image: string;
  alt: string;
  pos?: string;
  hook: string;
  legende: string;
  steps: string[];
};

/** Démo à onglets : un Reel d'exemple à gauche, les coulisses à droite. */
export function DemoTabs({ cases }: { cases: DemoCase[] }) {
  const [cur, setCur] = useState(0);
  const [run, setRun] = useState(0);
  const [shown, setShown] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const c = cases[cur];

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) return setVisible(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (reduced()) {
      setShown(c.steps.length + 1);
      return;
    }
    setShown(0);
    let k = 0;
    const t = window.setInterval(() => {
      k += 1;
      setShown(k);
      if (k > c.steps.length) window.clearInterval(t);
    }, 750);
    return () => window.clearInterval(t);
  }, [cur, run, visible, c.steps.length]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (cur + (e.key === "ArrowRight" ? 1 : cases.length - 1)) % cases.length;
    setCur(next);
    document.getElementById(`lp-tab-${cases[next].id}`)?.focus();
  };

  const done = shown > c.steps.length;
  return (
    <div className="lp-demo" ref={box}>
      <div className="lp-demo__tabs" role="tablist" aria-label="Votre lieu" onKeyDown={onKey}>
        <span className="lp-demo__lbl">Votre lieu :</span>
        {cases.map((x, k) => (
          <button
            key={x.id}
            id={`lp-tab-${x.id}`}
            role="tab"
            type="button"
            aria-selected={k === cur}
            aria-controls="lp-demo-panel"
            tabIndex={k === cur ? 0 : -1}
            className="lp-chip"
            onClick={() => setCur(k)}
          >
            {x.tab}
          </button>
        ))}
      </div>
      <div className="lp-demo__grid" id="lp-demo-panel" role="tabpanel" aria-labelledby={`lp-tab-${c.id}`}>
        <figure className="lp-phone" key={c.id}>
          <div className="lp-phone__bar">
            <span className="lp-phone__av" aria-hidden="true">{c.handle.slice(1, 2).toUpperCase()}</span>
            <span className="lp-phone__h">{c.handle}</span>
            <span className="lp-tag">Exemple illustratif</span>
          </div>
          <div className="lp-phone__media">
            <img src={c.image} alt={c.alt} loading="lazy" decoding="async" style={{ objectPosition: c.pos ?? "50% 40%" }} />
            <p className="lp-phone__hook">{c.hook}</p>
            <span className="lp-phone__play" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
            </span>
          </div>
          <figcaption className="lp-phone__cap">
            <b>{c.handle.slice(1)}</b> {c.legende}
          </figcaption>
        </figure>
        <div className="lp-wings">
          <div className="lp-wings__head">
            <span className="lp-orb" aria-hidden="true" />
            <div>
              <p className="lp-eyebrow lp-eyebrow--dark">En coulisses</p>
              <p className="lp-wings__title">Votre Content Board</p>
              <p className="lp-wings__state">{done ? "Prêt à publier" : "Je prépare…"}</p>
            </div>
          </div>
          <ol className="lp-wings__list">
            {c.steps.map((s, k) => (
              <li key={s} className={k < shown ? "is-done" : k === shown ? "is-run" : undefined}>
                <span className="lp-wings__n" aria-hidden="true">{String(k + 1).padStart(2, "0")}</span>
                <span>{s}</span>
                <span className="lp-wings__st" aria-hidden="true" />
              </li>
            ))}
          </ol>
          <button type="button" className="lp-replay" onClick={() => setRun((r) => r + 1)}>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Revoir
          </button>
        </div>
      </div>
    </div>
  );
}

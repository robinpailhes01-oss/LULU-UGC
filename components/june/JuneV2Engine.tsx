"use client";

import { useEffect } from "react";

/**
 * Moteur de la page d'accueil V2 : l'heure dorée du fond, le mur qui se longe
 * (parallaxe par colonne), les plaques qui se développent, le miroir en
 * paliers, les étapes du process et les révélations calmes.
 * Tout est visible immédiatement quand prefers-reduced-motion est actif.
 */
export default function JuneV2Engine() {
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document.documentElement;
    const body = document.body;
    body.classList.add("v2");
    const nav = document.getElementById("nav");
    const wall = document.getElementById("wall");
    const cols = wall ? Array.from(wall.querySelectorAll<HTMLElement>(".col")) : [];
    const plates = Array.from(document.querySelectorAll<HTMLElement>(".plate[data-dev]"));
    const heroPlates = cols
      .flatMap((c) => Array.from(c.querySelectorAll<HTMLElement>(".plate")))
      .filter((p) => p.offsetParent !== null)
      .sort((a, b) => (b.querySelector("[data-count]") ? 1 : 0) - (a.querySelector("[data-count]") ? 1 : 0));
    const mirror = document.getElementById("mirror");
    const lines = mirror ? Array.from(mirror.querySelectorAll<HTMLElement>(".mirror__l")) : [];
    const bar = mirror?.querySelector<HTMLElement>(".mirror__bar i") ?? null;
    const stepsEl = document.getElementById("steps");
    const steps = stepsEl ? Array.from(stepsEl.children) : [];
    const darks = Array.from(document.querySelectorAll<HTMLElement>("[data-dark]"));

    const STOPS: Array<[number, [number, number, number]]> = [
      [0, [244, 240, 232]],
      [0.3, [242, 234, 217]],
      [0.6, [242, 227, 198]],
      [0.85, [238, 218, 188]],
      [1, [234, 210, 175]],
    ];
    const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
    const canvas = (d: number) => {
      let a = STOPS[0];
      let b = STOPS[STOPS.length - 1];
      for (let i = 0; i < STOPS.length - 1; i++) {
        if (d >= STOPS[i][0] && d <= STOPS[i + 1][0]) {
          a = STOPS[i];
          b = STOPS[i + 1];
          break;
        }
      }
      const t = (d - a[0]) / Math.max(b[0] - a[0], 1e-4);
      return a[1].map((v, i) => Math.round(v + (b[1][i] - v) * t));
    };

    let heroReady = reduce;
    const develop = () => {
      const vh = innerHeight;
      for (const p of plates) {
        if (!heroReady && heroPlates.includes(p)) continue;
        const r = p.getBoundingClientRect();
        const t = clamp((vh * 0.92 - r.top) / (vh * 0.42), 0, 1);
        const cur = parseFloat(p.style.getPropertyValue("--dev")) || 0;
        if (t > cur || r.top > vh) p.style.setProperty("--dev", t.toFixed(3));
      }
    };

    const rafs: number[] = [];
    if (!reduce) {
      heroPlates.forEach((p, i) => {
        const start = 350 + i * 130;
        const dur = 1100;
        const t0 = performance.now();
        const tick = (now: number) => {
          const t = clamp((now - t0 - start) / dur, 0, 1);
          const e = 1 - Math.pow(1 - t, 3);
          p.style.setProperty("--dev", e.toFixed(3));
          if (t < 1) rafs.push(requestAnimationFrame(tick));
          else if (i === heroPlates.length - 1) heroReady = true;
        };
        rafs.push(requestAnimationFrame(tick));
      });
    } else {
      plates.forEach((p) => p.style.setProperty("--dev", "1"));
    }

    let lastY = scrollY;
    let queued = false;
    const apply = () => {
      queued = false;
      const y = scrollY;
      const vh = innerHeight;
      const max = Math.max(doc.scrollHeight - vh, 1);
      const day = clamp(y / max, 0, 1);
      const c = canvas(day);
      doc.style.setProperty("--day", day.toFixed(4));
      doc.style.setProperty("--sc-canvas", `rgb(${c[0]},${c[1]},${c[2]})`);

      if (nav) {
        nav.classList.toggle("is-scrolled", y > 24);
        nav.classList.toggle("is-hidden", y > 420 && y > lastY + 4);
      }
      lastY = y;
      body.classList.toggle(
        "on-dark",
        darks.some((el) => {
          const r = el.getBoundingClientRect();
          return r.top <= 44 && r.bottom >= 44;
        })
      );

      if (!reduce) {
        const sy = Math.min(y, vh * 1.4);
        for (const col of cols) col.style.setProperty("--sy", `${(-sy).toFixed(1)}px`);
      }

      if (mirror && !reduce && lines.length) {
        const r = mirror.getBoundingClientRect();
        const prog = clamp(-r.top / (r.height - vh), 0, 1);
        const idx = Math.min(Math.floor(prog * lines.length), lines.length - 1);
        const started = r.top <= 0;
        lines.forEach((l, i) => {
          l.classList.toggle("is-on", started && i === idx);
          l.classList.toggle("is-past", started && i < idx);
        });
        if (bar) bar.style.setProperty("--pp", prog.toFixed(3));
      }

      if (stepsEl && !reduce) {
        const r = stepsEl.getBoundingClientRect();
        const prog = clamp((vh * 0.88 - r.top) / (vh * 0.75), 0, 1);
        const on = Math.min(Math.floor(prog * steps.length), steps.length - 1);
        steps.forEach((s, i) => {
          s.classList.toggle("is-past", prog > 0 && i < on);
          s.classList.toggle("is-on", prog > 0 && i === on);
        });
      }
      develop();
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      rafs.push(requestAnimationFrame(apply));
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    apply();
    if (!reduce) {
      let n = 0;
      const loop = () => {
        develop();
        if (n++ < 140) rafs.push(requestAnimationFrame(loop));
      };
      rafs.push(requestAnimationFrame(loop));
    }

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    document.querySelectorAll(".rv").forEach((el) => io.observe(el));

    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      rafs.forEach((id) => cancelAnimationFrame(id));
      io.disconnect();
      doc.style.removeProperty("--day");
      doc.style.removeProperty("--sc-canvas");
      body.classList.remove("v2", "on-dark");
    };
  }, []);

  return null;
}

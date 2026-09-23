"use client";

import { useEffect } from "react";

/**
 * Moteur de la page d'accueil (version finale) : l'heure dorée du fond,
 * la barre de navigation, les plaques qui se développent à l'entrée, les
 * révélations calmes des textes, et les vidéos qui se lancent au scroll
 * (ou au survol sur ordinateur), sans son.
 * Tout est visible immédiatement quand prefers-reduced-motion est actif.
 */
export default function JuneV3Engine() {
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hover = matchMedia("(hover: hover)").matches;
    const doc = document.documentElement;
    const body = document.body;
    body.classList.add("v3", "v4");
    const nav = document.getElementById("nav");
    const plates = Array.from(document.querySelectorAll<HTMLElement>(".plate[data-dev]"));
    const darks = Array.from(document.querySelectorAll<HTMLElement>("[data-dark]"));
    const pxs = Array.from(document.querySelectorAll<HTMLElement>("[data-px]"));

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

    const develop = () => {
      const vh = innerHeight;
      for (const p of plates) {
        const r = p.getBoundingClientRect();
        const t = clamp((vh * 0.92 - r.top) / (vh * 0.42), 0, 1);
        const cur = parseFloat(p.style.getPropertyValue("--dev")) || 0;
        if (t > cur || r.top > vh) p.style.setProperty("--dev", t.toFixed(3));
      }
    };
    if (reduce) plates.forEach((p) => p.style.setProperty("--dev", "1"));

    const rafs: number[] = [];
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
        nav.classList.toggle("is-hidden", y > 480 && y > lastY + 4);
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
        develop();
        /* parallaxe très discrète : quelques pixels sur les grandes images */
        for (const el of pxs) {
          const r = el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh) continue;
          const c = (r.top + r.height / 2 - vh / 2) / vh;
          const k = parseFloat(el.dataset.px || "24");
          el.style.setProperty("--px", `${(c * k).toFixed(1)}px`);
        }
      }
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

    /* révélations calmes */
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

    /* vidéos : lecture quand visibles (scroll), ou au survol sur ordinateur */
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>("video[data-auto]"));
    const tryPlay = (v: HTMLVideoElement) => {
      const p = v.play();
      if (p) p.catch(() => {});
    };
    const vio = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          const v = e.target as HTMLVideoElement;
          const hoverOnly = hover && v.dataset.auto === "hover";
          if (e.isIntersecting && !hoverOnly && !reduce) tryPlay(v);
          else v.pause();
        }),
      { threshold: 0.35 }
    );
    const hoverHandlers: Array<[HTMLElement, () => void, () => void]> = [];
    videos.forEach((v) => {
      vio.observe(v);
      if (hover && v.dataset.auto === "hover") {
        const host = v.closest<HTMLElement>("[data-hover-host]") ?? v;
        const on = () => tryPlay(v);
        const off = () => v.pause();
        host.addEventListener("mouseenter", on);
        host.addEventListener("mouseleave", off);
        hoverHandlers.push([host, on, off]);
      }
      v.addEventListener("playing", () => v.classList.add("is-playing"));
      v.addEventListener("pause", () => v.classList.remove("is-playing"));
      v.addEventListener("error", () => v.classList.add("is-missing"), { once: true });
      Array.from(v.querySelectorAll("source")).at(-1)?.addEventListener("error", () => v.classList.add("is-missing"), { once: true });
    });

    /* boutons magnétiques : le bouton suit légèrement le curseur (ordinateur) */
    const mags: Array<[HTMLElement, (e: PointerEvent) => void, () => void]> = [];
    if (hover && !reduce) {
      document.querySelectorAll<HTMLElement>(".btn").forEach((b) => {
        const mv = (e: PointerEvent) => {
          const r = b.getBoundingClientRect();
          b.style.setProperty("--mx", `${((e.clientX - (r.left + r.width / 2)) * 0.22).toFixed(1)}px`);
          b.style.setProperty("--my", `${((e.clientY - (r.top + r.height / 2)) * 0.22).toFixed(1)}px`);
        };
        const lv = () => {
          b.style.setProperty("--mx", "0px");
          b.style.setProperty("--my", "0px");
        };
        b.addEventListener("pointermove", mv);
        b.addEventListener("pointerleave", lv);
        mags.push([b, mv, lv]);
      });
    }

    return () => {
      mags.forEach(([b, mv, lv]) => {
        b.removeEventListener("pointermove", mv);
        b.removeEventListener("pointerleave", lv);
      });
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      rafs.forEach((id) => cancelAnimationFrame(id));
      io.disconnect();
      vio.disconnect();
      hoverHandlers.forEach(([h, on, off]) => {
        h.removeEventListener("mouseenter", on);
        h.removeEventListener("mouseleave", off);
      });
      doc.style.removeProperty("--day");
      doc.style.removeProperty("--sc-canvas");
      body.classList.remove("v3", "v4", "on-dark");
    };
  }, []);

  return null;
}

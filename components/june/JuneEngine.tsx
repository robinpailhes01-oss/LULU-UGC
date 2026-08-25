"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    ScrollCraft?: { mount: (root: Document | Element | string) => unknown };
  }
}

/**
 * Monte l'engine scrollcraft (public/scrollcraft.js, jamais modifié) puis
 * démarre le soleil de la page : la progression absolue du scroll pilote
 * `--day` (0 = matin, 1 = soir) et la teinte du fond `--sc-canvas`.
 */
export default function JuneEngine() {
  useEffect(() => {
    let stopSun: (() => void) | undefined;

    const start = () => {
      window.ScrollCraft?.mount(document);
      stopSun = startGoldenHour();
    };

    if (window.ScrollCraft) {
      start();
    } else {
      const s = document.createElement("script");
      s.src = "/scrollcraft.js";
      s.onload = start;
      document.body.appendChild(s);
    }

    return () => {
      stopSun?.();
    };
  }, []);

  return null;
}

/* La journée en cinq teintes, toutes dans la même famille chaude et toutes
   lisibles avec l'encre espresso (#241D17). Le crépuscule profond est la
   plaque de clôture, pas le canvas. */
const STOPS: Array<[number, [number, number, number]]> = [
  [0, [244, 240, 232]],
  [0.3, [242, 234, 217]],
  [0.6, [242, 227, 198]],
  [0.85, [238, 218, 188]],
  [1, [234, 210, 175]],
];

function startGoldenHour() {
  const doc = document.documentElement;
  let raf = 0;
  let queued = false;

  const apply = () => {
    queued = false;
    const max = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const day = Math.min(Math.max(window.scrollY / max, 0), 1);
    doc.style.setProperty("--day", day.toFixed(4));
    document.body.classList.toggle("is-dusk", day > 0.86);

    let a = STOPS[0];
    let b = STOPS[STOPS.length - 1];
    for (let i = 0; i < STOPS.length - 1; i++) {
      if (day >= STOPS[i][0] && day <= STOPS[i + 1][0]) {
        a = STOPS[i];
        b = STOPS[i + 1];
        break;
      }
    }
    const t = (day - a[0]) / Math.max(b[0] - a[0], 0.0001);
    const mix = a[1].map((v, i) => Math.round(v + (b[1][i] - v) * t));
    doc.style.setProperty("--sc-canvas", `rgb(${mix[0]},${mix[1]},${mix[2]})`);
  };

  const onScroll = () => {
    if (queued) return;
    queued = true;
    raf = requestAnimationFrame(apply);
  };

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  apply();

  return () => {
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", onScroll);
    cancelAnimationFrame(raf);
    doc.style.removeProperty("--day");
    doc.style.removeProperty("--sc-canvas");
    document.body.classList.remove("is-dusk");
  };
}

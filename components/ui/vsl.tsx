"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

/*
   Bloc vidéo de présentation (VSL). Le fichier est attendu dans
   public/video/vsl.mp4 ; tant qu'il manque, l'affiche reste avec le bouton
   lecture et un message discret au clic.
*/
export default function Vsl({ src, poster, label, title }: { src: string; poster: string; label: string; title: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "missing">("idle");

  const play = () => {
    const v = ref.current;
    if (!v) return;
    v.play().then(() => setState("playing")).catch(() => setState("missing"));
  };

  return (
    <section className="bg-ivory px-5 pb-24 pt-6 md:pb-32" aria-label="Vidéo de présentation">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
        <p className="k">{label}</p>
        <h2 className="font-display text-[clamp(1.7rem,1.1rem+2vw,2.8rem)] leading-tight text-ink [font-variation-settings:'opsz'_144,'SOFT'_10]" style={{ fontWeight: 340 }}>
          {title}
        </h2>
        <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-[4px] bg-sand shadow-[0_40px_80px_-40px_rgba(33,28,24,0.5)]">
          <video ref={ref} className="h-full w-full object-cover" poster={poster} controls={state === "playing"} playsInline preload="metadata" onError={() => setState("missing")} onEnded={() => setState("idle")}>
            <source src={src} type="video/mp4" />
          </video>
          {state !== "playing" && (
            <button type="button" onClick={play} className="group absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/25 text-ivory transition-colors hover:bg-ink/35" aria-label="Lire la vidéo">
              <span className="grid size-20 place-items-center rounded-full border border-ivory/80 bg-ink/30 backdrop-blur-sm transition-transform duration-500 group-hover:scale-105">
                <Play className="ml-1 size-7" fill="currentColor" />
              </span>
              <span className="text-[0.66rem] font-semibold uppercase tracking-[0.24em]">{state === "missing" ? "Vidéo à venir" : "Regarder"}</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

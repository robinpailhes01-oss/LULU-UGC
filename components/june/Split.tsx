"use client";

import { createElement, isValidElement, useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/*
   Titre révélé ligne par ligne : chaque mot glisse depuis le bas de sa
   propre fenêtre, avec un décalage par ligne. Adapté du « Text Reveal
   (Mask) » de 21st.dev, sans dépendance : mesure des lignes par offsetTop,
   transitions CSS, IntersectionObserver. Tout est visible d'emblée quand
   prefers-reduced-motion est actif.
*/

type Tok = { t: "w"; text: string; em: boolean } | { t: "br" };

function tokens(node: ReactNode, em = false): Tok[] {
  if (typeof node === "string") return node.split(/\s+/).filter(Boolean).map((text) => ({ t: "w", text, em }));
  if (Array.isArray(node)) return node.flatMap((n) => tokens(n, em));
  if (isValidElement(node)) {
    if (node.type === "br") return [{ t: "br" }];
    const props = node.props as { children?: ReactNode };
    return tokens(props.children, em || node.type === "em");
  }
  return [];
}

export default function Split({ as = "h2", className = "", children, delay = 0, style }: { as?: "h1" | "h2" | "h3" | "p"; className?: string; children: ReactNode; delay?: number; style?: CSSProperties }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = Array.from(el.querySelectorAll<HTMLElement>(".sw"));
    const measure = () => {
      let line = -1;
      let last = -1e9;
      for (const w of words) {
        const top = w.offsetTop;
        if (top > last + 2) {
          line++;
          last = top;
        }
        w.style.setProperty("--li", String(line));
      }
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("in");
      return () => ro.disconnect();
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const toks = tokens(children);
  const label = toks.map((t) => (t.t === "w" ? t.text : "\n")).join(" ");
  const out: ReactNode[] = [];
  toks.forEach((t, i) => {
    if (t.t === "br") {
      out.push(<br key={i} />);
      return;
    }
    out.push(
      <span className="sw" key={i}>
        {t.em ? <em className="si">{t.text}</em> : <span className="si">{t.text}</span>}
      </span>,
      " "
    );
  });
  return createElement(as, { ref, className: `split ${className}`.trim(), "aria-label": label, style: { "--sd": `${delay}ms`, ...style } as CSSProperties }, out);
}

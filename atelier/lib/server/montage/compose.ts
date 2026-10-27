/**
 * Constructeur de composition HyperFrames : (spécification du montage + style résolu) → document
 * HTML complet, conforme au contrat HyperFrames (racine data-composition-id / data-width /
 * data-height / data-duration, éléments minutés data-start / data-duration, UNE timeline GSAP en
 * pause enregistrée dans window.__timelines).
 *
 * Fonction pure et déterministe (ni Math.random ni Date) : le même montage donne toujours le même
 * HTML. Elle ne connaît aucun style en dur : typographies, couleurs, animations des textes,
 * transitions, rythme, look et carte de fin viennent du style (skill « montage ») ou de la
 * spécification, qui prime toujours. Les URLs des médias sont fournies par l'appelant (`media`),
 * pour servir le même constructeur à l'aperçu, au code enregistré et aux différents rendus.
 *
 * Mode avancé : si le style fournit un modèle (fichier annexe « template.html »), les plans,
 * textes, carte de fin, musique et la timeline y sont injectés aux emplacements prévus
 * (voir lib/server/montage/template.ts et docs/montage.md).
 */
import type { Asset, MontageClip, MontageSpec, MontageText } from "@/lib/shared/types";
import { FORMAT_SIZE, SAFE_AREA, computeTiming, textWindow, type ClipTiming, type MontageTiming } from "@/lib/client/montage/timing";
import type { ResolvedStyle } from "@/lib/client/montage/style";
import { atelierFinding, type MontageFinding } from "@/lib/server/montage/lint";
import { lookMarkup } from "@/lib/server/montage/look";
import type { MediaVariant } from "@/lib/server/montage/media";
import { applyTemplate, type TemplateParts } from "@/lib/server/montage/template";

export const COMPOSITION_ID = "atelier-montage";
/** Version de GSAP épinglée par HyperFrames 0.8.150 (@hyperframes/core gsapCdn). */
export const GSAP_URL = "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js";

export interface BuildOptions {
  style: ResolvedStyle;
  title: string;
  /** Modèle HyperFrames fourni par le style (annexe « template.html »), facultatif. */
  template?: string | null;
}

export interface BuildResult {
  html: string;
  durationS: number;
  width: number;
  height: number;
  timing: MontageTiming;
  /** Remarques d'Atelier (média manquant, modèle invalide…), fusionnées avec le lint HyperFrames. */
  findings: MontageFinding[];
  mode: "generic" | "template";
}

export type MediaUrl = (asset: Asset, variant: MediaVariant) => string;

// ---------------------------------------------------------------------------------------------
// Petites aides

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const num = (v: number) => String(Math.round(v * 1000) / 1000);
const px = (v: number) => `${Math.round(v)}px`;

/** Timeline GSAP sérialisée ; ajoute immediateRender:false aux fromTo répétés (règle HyperFrames). */
class TimelineWriter {
  readonly lines: string[] = [];
  private seen = new Set<string>();

  fromTo(target: string, from: Record<string, number | string>, to: Record<string, number | string | boolean>, at: number) {
    const vars: Record<string, number | string | boolean> = { ...to };
    for (const [k, v] of Object.entries(vars)) if (typeof v === "number") vars[k] = Math.round(v * 1000) / 1000;
    const fromVars: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(from)) fromVars[k] = typeof v === "number" ? Math.round(v * 1000) / 1000 : v;
    if (this.seen.has(target)) vars.immediateRender = false;
    this.seen.add(target);
    this.lines.push(`tl.fromTo(${JSON.stringify(target)}, ${JSON.stringify(fromVars)}, ${JSON.stringify(vars)}, ${num(Math.max(0, at))});`);
  }
}

function googleFontLinks(fonts: ResolvedStyle["fonts"]): string {
  const enc = (f: string) => encodeURIComponent(f.trim()).replace(/%20/g, "+");
  const display = `https://fonts.googleapis.com/css2?family=${enc(fonts.display)}:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&display=block`;
  const text = `https://fonts.googleapis.com/css2?family=${enc(fonts.text)}:wght@400;500;600;700&display=block`;
  const links = [display];
  if (fonts.text.trim().toLowerCase() !== fonts.display.trim().toLowerCase()) links.push(text);
  return links.map((href) => `<link rel="stylesheet" href="${esc(href)}">`).join("\n");
}

/** Luminance relative approximative d'une couleur CSS (#hex ou rgb()) ; 1 si illisible. */
export function luminance(color: string): number {
  let r = 255;
  let g = 255;
  let b = 255;
  const hex = /^#([0-9a-f]{3,8})$/i.exec(color.trim());
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    const m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(color);
    if (!m) return 1;
    r = Number(m[1]);
    g = Number(m[2]);
    b = Number(m[3]);
  }
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// ---------------------------------------------------------------------------------------------
// Textes : *mot* = accent italique (couleur d'accent), retour à la ligne conservé.

interface Segment {
  text: string;
  accent: boolean;
}

function segments(line: string): Segment[] {
  const out: Segment[] = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  for (const m of line.matchAll(re)) {
    if (m.index! > last) out.push({ text: line.slice(last, m.index), accent: false });
    out.push({ text: m[1], accent: true });
    last = m.index! + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), accent: false });
  return out;
}

/** Texte découpé en mots (span.w) ou en lettres (span.w > span.c), dans une ligne animable. */
export function textMarkup(text: string, mode: "words" | "chars"): { html: string; words: number; chars: number } {
  let words = 0;
  let chars = 0;
  const word = (w: string) => {
    words++;
    if (mode === "chars") {
      const letters = Array.from(w).map((ch) => {
        chars++;
        return `<span class="c">${esc(ch)}</span>`;
      });
      return `<span class="w">${letters.join("")}</span>`;
    }
    return `<span class="w">${esc(w)}</span>`;
  };
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) =>
      segments(line)
        .map((seg) => {
          const ws = seg.text.split(/\s+/).filter(Boolean).map(word).join(" ");
          if (!ws) return "";
          const lead = /^\s/.test(seg.text) ? " " : "";
          const trail = /\s$/.test(seg.text) ? " " : "";
          return seg.accent ? `${lead}<em class="acc">${ws}</em>${trail}` : `${lead}${ws}${trail}`;
        })
        .join("")
        .trim(),
    );
  return { html: `<span class="line">${lines.join("<br>")}</span>`, words, chars };
}

// ---------------------------------------------------------------------------------------------

/** Construit la composition HyperFrames complète d'un montage. */
export function buildComposition(spec: MontageSpec, assets: Map<string, Asset>, media: MediaUrl, opts: BuildOptions): BuildResult {
  const style = opts.style;
  const { width: W, height: H } = FORMAT_SIZE[spec.format] ?? FORMAT_SIZE["9:16"];
  const safe = SAFE_AREA[spec.format] ?? SAFE_AREA["9:16"];
  const base = Math.min(W, H);
  const timing = computeTiming(spec);
  const D = timing.durationS;
  const findings: MontageFinding[] = [];
  const tl = new TimelineWriter();
  const look = lookMarkup(spec.look);
  if (look.error) findings.push(atelierFinding("warning", "atelier_look_invalid", `Le look n'a pas pu être appliqué (${look.error}) : les plans gardent leurs couleurs d'origine.`));

  // --- Plans -----------------------------------------------------------------------------------
  const shots: string[] = [];
  spec.clips.forEach((clip, i) => {
    const t = timing.clips[i];
    const n = i + 1;
    shots.push(shotMarkup(clip, t, n, assets.get(clip.assetId), media, style, timing, findings));
    // Transition d'entrée (sur l'enveloppe non minutée : jamais d'opacité sur un élément .clip).
    if (i > 0 && t.overlapS > 0) {
      const ov = t.overlapS;
      if (spec.transition === "fade") tl.fromTo(`#shot-${n}`, { opacity: 0 }, { opacity: 1, duration: ov, ease: "none" }, t.startS);
      else if (spec.transition === "zoom") tl.fromTo(`#shot-${n}`, { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: ov, ease: "power2.out" }, t.startS);
      else if (spec.transition === "slide") {
        tl.fromTo(`#shot-${n}`, { xPercent: 100 }, { xPercent: 0, duration: ov, ease: "power3.inOut" }, t.startS);
        tl.fromTo(`#shot-${n - 1}`, { xPercent: 0 }, { xPercent: -30, duration: ov, ease: "power3.inOut" }, t.startS);
      }
    }
    // Mouvement lent (Ken Burns) sur l'enveloppe intérieure.
    const motion = clip.motion ?? "none";
    if (motion !== "none" && style.motionAmount > 0) {
      const s = 1 + style.motionAmount;
      const p = style.motionAmount * 45;
      const d = t.durationS;
      if (motion === "zoom-in") tl.fromTo(`#move-${n}`, { scale: 1 }, { scale: s, duration: d, ease: "none" }, t.startS);
      else if (motion === "zoom-out") tl.fromTo(`#move-${n}`, { scale: s }, { scale: 1, duration: d, ease: "none" }, t.startS);
      else if (motion === "pan-left") tl.fromTo(`#move-${n}`, { scale: s, xPercent: p }, { scale: s, xPercent: -p, duration: d, ease: "none" }, t.startS);
      else if (motion === "pan-right") tl.fromTo(`#move-${n}`, { scale: s, xPercent: -p }, { scale: s, xPercent: p, duration: d, ease: "none" }, t.startS);
    }
  });
  if (spec.clips.length === 0) findings.push(atelierFinding("warning", "atelier_no_clips", "Le montage n'a encore aucun plan : ajoutez des photos ou des vidéos."));

  const overlays = look.vignette > 0 ? `<div class="vignette" style="opacity:${num(look.vignette)}"></div>` : "";

  // --- Textes ------------------------------------------------------------------------------------
  const texts: string[] = [];
  spec.texts.forEach((txt, i) => {
    const win = textWindow(txt, D);
    if (!win) {
      findings.push(atelierFinding("warning", "atelier_text_out_of_range", `Le texte « ${txt.text.slice(0, 40)} » commence après la fin du montage : il n'est pas affiché.`));
      return;
    }
    texts.push(textElement(txt, `text-${i + 1}`, win, style, tl, base));
  });

  // --- Carte de fin ------------------------------------------------------------------------------
  let endCard = "";
  if (spec.endCard && timing.endCard) {
    endCard = endCardMarkup(spec.endCard, timing.endCard, spec.transition, style, tl, base);
  }

  // --- Musique -----------------------------------------------------------------------------------
  let audio = "";
  if (spec.musicAssetId) {
    const a = assets.get(spec.musicAssetId);
    if (!a) findings.push(atelierFinding("error", "atelier_missing_media", "La musique choisie est introuvable dans la médiathèque (supprimée ?).", { elementId: "music" }));
    else if (a.kind === "photo") findings.push(atelierFinding("warning", "atelier_music_not_audio", `« ${a.name} » n'est pas un son : musique ignorée.`, { elementId: "music" }));
    else {
      const dur = a.durationS && a.durationS > 0 ? Math.min(D, a.durationS) : D;
      const fadeOut = Math.min(style.music.fadeOutS, dur / 2);
      const vol = Math.max(0, Math.min(1, spec.musicVolume));
      audio = `<audio id="music" data-start="0" data-duration="${num(dur)}" data-track-index="9" data-volume="${num(vol)}" data-fade-in="${num(Math.min(0.3, dur / 4))}"${fadeOut > 0 ? ` data-fade-out="${num(fadeOut)}"` : ""} src="${esc(media(a, "original"))}"></audio>`;
    }
  }

  const css = baseCss(W, H, safe, base, style, look.filterCss);
  const head = [googleFontLinks(style.fonts), `<script src="${GSAP_URL}"></script>`, `<style>\n${css}\n</style>`].join("\n");
  const scriptBody = (extra: string) =>
    [
      "window.__timelines = window.__timelines || {};",
      "const tl = gsap.timeline({ paused: true });",
      ...tl.lines,
      extra,
      `window.__timelines[${JSON.stringify(COMPOSITION_ID)}] = tl;`,
    ]
      .filter(Boolean)
      .join("\n");

  const tokens: Record<string, string> = {
    ATELIER_ID: COMPOSITION_ID,
    ATELIER_WIDTH: String(W),
    ATELIER_HEIGHT: String(H),
    ATELIER_DURATION: num(D),
    ATELIER_FPS: String(spec.fps),
    ATELIER_FORMAT: spec.format,
    ATELIER_TITLE: esc(opts.title),
  };

  if (opts.template && opts.template.trim()) {
    const info = {
      width: W,
      height: H,
      durationS: D,
      fps: spec.fps,
      format: spec.format,
      clips: timing.clips.map((c, i) => ({ id: `clip-${i + 1}`, shot: `shot-${i + 1}`, move: `move-${i + 1}`, startS: c.startS, durationS: c.durationS, kind: assets.get(spec.clips[i].assetId)?.kind ?? null })),
      texts: spec.texts.map((t, i) => ({ id: `text-${i + 1}`, style: t.style, position: t.position, ...(textWindow(t, D) ?? { startS: 0, durationS: 0 }) })),
      endCard: timing.endCard ? { id: "endcard", startS: timing.endCard.startS, durationS: timing.endCard.durationS } : null,
      colors: style.colors,
      fonts: style.fonts,
    };
    const parts: TemplateParts = {
      head: `${googleFontLinks(style.fonts)}\n<style>\n${css}\n</style>`,
      gsap: `<script src="${GSAP_URL}"></script>`,
      svg: look.svg ?? "",
      clips: shots.join("\n"),
      overlays,
      texts: texts.join("\n"),
      endCard,
      audio,
      script: `<script>\n${scriptBody(`const ATELIER = ${JSON.stringify(info)};\nif (typeof window.atelierTemplate === "function") window.atelierTemplate(tl, ATELIER);`)}\n</script>`,
      tokens,
    };
    const out = applyTemplate(opts.template, parts);
    if ("html" in out) return { html: out.html, durationS: D, width: W, height: H, timing, findings, mode: "template" };
    findings.push(atelierFinding("warning", "atelier_template_invalid", `Le modèle « template.html » du style est ignoré : ${out.error}`));
  }

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=${W}, height=${H}">
<meta name="generator" content="Atelier June${style.slug ? ` — style ${esc(style.slug)}` : ""}">
<title>${esc(opts.title)}</title>
${head}
</head>
<body>
${look.svg ?? ""}
<div id="root" data-composition-id="${COMPOSITION_ID}" data-start="0" data-duration="${num(D)}" data-fps="${spec.fps}" data-width="${W}" data-height="${H}">
${[shots.join("\n"), overlays, texts.join("\n"), endCard, audio].filter(Boolean).join("\n")}
</div>
<script>
${scriptBody("")}
</script>
</body>
</html>
`;
  return { html, durationS: D, width: W, height: H, timing, findings, mode: "generic" };
}

// ---------------------------------------------------------------------------------------------

function shotMarkup(
  clip: MontageClip,
  t: ClipTiming,
  n: number,
  asset: Asset | undefined,
  media: MediaUrl,
  style: ResolvedStyle,
  timing: MontageTiming,
  findings: MontageFinding[],
): string {
  const timed = `id="clip-${n}" data-start="${num(t.startS)}" data-duration="${num(t.durationS)}" data-track-index="${(n - 1) % 2}" data-atelier-clip="${esc(clip.id)}"`;
  let inner: string;
  if (!asset || asset.kind === "audio") {
    findings.push(
      asset
        ? atelierFinding("error", "atelier_clip_is_audio", `Le plan ${n} est un son (« ${asset.name} ») : utilisez-le comme musique.`, { elementId: `clip-${n}` })
        : atelierFinding("error", "atelier_missing_media", `Le média du plan ${n} est introuvable dans la médiathèque (supprimé ?).`, { elementId: `clip-${n}` }),
    );
    inner = `<div ${timed} class="clip media missing"><span>Média introuvable</span></div>`;
  } else if (asset.kind === "video") {
    if (asset.trashedAt) findings.push(atelierFinding("warning", "atelier_media_trashed", `Le plan ${n} utilise « ${asset.name} », qui est dans la corbeille.`, { elementId: `clip-${n}` }));
    if (asset.durationS && clip.outS > asset.durationS + 0.05)
      findings.push(atelierFinding("warning", "atelier_clip_past_source", `Le plan ${n} dépasse la fin de la vidéo source (${num(asset.durationS)} s) : la dernière image restera figée.`, { elementId: `clip-${n}` }));
    const keep = clip.muted === false || (clip.muted === undefined && style.clipVolume > 0);
    const next = timing.clips[n];
    const sound = keep
      ? `data-has-audio="true" data-volume="${num(style.clipVolume > 0 ? style.clipVolume : 1)}"${t.overlapS > 0 ? ` data-fade-in="${num(t.overlapS)}"` : ""}${next && next.overlapS > 0 ? ` data-fade-out="${num(next.overlapS)}"` : ""}`
      : "muted";
    inner = `<video ${timed} class="media" data-media-start="${num(Math.max(0, clip.inS))}" ${sound} playsinline src="${esc(media(asset, "original"))}"></video>`;
  } else {
    if (asset.trashedAt) findings.push(atelierFinding("warning", "atelier_media_trashed", `Le plan ${n} utilise « ${asset.name} », qui est dans la corbeille.`, { elementId: `clip-${n}` }));
    let variant: MediaVariant = "original";
    if (/image\/(heic|heif)/i.test(asset.mime)) {
      variant = asset.urls.thumb ? "thumb" : "original";
      findings.push(atelierFinding("warning", "atelier_heic_photo", `La photo du plan ${n} est au format HEIC, que le navigateur et le rendu ne lisent pas : sa vignette est utilisée. Exportez-la en JPEG pour une pleine qualité.`, { elementId: `clip-${n}` }));
    }
    inner = `<img ${timed} class="clip media" src="${esc(media(asset, variant))}" alt="">`;
  }
  return `<div id="shot-${n}" class="shot" style="z-index:${n}"><div id="move-${n}" class="move">${inner}</div></div>`;
}

function textElement(txt: MontageText, id: string, win: { startS: number; durationS: number }, style: ResolvedStyle, tl: TimelineWriter, base: number): string {
  const anim = style.textAnimation;
  const chars = anim === "typewriter";
  const { html, words, chars: nChars } = textMarkup(txt.text || " ", chars ? "chars" : "words");
  const tag = txt.style === "hook" || txt.style === "title" ? "h1" : "p";
  const plate = txt.style === "label" || (txt.style === "caption" && style.captions);
  const cls = ["clip", "txt", `txt-${txt.style}`, `at-${txt.position}`, plate ? "plate" : ""].filter(Boolean).join(" ");
  const start = win.startS;
  const dur = win.durationS;
  const rise = 0.032 * base;
  const enter = Math.min(0.7, dur / 3);
  switch (anim) {
    case "rise":
      if (txt.style === "hook" && words > 1) tl.fromTo(`#${id} .w`, { opacity: 0, y: rise }, { opacity: 1, y: 0, duration: enter, ease: "power3.out", stagger: Math.min(0.09, 0.9 / words) }, start);
      else tl.fromTo(`#${id} .line`, { opacity: 0, y: rise }, { opacity: 1, y: 0, duration: enter, ease: "power3.out" }, start);
      break;
    case "words":
      tl.fromTo(`#${id} .w`, { opacity: 0, y: rise * 0.6 }, { opacity: 1, y: 0, duration: Math.min(0.45, enter), ease: "power2.out", stagger: Math.min(0.12, Math.max(0.03, (dur * 0.4) / Math.max(1, words))) }, start);
      break;
    case "fade":
      tl.fromTo(`#${id} .line`, { opacity: 0 }, { opacity: 1, duration: Math.min(0.6, enter), ease: "none" }, start);
      break;
    case "typewriter":
      tl.fromTo(`#${id} .c`, { opacity: 0 }, { opacity: 1, duration: 0.01, ease: "none", stagger: Math.min(0.055, Math.max(0.012, (dur * 0.5) / Math.max(1, nChars))) }, start);
      break;
    case "none":
      break;
  }
  if (anim !== "none" && dur >= 1) {
    const exit = Math.min(0.35, dur / 5);
    tl.fromTo(`#${id} .line`, { opacity: 1 }, { opacity: 0, duration: exit, ease: "power1.in" }, start + dur - exit);
  }
  return `<${tag} id="${id}" class="${cls}" data-start="${num(start)}" data-duration="${num(dur)}" data-track-index="3" data-atelier-text="${esc(txt.id)}">${html}</${tag}>`;
}

function endCardMarkup(
  card: NonNullable<MontageSpec["endCard"]>,
  t: NonNullable<MontageTiming["endCard"]>,
  transition: MontageSpec["transition"],
  style: ResolvedStyle,
  tl: TimelineWriter,
  base: number,
): string {
  const S = t.startS;
  const D = t.durationS;
  const end = S + D;
  const enterS = Math.max(0.35, t.overlapS);
  if (transition === "fade") tl.fromTo("#endcard", { opacity: 0 }, { opacity: 1, duration: enterS, ease: "none" }, S);
  else if (transition === "zoom") tl.fromTo("#endcard", { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: enterS, ease: "power2.out" }, S);
  else if (transition === "slide") tl.fromTo("#endcard", { yPercent: 100 }, { yPercent: 0, duration: enterS, ease: "power3.inOut" }, S);

  const parts: string[] = [`<div id="end-bg" class="clip end-bg" data-start="${num(S)}" data-duration="${num(D)}" data-track-index="5"></div>`];
  const titleStart = S + Math.min(D / 3, transition === "cut" ? 0.15 : enterS * 0.6);
  const title = textMarkup(card.title || " ", "words");
  parts.push(`<h2 id="end-title" class="clip end-title" data-start="${num(titleStart)}" data-duration="${num(end - titleStart)}" data-track-index="6">${title.html}</h2>`);
  tl.fromTo("#end-title .w", { opacity: 0, y: 0.028 * base }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: Math.min(0.08, 0.8 / Math.max(1, title.words)) }, titleStart);
  if (card.subtitle && card.subtitle.trim()) {
    const subStart = Math.min(end - 0.2, titleStart + 0.35);
    parts.push(`<p id="end-subtitle" class="clip end-subtitle" data-start="${num(subStart)}" data-duration="${num(end - subStart)}" data-track-index="7">${textMarkup(card.subtitle, "words").html}</p>`);
    tl.fromTo("#end-subtitle .line", { opacity: 0, y: 0.014 * base }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, subStart);
  }
  if (style.signature) {
    const signStart = Math.min(end - 0.2, titleStart + 0.6);
    parts.push(`<p id="end-sign" class="clip end-sign" data-start="${num(signStart)}" data-duration="${num(end - signStart)}" data-track-index="8"><span class="line">${esc(style.signature)}</span></p>`);
    tl.fromTo("#end-sign .line", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "none" }, signStart);
  }
  return `<div id="endcard" class="endcard">\n${parts.join("\n")}\n</div>`;
}

function baseCss(W: number, H: number, safe: { top: number; bottom: number; x: number }, base: number, style: ResolvedStyle, filterCss: string | null): string {
  const k = style.textScale;
  const lightEnd = luminance(style.colors.background) > 0.45;
  const endInk = lightEnd ? style.colors.plate : style.colors.text;
  return `:root {
  --atelier-text: ${style.colors.text};
  --atelier-accent: ${style.colors.accent};
  --atelier-plate: ${style.colors.plate};
  --atelier-background: ${style.colors.background};
  --atelier-end-ink: ${endInk};
  --atelier-font-display: "${style.fonts.display}", serif;
  --atelier-font-text: "${style.fonts.text}", sans-serif;
  --atelier-width: ${W}px;
  --atelier-height: ${H}px;
  --atelier-safe-top: ${safe.top}px;
  --atelier-safe-bottom: ${safe.bottom}px;
  --atelier-safe-x: ${safe.x}px;
  --atelier-look: ${filterCss ?? "none"};
}
html, body { margin: 0; padding: 0; background: var(--atelier-plate); }
#root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: var(--atelier-plate); isolation: isolate; }
.shot { position: absolute; inset: 0; overflow: hidden; filter: var(--atelier-look); }
.move { position: absolute; inset: 0; }
.media { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: cover; display: block; }
.missing { display: grid; place-items: center; background: var(--atelier-plate); color: var(--atelier-text); font-family: var(--atelier-font-text); font-size: ${px(0.04 * base)}; opacity: 0.85; }
.vignette { position: absolute; inset: 0; z-index: 30; pointer-events: none; background: radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.62) 100%); }
.txt { position: absolute; left: var(--atelier-safe-x); right: var(--atelier-safe-x); margin: 0; z-index: 40; text-align: center; color: var(--atelier-text); }
.at-top { top: var(--atelier-safe-top); }
.at-center { top: 50%; transform: translateY(-50%); }
.at-bottom { bottom: var(--atelier-safe-bottom); }
.txt .line, .end-title .line, .end-subtitle .line, .end-sign .line { display: inline-block; }
.txt .w, .end-title .w, .end-subtitle .w { display: inline-block; }
.acc { font-style: italic; color: var(--atelier-accent); }
.txt-hook { font-family: var(--atelier-font-display); font-weight: 400; font-size: ${px(0.1 * base * k)}; line-height: 1.04; letter-spacing: -0.012em; text-shadow: 0 ${px(0.004 * base)} ${px(0.032 * base)} color-mix(in srgb, var(--atelier-plate) 60%, transparent); }
.txt-title { font-family: var(--atelier-font-display); font-weight: 400; font-size: ${px(0.074 * base * k)}; line-height: 1.08; letter-spacing: -0.01em; text-shadow: 0 ${px(0.004 * base)} ${px(0.028 * base)} color-mix(in srgb, var(--atelier-plate) 55%, transparent); }
.txt-caption { font-family: var(--atelier-font-text); font-weight: 600; font-size: ${px(0.046 * base * k)}; line-height: 1.3; text-shadow: 0 ${px(0.002 * base)} ${px(0.016 * base)} color-mix(in srgb, var(--atelier-plate) 70%, transparent); }
.txt-label { font-family: var(--atelier-font-text); font-weight: 700; font-size: ${px(0.03 * base * k)}; letter-spacing: 0.2em; text-transform: uppercase; }
.plate .line { background: color-mix(in srgb, var(--atelier-plate) 76%, transparent); padding: 0.18em 0.55em; border-radius: 0.42em; text-shadow: none; }
.txt-label.plate .line { padding: 0.55em 1.1em; border-radius: 999px; }
.endcard { position: absolute; inset: 0; z-index: 60; }
.end-bg { position: absolute; inset: 0; background: var(--atelier-background); }
.end-title, .end-subtitle, .end-sign { position: absolute; left: var(--atelier-safe-x); right: var(--atelier-safe-x); margin: 0; text-align: center; color: var(--atelier-end-ink); }
.end-title { bottom: 50%; font-family: var(--atelier-font-display); font-weight: 400; font-size: ${px(0.085 * base * k)}; line-height: 1.06; letter-spacing: -0.015em; }
.end-subtitle { top: calc(50% + ${px(0.035 * base)}); font-family: var(--atelier-font-text); font-weight: 500; font-size: ${px(0.036 * base * k)}; line-height: 1.4; opacity: 0.78; }
.end-sign { bottom: var(--atelier-safe-bottom); font-family: var(--atelier-font-display); font-style: italic; font-weight: 400; font-size: ${px(0.05 * base * k)}; color: var(--atelier-accent); }`;
}

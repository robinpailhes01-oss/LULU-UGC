/**
 * Modèle de composition fourni par un style (mode avancé) : fichier annexe « template.html »
 * d'un skill « montage ». Atelier y injecte les éléments générés aux emplacements suivants
 * (contrat documenté dans docs/montage.md) :
 *
 *   <!-- ATELIER:HEAD -->     polices Google Fonts + feuille de style de base (variables --atelier-*)
 *                             (facultatif : sinon inséré avant </head>)
 *   <!-- ATELIER:CLIPS -->    OBLIGATOIRE, dans la racine : filtre du look + plans (.shot > .move > média)
 *   <!-- ATELIER:OVERLAYS --> vignettage du look (facultatif : sinon après les plans)
 *   <!-- ATELIER:TEXTS -->    textes à l'écran (facultatif : sinon après les plans)
 *   <!-- ATELIER:ENDCARD -->  carte de fin (facultatif : sinon après les textes)
 *   <!-- ATELIER:AUDIO -->    musique (facultatif : sinon après la carte de fin)
 *   <!-- ATELIER:SCRIPT -->   timeline GSAP (facultatif : sinon avant </body>)
 *
 * Jetons remplacés partout : {{ATELIER_ID}} {{ATELIER_WIDTH}} {{ATELIER_HEIGHT}}
 * {{ATELIER_DURATION}} {{ATELIER_FPS}} {{ATELIER_FORMAT}} {{ATELIER_TITLE}}.
 * Le modèle peut définir `window.atelierTemplate = function (tl, montage) { … }` dans un script
 * placé avant ATELIER:SCRIPT pour ajouter ses propres animations à la timeline unique.
 */
export interface TemplateParts {
  head: string;
  /** Balise <script> de GSAP, ajoutée si le modèle ne charge pas déjà GSAP. */
  gsap: string;
  svg: string;
  clips: string;
  overlays: string;
  texts: string;
  endCard: string;
  audio: string;
  script: string;
  tokens: Record<string, string>;
}

const mark = (name: string) => new RegExp(`<!--\\s*ATELIER:${name}\\s*-->`, "i");

export function applyTemplate(template: string, parts: TemplateParts): { html: string } | { error: string } {
  let html = template;
  if (!mark("CLIPS").test(html)) return { error: "l'emplacement <!-- ATELIER:CLIPS --> est absent." };
  html = html.replace(/\{\{\s*(ATELIER_[A-Z]+)\s*\}\}/g, (whole, key: string) => parts.tokens[key] ?? whole);
  if (!/data-composition-id\s*=/.test(html)) return { error: "la racine data-composition-id=\"{{ATELIER_ID}}\" est absente." };
  if (!/<\/head>/i.test(html) || !/<\/body>/i.test(html)) return { error: "un document HTML complet (<head> et <body>) est attendu." };

  const hasGsap = /<script[^>]+src=["'][^"']*gsap[^"']*["']/i.test(html);
  const head = hasGsap ? parts.head : `${parts.head}\n${parts.gsap}`;
  html = mark("HEAD").test(html) ? html.replace(mark("HEAD"), () => head) : html.replace(/<\/head>/i, () => `${head}\n</head>`);

  const after: string[] = [];
  const place = (name: string, content: string) => {
    if (mark(name).test(html)) html = html.replace(mark(name), () => content);
    else if (content) after.push(content);
  };
  // Les emplacements facultatifs absents sont regroupés juste après les plans, dans l'ordre.
  html = html.replace(mark("CLIPS"), () => `${parts.svg}\n${parts.clips}\n<!--ATELIER-AFTER-CLIPS-->`);
  place("OVERLAYS", parts.overlays);
  place("TEXTS", parts.texts);
  place("ENDCARD", parts.endCard);
  place("AUDIO", parts.audio);
  html = html.replace("<!--ATELIER-AFTER-CLIPS-->", () => after.join("\n"));
  html = mark("SCRIPT").test(html) ? html.replace(mark("SCRIPT"), () => parts.script) : html.replace(/<\/body>/i, () => `${parts.script}\n</body>`);
  return { html };
}

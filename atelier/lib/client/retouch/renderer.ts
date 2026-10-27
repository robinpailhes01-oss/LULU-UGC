/**
 * Aperçu WebGL2 de la retouche : applique exactement les formules de lib/shared/look.ts (même
 * LUT de tons calculée en JS, même matrice couleur, même vignettage et grain) sur une texture de
 * la photo. Une instance = un contexte WebGL (aperçu principal, ou vignettes des looks).
 */
import {
  GRAIN_CELLS,
  GRAIN_SEED,
  LOOK_KEYS,
  LUT_SIZE,
  RETOUCH_FRAGMENT_SHADER,
  RETOUCH_VERTEX_SHADER,
  buildToneLut,
  colourMatrix,
  grainAttenuation,
  vignetteAxes,
  type Affine,
  type OutputGeometry,
} from "@/lib/shared/look";
import type { CropRect, RetouchParams } from "@/lib/shared/types";

/** Rectangle (pixels du canvas, origine en haut à gauche) où s'affiche le contenu. */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RenderRequest {
  params: RetouchParams;
  geometry: OutputGeometry;
  /** « output » : image recadrée ; « frame » : cadre entier redressé (mode recadrage). */
  mode: "output" | "frame";
  view: ViewRect;
  /** Affiche l'original (couleurs neutres), géométrie conservée. */
  bypass?: boolean;
}

type Uniforms = Record<
  "uSrc" | "uLut" | "uLutSize" | "uToS0" | "uToS1" | "uView" | "uCanvasH" | "uFx" | "uVigAxes" | "uGrainGrid" | "uMatrix" | "uOffset" | "uVibrance" | "uVignette" | "uGrain" | "uSeed" | "uBypass",
  WebGLUniformLocation | null
>;

const TONE_KEYS = ["exposure", "contrast", "highlights", "shadows", "whites", "blacks", "fade"] as const;

export class RetouchRenderer {
  readonly gl: WebGL2RenderingContext;
  readonly maxTextureSize: number;
  private program: WebGLProgram;
  private u: Uniforms;
  private srcTex: WebGLTexture;
  private lutTex: WebGLTexture;
  private lutKey = "";
  private hasSource = false;
  private lost = false;

  private constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
    this.gl = gl;
    this.program = program;
    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const names = ["uSrc", "uLut", "uLutSize", "uToS0", "uToS1", "uView", "uCanvasH", "uFx", "uVigAxes", "uGrainGrid", "uMatrix", "uOffset", "uVibrance", "uVignette", "uGrain", "uSeed", "uBypass"] as const;
    this.u = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)])) as Uniforms;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.srcTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.lutTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  /** Crée le moteur ; null si WebGL2 n'est pas disponible (ou si le shader ne compile pas). */
  static create(canvas: HTMLCanvasElement, opts: { preserveDrawingBuffer?: boolean } = {}): RetouchRenderer | null {
    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false, powerPreference: "high-performance" });
    } catch {
      gl = null;
    }
    if (!gl) return null;
    const program = buildProgram(gl);
    if (!program) return null;
    const r = new RetouchRenderer(gl, program);
    canvas.addEventListener("webglcontextlost", () => {
      r.lost = true;
    });
    return r;
  }

  get ready(): boolean {
    return this.hasSource && !this.lost;
  }

  get contextLost(): boolean {
    return this.lost;
  }

  /** Envoie la photo (ImageBitmap, canvas…) au GPU, avec mipmaps pour un affichage réduit net. */
  setSource(source: TexImageSource): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.hasSource = true;
  }

  private updateLut(params: RetouchParams) {
    const key = TONE_KEYS.map((k) => params[k]).join("|");
    if (key === this.lutKey) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, LUT_SIZE, 1, 0, gl.RED, gl.FLOAT, buildToneLut(params, LUT_SIZE));
    this.lutKey = key;
  }

  /** Dessine une image (taille du canvas = canvas.width × canvas.height, en pixels réels). */
  render(req: RenderRequest): void {
    if (!this.hasSource || this.lost) return;
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    const p = req.params;
    const g = req.geometry;
    this.updateLut(p);

    const map: Affine = req.mode === "frame" ? g.frameToSource : g.toSource;
    // Effets (vignettage, grain) toujours calculés dans l'image recadrée.
    const fx: CropRect = req.mode === "frame" ? g.crop : { x: 0, y: 0, w: 1, h: 1 };
    const outW = g.width;
    const outH = g.height;
    const [ax, ay] = vignetteAxes(outW, outH);
    const m = Math.max(outW, outH, 1);
    // Taille affichée de l'image recadrée, pour atténuer le grain comme le ferait une réduction.
    const shownLong = req.mode === "frame" ? Math.max(req.view.w * g.crop.w, req.view.h * g.crop.h) : Math.max(req.view.w, req.view.h);
    const cm = colourMatrix(p);

    const u = this.u;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.uniform1i(u.uSrc, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.uniform1i(u.uLut, 1);
    gl.uniform1i(u.uLutSize, LUT_SIZE);
    gl.uniform3f(u.uToS0, map[0], map[1], map[2]);
    gl.uniform3f(u.uToS1, map[3], map[4], map[5]);
    gl.uniform4f(u.uView, req.view.x, req.view.y, req.view.w, req.view.h);
    gl.uniform1f(u.uCanvasH, canvas.height);
    gl.uniform4f(u.uFx, fx.x, fx.y, fx.w, fx.h);
    gl.uniform2f(u.uVigAxes, ax, ay);
    gl.uniform2f(u.uGrainGrid, (GRAIN_CELLS * outW) / m, (GRAIN_CELLS * outH) / m);
    gl.uniformMatrix3fv(u.uMatrix, true, cm.m);
    gl.uniform3f(u.uOffset, cm.offset[0], cm.offset[1], cm.offset[2]);
    gl.uniform1f(u.uVibrance, p.vibrance / 100);
    gl.uniform1f(u.uVignette, p.vignette / 100);
    gl.uniform1f(u.uGrain, (p.grain / 100) * grainAttenuation(shownLong));
    gl.uniform1ui(u.uSeed, GRAIN_SEED);
    gl.uniform1i(u.uBypass, req.bypass ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /**
   * Libère les ressources GPU. `loseContext` seulement pour un canvas détaché (vignettes) : sur le
   * canvas de l'aperçu, React (mode strict) peut recréer le moteur sur le même contexte.
   */
  dispose(opts: { loseContext?: boolean } = {}): void {
    const gl = this.gl;
    gl.deleteTexture(this.srcTex);
    gl.deleteTexture(this.lutTex);
    gl.deleteProgram(this.program);
    this.hasSource = false;
    if (opts.loseContext) gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

function buildProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("[retouche] shader", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, RETOUCH_VERTEX_SHADER);
  const fs = compile(gl.FRAGMENT_SHADER, RETOUCH_FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("[retouche] programme", gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

/** Le navigateur sait-il faire l'aperçu en direct ? */
export function webgl2Available(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

/** Clés de look, réexportées pour les composants. */
export { LOOK_KEYS };

/**
 * Photos HEIC/HEIF (iPhone) : Safari les décode nativement, Chrome et Firefox non. On charge alors
 * libheif (WebAssembly, ~1,5 Mo) à la demande, uniquement quand un fichier HEIC est rencontré.
 * Prévu pour tourner dans le Worker d'analyse (la compilation WebAssembly synchrone y est permise).
 */

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

/** Le fichier ressemble-t-il à un HEIF (extension, type MIME ou signature « ftyp ») ? */
export async function looksLikeHeif(file: Blob, name?: string): Promise<boolean> {
  if (/^image\/hei[cf]/i.test(file.type)) return true;
  if (name && /\.(heic|heif|hif)$/i.test(name)) return true;
  try {
    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    if (String.fromCharCode(head[4], head[5], head[6], head[7]) !== "ftyp") return false;
    const brand = String.fromCharCode(head[8], head[9], head[10], head[11]).toLowerCase();
    return HEIF_BRANDS.has(brand);
  } catch {
    return false;
  }
}

type LibHeif = import("libheif-js/libheif-wasm/libheif-bundle.mjs").LibHeif;
let lib: Promise<LibHeif> | null = null;

function loadLib(): Promise<LibHeif> {
  if (!lib) {
    // Module ES (et non la version CommonJS) : pas d'avertissement « require » du bundler.
    lib = import("libheif-js/libheif-wasm/libheif-bundle.mjs").then((m) => m.default());
    lib.catch(() => {
      lib = null;
    });
  }
  return lib;
}

/** Décode l'image principale d'un HEIC en pixels RGBA (orientation déjà appliquée par libheif). */
export async function decodeHeif(file: Blob): Promise<ImageData> {
  const libheif = await loadLib();
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(new Uint8Array(await file.arrayBuffer()));
  if (!images || images.length === 0) throw new Error("HEIC illisible");
  const image = images.find((i) => {
    try {
      return i.is_primary();
    } catch {
      return false;
    }
  }) ?? images[0];
  const width = image.get_width();
  const height = image.get_height();
  const target = { data: new Uint8ClampedArray(width * height * 4), width, height };
  try {
    await new Promise<void>((resolve, reject) => {
      image.display(target, (result) => (result ? resolve() : reject(new Error("Décodage HEIC impossible"))));
    });
  } finally {
    for (const i of images) {
      try {
        i.free();
      } catch {
        /* déjà libérée */
      }
    }
  }
  return new ImageData(target.data, width, height);
}

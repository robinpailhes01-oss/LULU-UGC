/** Déclaration minimale de libheif-js (module ES WebAssembly pré-empaqueté), chargé à la demande. */
declare module "libheif-js/libheif-wasm/libheif-bundle.mjs" {
  export interface HeifImage {
    get_width(): number;
    get_height(): number;
    is_primary(): boolean;
    display(target: { data: Uint8ClampedArray; width: number; height: number }, callback: (result: unknown) => void): void;
    free(): void;
  }
  export interface LibHeif {
    HeifDecoder: new () => { decode(buffer: ArrayBuffer | Uint8Array): HeifImage[] };
  }
  /** Fabrique du module (instanciation WebAssembly synchrone, permise dans un Worker). */
  export default function factory(options?: Record<string, unknown>): LibHeif;
}

/**
 * Typage JSX du composant web <hyperframes-player> (@hyperframes/player), enregistré côté
 * navigateur par un import dynamique (components/montage/editor/Player.tsx).
 */
import type * as React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "hyperframes-player": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        srcdoc?: string;
        width?: number | string;
        height?: number | string;
        controls?: boolean | string;
        muted?: boolean | string;
        loop?: boolean | string;
        poster?: string;
        "sandbox-origin"?: "opaque" | "same-origin" | string;
        "runtime-src"?: string;
        "range-start"?: number | string;
        "range-end"?: number | string;
        "assets-loading-ui"?: "player" | "none";
      };
    }
  }
}

export {};

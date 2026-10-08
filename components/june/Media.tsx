import type React from "react";

const posOf = (pos?: string) => (pos ? ({ "--pos": pos } as React.CSSProperties) : undefined);

/** Image avec vidéo facultative (lue au scroll ou au survol par JuneV3Engine). */
export default function Media({ video, poster, alt, pos, w, h, eager, auto = "view", px }: { video?: string; poster: string; alt: string; pos?: string; w: number; h: number; eager?: boolean; auto?: "view" | "hover"; px?: number }) {
  return (
    <div className="media" data-px={px ?? undefined}>
      <img src={poster} alt={alt} width={w} height={h} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} decoding="async" style={posOf(pos)} />
      {video && (
        <video data-auto={auto} muted loop playsInline preload="none" poster={poster} aria-hidden="true" style={posOf(pos)}>
          <source src={video} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

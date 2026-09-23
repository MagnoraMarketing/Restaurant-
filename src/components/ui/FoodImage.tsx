"use client";

import { useState } from "react";

/** Billede med elegant fallback (gradient + emoji), hvis billedet ikke kan hentes. */
export function FoodImage({
  src,
  alt,
  emoji = "🍽️",
  className = "",
  priority = false,
}: {
  src?: string;
  alt: string;
  emoji?: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-ink-700 via-ink-800 to-ember-700/40 ${className}`}>
      <div className="absolute inset-0 grid place-items-center text-5xl opacity-90 select-none" aria-hidden>
        {(failed || !loaded) && <span className={failed ? "" : "animate-pulse opacity-40"}>{emoji}</span>}
      </div>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

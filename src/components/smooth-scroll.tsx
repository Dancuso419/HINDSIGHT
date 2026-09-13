"use client";

import { ReactLenis, useLenis } from "lenis/react";
import type { ReactNode } from "react";

/**
 * Publishes the smoothed scroll position as CSS custom properties on <html>, once per Lenis
 * frame, so scroll-linked motion lives in CSS and moves exactly with the eased scroll:
 *   --scroll    pixels scrolled
 *   --progress  0 → 1 down the whole page
 */
function ScrollVariables() {
  useLenis((lenis) => {
    const root = document.documentElement.style;
    root.setProperty("--scroll", lenis.animatedScroll.toFixed(1));
    root.setProperty("--progress", lenis.progress.toFixed(4));
  });
  return null;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        lerp: 0.085,
        wheelMultiplier: 0.9,
        // Hero actions and the footer link glide to their section, landing just clear of it.
        anchors: { offset: -32, duration: 1.4 },
      }}
    >
      <ScrollVariables />
      {children}
    </ReactLenis>
  );
}

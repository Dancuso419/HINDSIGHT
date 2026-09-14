"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { useRef, type ReactNode } from "react";

type Layers = {
  reduced: boolean;
  copy: HTMLElement | null;
  mark: HTMLElement | null;
  terrain: HTMLElement | null;
  band: HTMLElement | null;
  progress: HTMLElement | null;
};

/**
 * Scroll-linked motion, written straight onto the few elements that move, once per Lenis frame.
 * Deliberately not CSS custom properties on <html>: those inherit into every element, so
 * updating them each frame restyled the whole document while scrolling — the main source of
 * scroll lag. Five direct transform writes stay on the compositor.
 */
function ScrollMotion() {
  const layers = useRef<Layers | null>(null);

  useLenis((lenis) => {
    if (!layers.current) {
      const q = (name: string) => document.querySelector<HTMLElement>(`[data-scroll="${name}"]`);
      layers.current = {
        reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        copy: q("copy"),
        mark: q("mark"),
        terrain: q("terrain"),
        band: q("band"),
        progress: q("progress"),
      };
    }
    const { reduced, copy, mark, terrain, band, progress } = layers.current;
    const y = lenis.animatedScroll;

    if (progress) progress.style.transform = `scaleX(${lenis.progress.toFixed(4)})`;
    if (reduced) return;

    // Past the hero there is nothing left to move; stop writing once it is well out of view.
    const vh = window.innerHeight;
    if (y > vh * 2) return;
    const hy = Math.min(y, vh * 1.5);
    if (copy) {
      copy.style.transform = `translate3d(0, ${(-hy * 0.32).toFixed(1)}px, 0)`;
      copy.style.opacity = Math.max(0, 1 - hy / 620).toFixed(3);
    }
    if (mark) mark.style.transform = `translate3d(0, ${(hy * 0.18).toFixed(1)}px, 0)`;
    if (terrain) terrain.style.transform = `translate3d(0, ${(hy * 0.12).toFixed(1)}px, 0)`;
    if (band) band.style.transform = `translate3d(${(-y * 0.06).toFixed(1)}px, 0, 0)`;
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
      <ScrollMotion />
      {children}
    </ReactLenis>
  );
}

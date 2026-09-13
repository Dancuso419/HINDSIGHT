"use client";

import { useEffect, useRef } from "react";

/**
 * The hero landscape: dozens of lines receding into depth, walls rising at either side, and
 * a valley floor whose ripple is the cumulative P&L of the history being reviewed. Looking
 * back over your trades, literally. Drawn on a 2D canvas — no library.
 */

const ROWS = 58;
const SAMPLES = 180;

/** Resample an arbitrary series to `n` points on [-1, 1] with Catmull-Rom smoothing. */
function shape(series: number[], n: number): number[] {
  if (series.length < 2) return Array.from({ length: n }, (_, i) => Math.sin((i / n) * Math.PI * 3) * 0.4);
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const norm = series.map((v) => ((v - min) / span) * 2 - 1);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const f = (i / (n - 1)) * (norm.length - 1);
    const k = Math.floor(f);
    const t = f - k;
    const p0 = norm[Math.max(k - 1, 0)];
    const p1 = norm[k];
    const p2 = norm[Math.min(k + 1, norm.length - 1)];
    const p3 = norm[Math.min(k + 2, norm.length - 1)];
    out.push(
      0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t),
    );
  }
  return out;
}

export function Terrain({ series, className = "" }: { series: number[] | null; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripple = useRef<number[]>(shape([], SAMPLES));
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    if (series) ripple.current = shape(series, SAMPLES);
  }, [series]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    let w = 0;
    let h = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const t = reduced ? 0 : (now - start) / 1000;
      const p = pointer.current;
      p.x += (p.tx - p.x) * 0.04;
      p.y += (p.ty - p.y) * 0.04;

      ctx.clearRect(0, 0, w, h);
      const r = ripple.current;

      for (let row = 0; row < ROWS; row++) {
        const d = row / (ROWS - 1); // 0 = far, 1 = near
        const baseY = h * (0.5 + 0.56 * Math.pow(d, 1.7));
        const spread = 0.62 + 0.75 * d; // perspective: near rows fan wider
        const wallHeight = h * (0.62 - 0.22 * d) * (1 + p.y * 0.04);
        const floorAmp = h * 0.05 * (0.25 + 0.75 * d);
        const alpha = 0.035 + 0.42 * Math.pow(d, 2.2);

        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, `rgba(255,255,255,${alpha * 1.15})`);
        grad.addColorStop(0.32, `rgba(255,255,255,${alpha * 0.35})`);
        grad.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.9})`);
        grad.addColorStop(0.68, `rgba(255,255,255,${alpha * 0.35})`);
        grad.addColorStop(1, `rgba(255,255,255,${alpha * 1.15})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.6 + d * 0.7;

        ctx.beginPath();
        for (let i = 0; i < SAMPLES; i++) {
          const x = i / (SAMPLES - 1);
          const cx = x - 0.5 + p.x * 0.015;
          const valley = Math.pow(Math.min(Math.abs(cx) * 2, 1), 2.4); // 0 centre → 1 edge
          const swell = Math.sin(x * 5.2 + t * 0.35 + d * 2.4) * 0.5 + Math.sin(x * 11 - t * 0.22 + d * 5) * 0.2;
          const y =
            baseY -
            valley * wallHeight * (0.85 + 0.15 * Math.sin(t * 0.3 + d * 4)) -
            r[i] * floorAmp * (1 - valley) -
            swell * h * 0.012 * (0.4 + d);
          const px = w / 2 + cx * w * spread;
          if (i === 0) ctx.moveTo(px, y);
          else ctx.lineTo(px, y);
        }
        ctx.stroke();
      }

      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      pointer.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    // Stop drawing when the hero scrolls out of view.
    const io = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was && !reduced) raf = requestAnimationFrame(draw);
    });

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(start);
    });

    resize();
    ro.observe(canvas);
    io.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={`block h-full w-full ${className}`} />;
}

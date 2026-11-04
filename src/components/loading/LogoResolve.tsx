"use client";

import { useEffect, useRef } from "react";

import {
  LOGO_SIZE,
  buildLogoTarget,
  createPixelSort,
  paintLogo,
} from "@/lib/rendering/logoResolve";

/** COLOR STARTS ONCE THE SORT HAS ALL BUT SETTLED. */
const COLOR_FROM = 0.7;
/** HOW LONG THE MARK TAKES TO RESOLVE, START TO FULL COLOR. */
const RESOLVE_MS = 2600;

/** THE LOADING MARK — SCRAMBLED PIXELS SORT INTO THE LOGO, THEN TAKE COLOR. */
export function LogoResolve({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }

    let frameId = 0;
    let stopped = false;

    // CANVAS CANNOT READ A CSS VARIABLE, SO RESOLVE THE FAMILY NEXT/FONT MADE.
    const family =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-silkscreen")
        .trim() || "monospace";

    const run = async () => {
      // THE TITLE IS RASTERIZED ONCE, SO THE FACE HAS TO BE IN FIRST.
      try {
        await document.fonts.load(`700 8px ${family}`);
        await document.fonts.ready;
      } catch {
        // A FALLBACK FACE STILL DRAWS. IT JUST IS NOT SILKSCREEN.
      }
      if (stopped) {
        return;
      }

      const target = buildLogoTarget(family);
      const sorter = createPixelSort(target);
      const field = new Float32Array(LOGO_SIZE * LOGO_SIZE);
      const image = ctx.createImageData(LOGO_SIZE, LOGO_SIZE);
      const pixels = new Uint32Array(image.data.buffer);

      const paint = (p: number) => {
        sorter.frame(field, p);
        const colorAmount = Math.min(1, Math.max(0, (p - COLOR_FROM) / (1 - COLOR_FROM)));
        paintLogo(target, field, pixels, colorAmount);
        ctx.putImageData(image, 0, 0);
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        paint(1);
        return;
      }

      const start = performance.now();
      const tick = (now: number) => {
        if (stopped) {
          return;
        }
        const p = Math.min(1, (now - start) / RESOLVE_MS);
        paint(p);
        if (p < 1) {
          frameId = requestAnimationFrame(tick);
        }
      };
      frameId = requestAnimationFrame(tick);
    };

    void run();

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={LOGO_SIZE}
      height={LOGO_SIZE}
      aria-hidden="true"
      className={`block h-auto w-[256px] max-w-[78vw] ${className}`.trim()}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

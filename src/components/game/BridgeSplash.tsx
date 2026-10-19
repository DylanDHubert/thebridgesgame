"use client";

import { useEffect, useRef } from "react";

import { isoSpriteOrigin, type IsoMetrics } from "@/lib/rendering/isoTiles";
import { WATER_SPLASH_FRAMES } from "@/lib/rendering/tileCatalog";

type BridgeSplashProps = {
  row: number;
  col: number;
  metrics: IsoMetrics;
  /** MARSH WASH. OCEAN SPLASHES STAY THE SPRITE COLOR. */
  tint?: string;
  onDone: () => void;
};

const FRAME_MS = 90;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadSprite(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) {
    return cached;
  }
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`SPRITE FAILED ${src}`));
    image.src = src;
  });
  imageCache.set(src, pending);
  return pending;
}

/** ONE SPLASH OVER THE CELL THE BRIDGE JUST LEFT. */
export function BridgeSplash({ row, col, metrics, tint, onDone }: BridgeSplashProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let cancelled = false;
    let timer = 0;

    Promise.all(WATER_SPLASH_FRAMES.map((src) => loadSprite(src))).then((frames) => {
      if (cancelled) {
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        onDoneRef.current();
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const size = metrics.tileWidth;
      canvas.width = Math.max(1, Math.round(size * dpr));
      canvas.height = Math.max(1, Math.round(size * dpr));
      ctx.imageSmoothingEnabled = false;

      const draw = (image: HTMLImageElement) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(image, 0, 0, size, size);
        if (!tint) {
          return;
        }
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, size, size);
        ctx.globalCompositeOperation = "source-over";
      };

      let index = 0;
      draw(frames[0]!);
      timer = window.setInterval(() => {
        index += 1;
        const frame = frames[index];
        if (!frame) {
          window.clearInterval(timer);
          onDoneRef.current();
          return;
        }
        draw(frame);
      }, FRAME_MS);
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [metrics.tileWidth, tint]);

  const origin = isoSpriteOrigin(row, col, metrics);
  // SPLASH PIXELS SIT ON THE SPRITE'S BOTTOM POINT. LIFT THEM ONTO THE TILE FACE.
  const lift = metrics.halfH;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: origin.x,
        top: origin.y - lift,
        width: metrics.tileWidth,
        height: metrics.tileWidth,
        zIndex: row + col + 1,
        imageRendering: "pixelated",
      }}
    />
  );
}

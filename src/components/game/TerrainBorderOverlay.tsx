"use client";

import { useEffect, useRef } from "react";

import type { AppearanceContext } from "@/lib/rendering/cellAppearance";
import { drawTerrainBorders } from "@/lib/rendering/terrainBorders";
import type { TerrainView } from "@/lib/rendering/terrainView";

type TerrainBorderOverlayProps = {
  view: TerrainView;
  context: AppearanceContext;
  cellSize: number;
  gap: number;
  cellGridOpacity?: number;
};

export function TerrainBorderOverlay({
  view,
  context,
  cellSize,
  gap,
  cellGridOpacity = 0.72,
}: TerrainBorderOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const width = view.cols * cellSize + Math.max(0, view.cols - 1) * gap;
  const height = view.rows * cellSize + Math.max(0, view.rows - 1) * gap;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawTerrainBorders(ctx, view, context, cellSize, gap, cellGridOpacity);
  }, [view, context, cellSize, gap, cellGridOpacity]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0"
      style={{ width, height, imageRendering: "pixelated" }}
    />
  );
}

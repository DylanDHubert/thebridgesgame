"use client";

import { useEffect, useRef, useState } from "react";

import {
  isAnimatedWaterTile,
  oceanWaterRgbForSubcell,
  waterBaseForSubcell,
  type AppearanceContext,
} from "@/lib/rendering/cellAppearance";
import type { TileKind } from "@/lib/game/types";
import {
  applyMarshSplotches,
} from "@/lib/rendering/waterFeatures";
import {
  modulateWaterColorRgb,
  WATER_SUBCELLS,
  type WaterNoiseField,
} from "@/lib/rendering/waterNoise";
import {
  terrainSubcellRect,
  terrainSubcellSize,
  terrainTexturePixelSize,
} from "@/lib/rendering/terrainBorders";
import type { TerrainView } from "@/lib/rendering/terrainView";

type WaterCanvasOverlayProps = {
  view: TerrainView;
  context: AppearanceContext;
  cellSize: number;
  gap: number;
  frameMs?: number;
  depthInterpolation?: number;
};

const DEFAULT_FRAME_MS = 420;

type TransitionEdge = {
  edgeSubRow: number;
  edgeSubCol: number;
};

function isOuterTransitionEdge(edge: TransitionEdge): boolean {
  return (
    edge.edgeSubRow === WATER_SUBCELLS - 1 ||
    edge.edgeSubCol === WATER_SUBCELLS - 1
  );
}

function paintWaterBlock(
  ctx: CanvasRenderingContext2D,
  context: AppearanceContext,
  waterNoise: WaterNoiseField,
  waterPhase: number,
  x: number,
  y: number,
  width: number,
  height: number,
  row: number,
  col: number,
  subRow: number,
  subCol: number,
  depthInterpolation: number,
  transitionEdge?: TransitionEdge,
): void {
  const base = waterBaseForSubcell(
    row,
    col,
    subRow,
    subCol,
    context,
    depthInterpolation,
  );
  if (!base) {
    return;
  }

  const softenTransition =
    transitionEdge !== undefined &&
    isOuterTransitionEdge(transitionEdge) &&
    (base.kind === "marsh");

  let paintRgb = base.rgb;
  let paintKind: TileKind = base.kind;

  if (softenTransition) {
    paintRgb = oceanWaterRgbForSubcell(
      row,
      col,
      subRow,
      subCol,
      context,
      depthInterpolation,
    );
    paintKind = "ocean";
  }

  const noise = waterNoise.sample(waterPhase, row, col, subRow, subCol);
  let { r, g, b } = modulateWaterColorRgb(paintRgb, noise, paintKind);

  if (base.kind === "marsh" && !softenTransition) {
    const greenStrength = context.marshSplotch.greenStrength(
      row,
      col,
      subRow,
      subCol,
    );
    const yellowStrength = context.marshSplotch.yellowStrength(
      row,
      col,
      subRow,
      subCol,
    );
    ({ r, g, b } = applyMarshSplotches(
      { r, g, b },
      greenStrength,
      yellowStrength,
    ));
  }

  ctx.fillStyle = `rgb(${r} ${g} ${b})`;
  ctx.fillRect(x, y, width, height);
}

function drawWaterGapRegion(
  ctx: CanvasRenderingContext2D,
  context: AppearanceContext,
  waterNoise: WaterNoiseField,
  waterPhase: number,
  x: number,
  y: number,
  width: number,
  height: number,
  sourceRow: number,
  sourceCol: number,
  edgeSubRow: number,
  edgeSubCol: number,
  cellSize: number,
  stride: number,
  blockSize: number,
  depthInterpolation: number,
): void {
  const startX = Math.round(x);
  const startY = Math.round(y);
  const subSize = Math.max(1, Math.floor(cellSize / WATER_SUBCELLS));
  const originX = sourceCol * stride;
  const originY = sourceRow * stride;

  for (let row = 0; row < height; row += blockSize) {
    const blockH = Math.min(blockSize, height - row);

    for (let col = 0; col < width; col += blockSize) {
      const blockW = Math.min(blockSize, width - col);
      const subRow = Math.min(
        WATER_SUBCELLS - 1,
        Math.max(0, Math.floor((startY + row - originY) / subSize)),
      );
      const subCol = Math.min(
        WATER_SUBCELLS - 1,
        Math.max(0, Math.floor((startX + col - originX) / subSize)),
      );
      const isHorizontalStripe = width < height;
      const isVerticalStripe = height < width;
      const sampleSubRow = isHorizontalStripe ? subRow : edgeSubRow;
      const sampleSubCol = isVerticalStripe ? subCol : edgeSubCol;

      paintWaterBlock(
        ctx,
        context,
        waterNoise,
        waterPhase,
        startX + col,
        startY + row,
        blockW,
        blockH,
        sourceRow,
        sourceCol,
        sampleSubRow,
        sampleSubCol,
        depthInterpolation,
        { edgeSubRow, edgeSubCol },
      );
    }
  }
}

function drawWaterGaps(
  ctx: CanvasRenderingContext2D,
  view: TerrainView,
  context: AppearanceContext,
  waterNoise: WaterNoiseField,
  waterPhase: number,
  cellSize: number,
  gap: number,
  depthInterpolation: number,
): void {
  const { rows, cols } = view;
  const stride = cellSize + gap;
  const blockSize = terrainTexturePixelSize(cellSize);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const leftWater = isAnimatedWaterTile(view, row, col);
      const rightWater = isAnimatedWaterTile(view, row, col + 1);
      if (!leftWater && !rightWater) {
        continue;
      }

      const sourceCol = leftWater ? col : col + 1;

      drawWaterGapRegion(
        ctx,
        context,
        waterNoise,
        waterPhase,
        col * stride + cellSize,
        row * stride,
        gap,
        cellSize,
        row,
        sourceCol,
        0,
        leftWater ? WATER_SUBCELLS - 1 : 0,
        cellSize,
        stride,
        blockSize,
        depthInterpolation,
      );
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const topWater = isAnimatedWaterTile(view, row, col);
      const bottomWater = isAnimatedWaterTile(view, row + 1, col);
      if (!topWater && !bottomWater) {
        continue;
      }

      const sourceRow = topWater ? row : row + 1;

      drawWaterGapRegion(
        ctx,
        context,
        waterNoise,
        waterPhase,
        col * stride,
        row * stride + cellSize,
        cellSize,
        gap,
        sourceRow,
        col,
        topWater ? WATER_SUBCELLS - 1 : 0,
        0,
        cellSize,
        stride,
        blockSize,
        depthInterpolation,
      );
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const cells = [
        { row, col },
        { row, col: col + 1 },
        { row: row + 1, col },
        { row: row + 1, col: col + 1 },
      ];

      const waterCell = cells.find(({ row: r, col: c }) =>
        isAnimatedWaterTile(view, r, c),
      );
      if (!waterCell) {
        continue;
      }

      drawWaterGapRegion(
        ctx,
        context,
        waterNoise,
        waterPhase,
        col * stride + cellSize,
        row * stride + cellSize,
        gap,
        gap,
        waterCell.row,
        waterCell.col,
        waterCell.row === row ? WATER_SUBCELLS - 1 : 0,
        waterCell.col === col ? WATER_SUBCELLS - 1 : 0,
        cellSize,
        stride,
        blockSize,
        depthInterpolation,
      );
    }
  }
}

export function drawWaterSurface(
  ctx: CanvasRenderingContext2D,
  view: TerrainView,
  context: AppearanceContext,
  waterNoise: WaterNoiseField,
  waterPhase: number,
  cellSize: number,
  gap: number,
  depthInterpolation = 0.75,
): void {
  const { rows, cols } = view;
  const subcells = WATER_SUBCELLS;
  const subSize = terrainSubcellSize(cellSize, subcells);
  const stride = cellSize + gap;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!isAnimatedWaterTile(view, row, col)) {
        continue;
      }

      const base = waterBaseForSubcell(
        row,
        col,
        Math.floor(subcells / 2),
        Math.floor(subcells / 2),
        context,
        depthInterpolation,
      );
      if (!base) {
        continue;
      }

      const originX = col * stride;
      const originY = row * stride;

      for (let subRow = 0; subRow < subcells; subRow += 1) {
        for (let subCol = 0; subCol < subcells; subCol += 1) {
          const rect = terrainSubcellRect(
            originX,
            originY,
            cellSize,
            subcells,
            subSize,
            subCol,
            subRow,
          );
          paintWaterBlock(
            ctx,
            context,
            waterNoise,
            waterPhase,
            rect.x,
            rect.y,
            rect.width,
            rect.height,
            row,
            col,
            subRow,
            subCol,
            depthInterpolation,
          );
        }
      }
    }
  }

  drawWaterGaps(
    ctx,
    view,
    context,
    waterNoise,
    waterPhase,
    cellSize,
    gap,
    depthInterpolation,
  );
}

export function WaterCanvasOverlay({
  view,
  context,
  cellSize,
  gap,
  frameMs = DEFAULT_FRAME_MS,
  depthInterpolation = 0.75,
}: WaterCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waterPhase, setWaterPhase] = useState(0);

  const width = view.cols * cellSize + Math.max(0, view.cols - 1) * gap;
  const height = view.rows * cellSize + Math.max(0, view.rows - 1) * gap;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWaterPhase((phase) => phase + 1);
    }, frameMs);

    return () => window.clearInterval(timer);
  }, [frameMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawWaterSurface(
      ctx,
      view,
      context,
      context.waterNoise,
      waterPhase,
      cellSize,
      gap,
      depthInterpolation,
    );
  }, [view, context, waterPhase, cellSize, gap, depthInterpolation]);

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

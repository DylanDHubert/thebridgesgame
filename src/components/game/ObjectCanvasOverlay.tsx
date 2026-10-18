"use client";

import { useEffect, useRef, useState } from "react";

import { objectDefinition } from "@/lib/game/objects/registry";
import type { LevelObject } from "@/lib/game/level/types";
import {
  ANIMATED_RENDERERS,
  objectRenderer,
} from "@/lib/rendering/objectRenderers";
import { isoCellCenter, isoMetrics } from "@/lib/rendering/isoTiles";

type ObjectCanvasOverlayProps = {
  objects: LevelObject[];
  rows: number;
  cols: number;
  tileWidth: number;
  frameMs?: number;
};

const DEFAULT_FRAME_MS = 50;

export function drawObjectsSurface(
  ctx: CanvasRenderingContext2D,
  objects: LevelObject[],
  rows: number,
  cols: number,
  tileWidth: number,
  phase: number,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const metrics = isoMetrics(tileWidth, rows, cols);
  const box = metrics.halfW;

  for (const object of objects) {
    const definition = objectDefinition(object.defId);
    if (!definition) {
      continue;
    }

    const renderer = objectRenderer(definition.render);
    if (!renderer) {
      continue;
    }

    // STABLE PER-CELL PHASE OFFSET SO ANIMATED OBJECTS DON'T ALL SPIN IN LOCKSTEP
    const phaseOffset = object.at.row * 5 + object.at.col * 11;
    const center = isoCellCenter(object.at.row, object.at.col, metrics);

    renderer({
      ctx,
      originX: center.x - box / 2,
      originY: center.y - box / 2,
      cellSize: box,
      phase: phase + phaseOffset,
    });
  }
}

export function ObjectCanvasOverlay({
  objects,
  rows,
  cols,
  tileWidth,
  frameMs = DEFAULT_FRAME_MS,
}: ObjectCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(0);
  const metrics = isoMetrics(tileWidth, rows, cols);

  const hasAnimated = objects.some((object) => {
    const definition = objectDefinition(object.defId);
    return definition ? ANIMATED_RENDERERS.has(definition.render) : false;
  });

  useEffect(() => {
    if (!hasAnimated) {
      return;
    }

    const timer = window.setInterval(() => {
      setPhase((value) => value + 1);
    }, frameMs);

    return () => window.clearInterval(timer);
  }, [hasAnimated, frameMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawObjectsSurface(ctx, objects, rows, cols, tileWidth, phase);
  }, [objects, rows, cols, tileWidth, phase]);

  return (
    <canvas
      ref={canvasRef}
      width={metrics.width}
      height={metrics.height}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: metrics.width, height: metrics.height, imageRendering: "pixelated" }}
    />
  );
}

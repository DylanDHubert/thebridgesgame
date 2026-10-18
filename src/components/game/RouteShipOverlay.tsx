"use client";

import { useEffect, useMemo, useRef } from "react";

import { routeDefinition } from "@/lib/game/objects/registry";
import type { LevelRoute } from "@/lib/game/level/types";
import { isoCellCenter, isoMetrics } from "@/lib/rendering/isoTiles";
import {
  buildArcTable,
  samplePath,
  smoothPoints,
  type Point,
} from "@/lib/rendering/routeSmoothing";

type RouteShipOverlayProps = {
  routes: LevelRoute[];
  rows: number;
  cols: number;
  tileWidth: number;
};

type PreparedRoute = {
  id: string;
  closed: boolean;
  color: string;
  speedPx: number;
  points: Point[];
  cumulative: number[];
  total: number;
};

// EVENLY-SPACED PIXEL DOTS ALONG THE SMOOTHED CURVE (DOTTED PIXEL-ART LINE)
function drawPixelTrail(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  cellSize: number,
): void {
  if (points.length < 2) {
    return;
  }

  const dab = Math.max(1, Math.round(cellSize * 0.1));
  const spacing = Math.max(dab * 3, Math.round(cellSize * 0.42));

  ctx.fillStyle = color;

  const placeDot = (x: number, y: number) => {
    ctx.fillRect(Math.round(x - dab / 2), Math.round(y - dab / 2), dab, dab);
  };

  // WALK BY ARC LENGTH SO DOT GAPS STAY EVEN AROUND CURVES
  let sinceLast = spacing;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const segLength = Math.hypot(b.x - a.x, b.y - a.y);
    let pos = 0;

    while (true) {
      const need = spacing - sinceLast;
      if (pos + need > segLength) {
        sinceLast += segLength - pos;
        break;
      }
      pos += need;
      sinceLast = 0;
      const t = segLength > 0 ? pos / segLength : 0;
      placeDot(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    }
  }
}

// SMALL TOP-DOWN PLACEHOLDER SHIP (PIXEL, AXIS-ALIGNED)
function drawShip(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
): void {
  const w = size;
  const h = Math.max(4, Math.round(size * 0.62));
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h / 2);

  // HULL
  ctx.fillStyle = "rgb(46 32 22)";
  ctx.fillRect(x, y, w, h);
  // DECK
  ctx.fillStyle = "rgb(158 116 74)";
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  // SAIL
  const sail = Math.max(2, Math.round(size * 0.3));
  ctx.fillStyle = "rgb(244 244 245)";
  ctx.fillRect(Math.round(cx - sail / 2), Math.round(cy - sail / 2), sail, sail);
  // PENNANT IN ROUTE COLOR
  const flagH = Math.max(2, Math.round(size * 0.2));
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(cx - 1), y - flagH, 2, flagH);
}

// LOOP FOR PIRATES; PING-PONG ALONG THE LANE FOR MERCHANTS
function transitDistance(
  elapsed: number,
  speedPx: number,
  total: number,
  closed: boolean,
): number {
  if (total <= 0) {
    return 0;
  }
  const traveled = elapsed * speedPx;
  if (closed) {
    return traveled % total;
  }
  const period = total * 2;
  const phase = traveled % period;
  return phase <= total ? phase : period - phase;
}

export function RouteShipOverlay({
  routes,
  rows,
  cols,
  tileWidth,
}: RouteShipOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metrics = useMemo(
    () => isoMetrics(tileWidth, rows, cols),
    [tileWidth, rows, cols],
  );

  const prepared = useMemo<PreparedRoute[]>(() => {
    return routes.map((route) => {
      const definition = routeDefinition(route.defId);
      const centers = route.path.map((cell) =>
        isoCellCenter(cell.row, cell.col, metrics),
      );
      const points = smoothPoints(centers, route.closed);
      const arc = buildArcTable(points);
      return {
        id: route.id,
        closed: route.closed,
        color: definition?.color ?? "rgb(226 232 240)",
        speedPx: (definition?.speed ?? 3) * metrics.halfW,
        points,
        cumulative: arc.cumulative,
        total: arc.total,
      };
    });
  }, [routes, metrics]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const shipSize = Math.max(6, Math.round(tileWidth * 0.36));
    const start = performance.now();
    let raf = 0;

    const render = (now: number) => {
      const elapsed = (now - start) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const route of prepared) {
        drawPixelTrail(ctx, route.points, route.color, tileWidth);

        if (route.total > 0) {
          const distance = transitDistance(
            elapsed,
            route.speedPx,
            route.total,
            route.closed,
          );
          const sample = samplePath(route.points, route.cumulative, distance);
          drawShip(ctx, sample.x, sample.y, shipSize, route.color);
        }
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [prepared, tileWidth, metrics.width, metrics.height]);

  if (routes.length === 0) {
    return null;
  }

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

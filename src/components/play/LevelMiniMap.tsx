"use client";

import { useEffect, useRef } from "react";

import { indexFor } from "@/lib/game/coords";
import type { Mission, TileKind } from "@/lib/game/types";
import { flatTerrainRgb, missionMarkerRgb } from "@/lib/rendering/flatTerrain";

type LevelMiniMapProps = {
  rows: number;
  cols: number;
  terrain: TileKind[];
  mission: Mission;
  className?: string;
};

function paintPixel(
  data: Uint8ClampedArray,
  cols: number,
  row: number,
  col: number,
  rgb: { r: number; g: number; b: number },
) {
  const offset = (row * cols + col) * 4;
  data[offset] = rgb.r;
  data[offset + 1] = rgb.g;
  data[offset + 2] = rgb.b;
  data[offset + 3] = 255;
}

/** FLAT PER-CELL THUMBNAIL — NO NOISE / OVERLAYS */
export function LevelMiniMap({
  rows,
  cols,
  terrain,
  mission,
  className,
}: LevelMiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rows <= 0 || cols <= 0) {
      return;
    }
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const image = ctx.createImageData(cols, rows);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const kind = terrain[indexFor(row, col, cols)] ?? "ocean";
        paintPixel(image.data, cols, row, col, flatTerrainRgb(kind));
      }
    }

    paintPixel(image.data, cols, mission.x.row, mission.x.col, missionMarkerRgb("x"));
    paintPixel(image.data, cols, mission.y.row, mission.y.col, missionMarkerRgb("y"));
    paintPixel(image.data, cols, mission.z.row, mission.z.col, missionMarkerRgb("z"));

    ctx.putImageData(image, 0, 0);
  }, [rows, cols, terrain, mission]);

  return (
    <canvas
      ref={canvasRef}
      width={cols}
      height={rows}
      aria-hidden
      className={["h-full w-full object-cover", className].filter(Boolean).join(" ")}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

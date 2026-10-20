"use client";

import { useEffect, useRef } from "react";

import { indexFor } from "@/lib/game/coords";
import type { CellCoord, Mission, TileKind } from "@/lib/game/types";
import { flatTerrainRgb, missionMarkerRgb } from "@/lib/rendering/flatTerrain";
import { grassKeysOnStartIsland } from "@/lib/rendering/terrainView";

type LevelMiniMapProps = {
  rows: number;
  cols: number;
  terrain: TileKind[];
  mission: Mission;
  start?: CellCoord;
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
  start,
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

    if (start) {
      const mud = grassKeysOnStartIsland(terrain, rows, cols, start);
      for (const key of mud) {
        const [row, col] = key.split(",").map(Number) as [number, number];
        paintPixel(image.data, cols, row, col, { r: 168, g: 124, b: 72 });
      }
    }

    paintPixel(image.data, cols, mission.x.row, mission.x.col, missionMarkerRgb("x"));
    paintPixel(image.data, cols, mission.y.row, mission.y.col, missionMarkerRgb("y"));
    paintPixel(image.data, cols, mission.z.row, mission.z.col, missionMarkerRgb("z"));
    if (start) {
      paintPixel(image.data, cols, start.row, start.col, { r: 244, g: 176, b: 198 });
    }

    ctx.putImageData(image, 0, 0);
  }, [rows, cols, terrain, mission, start]);

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

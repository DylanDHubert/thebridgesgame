import { DIRECTIONS } from "@/lib/game/constants";
import { cellKey } from "@/lib/game/coords";
import { isoSpriteOrigin, SPRITE_NATIVE, type IsoMetrics } from "@/lib/rendering/isoTiles";
import type { TerrainView } from "@/lib/rendering/terrainView";
import { terrainKindAt } from "@/lib/rendering/terrainView";

export type CliffSeam = {
  id: string;
  row: number;
  col: number;
  edge: SeamEdge;
};

type SeamEdge = "n" | "e" | "s" | "w";

const BLACK = "#111111";
const YELLOW = "#fbbf24";

/** TILES STAND A PIXEL PROUD. NUDGE THE SEAM OFF THE SOUTHWEST BIAS. */
const LIFT_X = 1;
const LIFT_Y = -1;

/**
 * RIM OF THE 32×32 DIAMOND, TWO PIXELS PER STEP.
 * NORTH AND WEST ARE THE TOP EDGES. EAST AND SOUTH RUN DOWN THE FRONT.
 */
const EDGE_PIXELS: Record<SeamEdge, readonly (readonly [number, number])[]> = {
  n: steps(8, (i) => [16 + i * 2, 8 + i]),
  w: steps(8, (i) => [14 - i * 2, 8 + i]),
  e: steps(8, (i) => [30 - i * 2, 16 + i]),
  s: steps(8, (i) => [i * 2, 16 + i]),
};

function steps(
  count: number,
  at: (i: number) => [number, number],
): (readonly [number, number])[] {
  const pixels: (readonly [number, number])[] = [];
  for (let i = 0; i < count; i += 1) {
    const [x, y] = at(i);
    pixels.push([x, y], [x + 1, y]);
  }
  return pixels;
}

function edgeFor(dr: number, dc: number): SeamEdge {
  if (dr === -1) {
    return "n";
  }
  if (dc === 1) {
    return "e";
  }
  if (dr === 1) {
    return "s";
  }
  return "w";
}

/** EVERY BRIDGE EDGE THAT TOUCHES A CLIFF. THOSE TWO DO NOT CONNECT. */
export function cliffSeams(view: TerrainView, bridges: Set<string>): CliffSeam[] {
  const seams: CliffSeam[] = [];
  for (const key of bridges) {
    const [rowText, colText] = key.split(",");
    const row = Number(rowText);
    const col = Number(colText);
    if (!Number.isFinite(row) || !Number.isFinite(col)) {
      continue;
    }
    for (const { dr, dc } of DIRECTIONS) {
      if (terrainKindAt(view, row + dr, col + dc) !== "cliff") {
        continue;
      }
      seams.push({
        id: `${cellKey(row, col)}:${dr},${dc}`,
        row,
        col,
        edge: edgeFor(dr, dc),
      });
    }
  }
  return seams;
}

/** TWO SPRITE PIXELS WIDE. SCALED WITH THE TILE SO IT STAYS ON THE GRID. */
export function drawCliffSeams(
  ctx: CanvasRenderingContext2D,
  seams: readonly CliffSeam[],
  metrics: IsoMetrics,
  hidden: ReadonlySet<string>,
): void {
  const stamp = document.createElement("canvas");
  stamp.width = SPRITE_NATIVE;
  stamp.height = SPRITE_NATIVE;
  const pen = stamp.getContext("2d");
  if (!pen) {
    return;
  }
  ctx.imageSmoothingEnabled = false;
  for (const seam of seams) {
    if (hidden.has(seam.id)) {
      continue;
    }
    pen.clearRect(0, 0, SPRITE_NATIVE, SPRITE_NATIVE);
    const pixels = EDGE_PIXELS[seam.edge];
    for (let i = 0; i < pixels.length; i += 2) {
      const [px, py] = pixels[i]!;
      const x = px + LIFT_X;
      const y = py + LIFT_Y;
      if (y < 0 || y >= SPRITE_NATIVE || x >= SPRITE_NATIVE) {
        continue;
      }
      const left = Math.max(0, x);
      const width = Math.min(2, SPRITE_NATIVE - left) - Math.max(0, -x);
      if (width <= 0) {
        continue;
      }
      pen.fillStyle = i % 4 === 0 ? BLACK : YELLOW;
      pen.fillRect(left, y, width, 2);
    }
    const origin = isoSpriteOrigin(seam.row, seam.col, metrics);
    ctx.drawImage(stamp, origin.x, origin.y, metrics.tileWidth, metrics.tileWidth);
  }
}

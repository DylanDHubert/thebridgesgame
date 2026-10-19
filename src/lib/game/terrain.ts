import { DIRECTIONS } from "./constants";
import { cellKey, indexFor, inBounds } from "./coords";
import { isoCellRole, type IsoSpan } from "./isoBoard";
import { isLandKind } from "./rules";
import type { CellCoord } from "./types";
import type { TerrainView } from "@/lib/rendering/terrainView";
import { terrainKindAt } from "@/lib/rendering/terrainView";

export type TerrainMaps = {
  distanceFromLand: number[][];
};

export function buildTerrainMaps(view: TerrainView): TerrainMaps {
  const { rows, cols } = view;
  const distanceFromLand = Array.from({ length: rows }, () =>
    Array<number>(cols).fill(Infinity),
  );
  const queue: CellCoord[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const kind = terrainKindAt(view, row, col)!;
      if (!isLandKind(kind)) {
        continue;
      }

      distanceFromLand[row]![col] = 0;
      queue.push({ row, col });
    }
  }

  let head = 0;
  while (head < queue.length) {
    const { row, col } = queue[head]!;
    head += 1;
    const currentDistance = distanceFromLand[row]![col]!;

    for (const { dr, dc } of DIRECTIONS) {
      const nr = row + dr;
      const nc = col + dc;
      if (!inBounds(nr, nc, rows, cols)) {
        continue;
      }
      const nextDistance = currentDistance + 1;
      if (nextDistance >= distanceFromLand[nr]![nc]!) {
        continue;
      }
      distanceFromLand[nr]![nc] = nextDistance;
      queue.push({ row: nr, col: nc });
    }
  }

  return { distanceFromLand };
}

/**
 * 0 AT THE SHORE, 1 AT THE FARTHEST PLAYABLE WATER.
 * PADDING AND THE BLEED RIM DO NOT RAISE THE CEILING, SO CHANNELS BETWEEN ISLANDS CAN GO DARK.
 * VOIDS ARE SKIPPED SO THE CORNERS OF THE STORED RECTANGLE DO NOT SHORTCUT DEPTH.
 */
export function latticeWaterDepth(
  view: TerrainView,
  depthSpan: IsoSpan = view.iso,
): (row: number, col: number) => number {
  const distance = new Map<string, number>();
  const queue: CellCoord[] = [];
  const onBoard = (row: number, col: number) =>
    isoCellRole(row, col, view.iso) !== "void";
  const setsCeiling = (row: number, col: number) =>
    isoCellRole(row, col, depthSpan) === "play";

  for (let row = 0; row < view.rows; row += 1) {
    for (let col = 0; col < view.cols; col += 1) {
      if (!onBoard(row, col)) {
        continue;
      }
      const kind = terrainKindAt(view, row, col);
      if (!kind || !isLandKind(kind)) {
        continue;
      }
      distance.set(cellKey(row, col), 0);
      queue.push({ row, col });
    }
  }

  let maxWater = 1;
  let head = 0;
  while (head < queue.length) {
    const current = queue[head]!;
    head += 1;
    const here = distance.get(cellKey(current.row, current.col))!;
    for (const { dr, dc } of DIRECTIONS) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (!inBounds(nr, nc, view.rows, view.cols) || !onBoard(nr, nc)) {
        continue;
      }
      const key = cellKey(nr, nc);
      if (distance.has(key)) {
        continue;
      }
      const next = here + 1;
      distance.set(key, next);
      queue.push({ row: nr, col: nc });
      const kind = terrainKindAt(view, nr, nc);
      if (
        (kind === "ocean" || kind === "marsh") &&
        setsCeiling(nr, nc) &&
        next > maxWater
      ) {
        maxWater = next;
      }
    }
  }

  return (row: number, col: number) => {
    const value = distance.get(cellKey(row, col));
    if (value === undefined) {
      return 1;
    }
    // FIRST WATER RING TOUCHES LAND, SO IT IS THE SHALLOW END
    return waterDepthAt(Math.max(0, value - 1), Math.max(1, maxWater - 1));
  };
}

export function waterDepthAt(distance: number, maxDepth: number): number {
  if (!Number.isFinite(distance)) {
    return 1;
  }
  const clamped = Math.min(distance, maxDepth);
  return clamped / maxDepth;
}

export function maxWaterDistance(maps: TerrainMaps): number {
  let max = 1;
  for (const row of maps.distanceFromLand) {
    for (const value of row) {
      if (Number.isFinite(value) && value > max) {
        max = value;
      }
    }
  }
  return max;
}

export function pathKeySet(path: CellCoord[]): Set<string> {
  return new Set(path.map(({ row, col }) => cellKey(row, col)));
}

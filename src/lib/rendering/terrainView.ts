import { DIRECTIONS } from "@/lib/game/constants";
import { cellKey } from "@/lib/game/coords";
import type { IsoSpan } from "@/lib/game/isoBoard";
import type { Level } from "@/lib/game/level/types";
import type { CellCoord, TileKind } from "@/lib/game/types";

/** MINIMAL INPUT FOR TERRAIN RENDERING — DECOUPLED FROM PLAY STATE */
export type TerrainView = {
  seed: string;
  rows: number;
  cols: number;
  terrain: readonly TileKind[];
  iso: IsoSpan;
  /** BOAR START. GRASS ON ITS ISLAND DRAWS AS MUD. */
  start?: CellCoord;
};

export function terrainViewFromLevel(level: Level): TerrainView {
  return {
    seed: level.seed,
    rows: level.rows,
    cols: level.cols,
    terrain: level.terrain,
    iso: level.iso,
    ...(level.start ? { start: level.start } : {}),
  };
}

/**
 * GRASS CELLS SHARING LAND WITH THE START.
 * THEY STAY GRASS IN THE RULES. THE SPRITE IS A MUD BLOCK.
 */
export function grassKeysOnStartIsland(
  terrain: readonly TileKind[],
  rows: number,
  cols: number,
  start: CellCoord | undefined,
): Set<string> {
  const keys = new Set<string>();
  if (!start) {
    return keys;
  }

  const at = (row: number, col: number): TileKind | undefined => {
    if (row < 0 || col < 0 || row >= rows || col >= cols) {
      return undefined;
    }
    return terrain[row * cols + col];
  };

  const queue: CellCoord[] = [start];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const current = queue.pop()!;
    const key = cellKey(current.row, current.col);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const kind = at(current.row, current.col);
    if (kind !== "grass" && kind !== "cliff") {
      continue;
    }
    if (kind === "grass") {
      keys.add(key);
    }
    for (const { dr, dc } of DIRECTIONS) {
      queue.push({ row: current.row + dr, col: current.col + dc });
    }
  }

  return keys;
}

export function terrainKindAt(
  view: TerrainView,
  row: number,
  col: number,
): TileKind | undefined {
  if (row < 0 || col < 0 || row >= view.rows || col >= view.cols) {
    return undefined;
  }
  return view.terrain[row * view.cols + col];
}

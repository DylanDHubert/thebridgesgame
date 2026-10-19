import { DIRECTIONS } from "../constants";
import {
  isoBoardFromContent,
  isoCellRole,
  isIsoSpan,
  type IsoSpan,
} from "../isoBoard";
import type { CellCoord, TileKind } from "../types";
import {
  LEVEL_FILE_VERSION,
  type Level,
  type LevelFile,
  type LevelObject,
  type LevelRoute,
} from "./types";

const TERRAIN_TO_CODE: Record<TileKind, string> = {
  ocean: "o",
  marsh: "m",
  grass: "g",
  cliff: "c",
};

const CODE_TO_TERRAIN: Record<string, TileKind> = {
  o: "ocean",
  m: "marsh",
  b: "grass",
  g: "grass",
  c: "cliff",
};

function encodeTerrain(terrain: TileKind[]): string {
  return terrain.map((kind) => TERRAIN_TO_CODE[kind] ?? "o").join("");
}

function decodeTerrain(encoded: string, expectedLength: number): TileKind[] {
  const terrain: TileKind[] = [];
  for (let index = 0; index < expectedLength; index += 1) {
    terrain.push(CODE_TO_TERRAIN[encoded[index] ?? "o"] ?? "ocean");
  }
  return terrain;
}

function coordPair(cell: { row: number; col: number }): [number, number] {
  return [cell.row, cell.col];
}

export function serializeLevel(level: Level, author?: string): LevelFile {
  return {
    version: LEVEL_FILE_VERSION,
    id: level.id,
    name: level.name,
    seed: level.seed,
    grid: { rows: level.rows, cols: level.cols },
    iso: level.iso,
    terrain: encodeTerrain(level.terrain),
    mission: {
      x: coordPair(level.mission.x),
      y: coordPair(level.mission.y),
      z: coordPair(level.mission.z),
    },
    objects: level.objects.map((object) => ({
      defId: object.defId,
      row: object.at.row,
      col: object.at.col,
      ...(object.config ? { config: object.config } : {}),
    })),
    routes: level.routes.map((route) => ({
      id: route.id,
      defId: route.defId,
      closed: route.closed,
      path: route.path.map((cell) => [cell.row, cell.col] as [number, number]),
      ...(route.config ? { config: route.config } : {}),
    })),
    meta: {
      ...(author ? { author } : {}),
      createdAt: new Date().toISOString(),
    },
  };
}

const FALLBACK_MISSION = {
  x: { row: 1, col: 1 },
  y: { row: 2, col: 2 },
  z: { row: 3, col: 3 },
};

const LAND: ReadonlySet<TileKind> = new Set(["grass", "cliff"]);

function shiftCell(cell: CellCoord, minRow: number, minCol: number): CellCoord {
  return { row: cell.row - minRow, col: cell.col - minCol };
}

/** NEAREST PLAYABLE LAND, THEN ANY UNUSED PLAYABLE CELL. KEEPS X/Y/Z ON THE INTERIOR. */
function nearestPlayable(
  terrain: TileKind[],
  rows: number,
  cols: number,
  span: IsoSpan,
  start: CellCoord,
  used: Set<string>,
): CellCoord {
  const queue: CellCoord[] = [start];
  const seen = new Set<string>();
  let openWater: CellCoord | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.row},${current.col}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (
      current.row < 0 ||
      current.col < 0 ||
      current.row >= rows ||
      current.col >= cols
    ) {
      continue;
    }
    for (const { dr, dc } of DIRECTIONS) {
      queue.push({ row: current.row + dr, col: current.col + dc });
    }
    if (isoCellRole(current.row, current.col, span) !== "play" || used.has(key)) {
      continue;
    }
    const kind = terrain[current.row * cols + current.col] ?? "ocean";
    if (LAND.has(kind)) {
      return current;
    }
    if (!openWater) {
      openWater = current;
    }
  }

  return (
    openWater ?? {
      row: Math.min(rows - 1, Math.max(0, start.row)),
      col: Math.min(cols - 1, Math.max(0, start.col)),
    }
  );
}

/**
 * V2 CONTENT RECTS BECOME THE ISO RECTANGLE.
 * OUTER TWO LAYERS ARE OCEAN PADDING. INTERIOR CELLS KEEP THEIR TERRAIN.
 * CORNER CELLS THAT WERE OFF THE OLD RECTANGLE ARE PLAYABLE OCEAN UNTIL REGENERATED.
 */
function embedContentLevel(level: Omit<Level, "iso">): Level {
  const board = isoBoardFromContent(level.rows, level.cols);
  const terrain: TileKind[] = Array.from(
    { length: board.rows * board.cols },
    () => "ocean" as TileKind,
  );

  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      const stored = shiftCell({ row, col }, board.minRow, board.minCol);
      if (isoCellRole(stored.row, stored.col, board.span) !== "play") {
        continue;
      }
      terrain[stored.row * board.cols + stored.col] =
        level.terrain[row * level.cols + col] ?? "ocean";
    }
  }

  const used = new Set<string>();
  const placeMission = (cell: CellCoord): CellCoord => {
    const shifted = shiftCell(cell, board.minRow, board.minCol);
    const placed = nearestPlayable(
      terrain,
      board.rows,
      board.cols,
      board.span,
      shifted,
      used,
    );
    if (placed.row !== shifted.row || placed.col !== shifted.col) {
      console.error("[journeyman:iso] moved mission off the padding ring", {
        from: shifted,
        to: placed,
      });
    }
    used.add(`${placed.row},${placed.col}`);
    return placed;
  };

  const objects: LevelObject[] = [];
  for (const object of level.objects) {
    const at = shiftCell(object.at, board.minRow, board.minCol);
    if (isoCellRole(at.row, at.col, board.span) !== "play") {
      continue;
    }
    objects.push({ ...object, at });
  }

  const routes: LevelRoute[] = [];
  for (const route of level.routes) {
    const path = route.path
      .map((cell) => shiftCell(cell, board.minRow, board.minCol))
      .filter((cell) => isoCellRole(cell.row, cell.col, board.span) === "play");
    if (path.length === 0) {
      continue;
    }
    routes.push({ ...route, path });
  }

  return {
    ...level,
    rows: board.rows,
    cols: board.cols,
    terrain,
    objects,
    routes,
    mission: {
      x: placeMission(level.mission.x),
      y: placeMission(level.mission.y),
      z: placeMission(level.mission.z),
    },
    iso: board.span,
  };
}

export function deserializeLevel(file: LevelFile): Level {
  const { rows, cols } = file.grid;
  const terrain = decodeTerrain(file.terrain, rows * cols);

  const objects: LevelObject[] = file.objects.map((object) => ({
    defId: object.defId,
    at: { row: object.row, col: object.col },
    ...(object.config ? { config: object.config } : {}),
  }));

  const routes: LevelRoute[] = file.routes.map((route) => ({
    id: route.id,
    defId: route.defId,
    closed: route.closed,
    path: route.path.map(([row, col]) => ({ row, col })),
    ...(route.config ? { config: route.config } : {}),
  }));

  const mission = file.mission
    ? {
        x: { row: file.mission.x[0], col: file.mission.x[1] },
        y: { row: file.mission.y[0], col: file.mission.y[1] },
        z: { row: file.mission.z[0], col: file.mission.z[1] },
      }
    : FALLBACK_MISSION;

  const decoded = {
    id: file.id,
    name: file.name,
    seed: file.seed,
    rows,
    cols,
    terrain,
    objects: [],
    routes: [],
    mission,
  };

  if (isIsoSpan(file.iso)) {
    return { ...decoded, iso: file.iso };
  }

  return embedContentLevel(decoded);
}

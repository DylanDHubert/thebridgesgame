import { DIRECTIONS } from "@/lib/game/constants";
import { cellKey, coordKey, inBounds } from "@/lib/game/coords";
import type { Level } from "@/lib/game/level/types";
import { isLandKind, terrainKindAt } from "@/lib/game/rules";
import { floodReachable } from "@/lib/game/simulateLevel";
import type { CellCoord } from "@/lib/game/types";

export const HOME_LEVEL_ID = "home";

export type HomeDestination = "play" | "create" | "how" | "daily";

export type HomeIslandLabel = {
  id: "home" | "play" | "create" | "daily";
  label: string;
  at: CellCoord;
  color: string;
};

export type HomeMapMeta = {
  level: Level;
  homeOrigin: CellCoord;
  playCells: Set<string>;
  createCells: Set<string>;
  dailyCells: Set<string>;
  /** LAND ABOVE THE HOME ISLAND. NOT STORED ON THE FILE. */
  howCells: Set<string>;
  howAt: CellCoord | null;
  labels: HomeIslandLabel[];
};

/** LAND-ONLY FLOOD — ISLAND MEMBERSHIP (NO BRIDGES) */
export function floodLandComponent(
  level: Level,
  origin: CellCoord,
): Set<string> {
  const visited = new Set<string>();
  const kind = terrainKindAt(level, origin.row, origin.col);
  if (!kind || !isLandKind(kind)) {
    return visited;
  }

  const queue: CellCoord[] = [origin];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = coordKey(current);
    if (visited.has(key)) {
      continue;
    }
    const here = terrainKindAt(level, current.row, current.col);
    if (!here || !isLandKind(here)) {
      continue;
    }
    visited.add(key);
    for (const { dr, dc } of DIRECTIONS) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (!inBounds(nr, nc, level.rows, level.cols)) {
        continue;
      }
      const neighbor = terrainKindAt(level, nr, nc);
      if (neighbor && isLandKind(neighbor) && !visited.has(cellKey(nr, nc))) {
        queue.push({ row: nr, col: nc });
      }
    }
  }
  return visited;
}

function meanDepth(cells: Set<string>): number {
  let total = 0;
  for (const key of cells) {
    const [row, col] = key.split(",").map(Number) as [number, number];
    total += row + col;
  }
  return cells.size === 0 ? Infinity : total / cells.size;
}

/** CELL OF THE ISLAND NEAREST ITS MIDDLE, SO THE LABEL SITS ON LAND. */
function labelCell(cells: Set<string>): CellCoord {
  let rowSum = 0;
  let colSum = 0;
  for (const key of cells) {
    const [row, col] = key.split(",").map(Number) as [number, number];
    rowSum += row;
    colSum += col;
  }
  const targetRow = rowSum / cells.size;
  const targetCol = colSum / cells.size;
  let best: CellCoord = { row: 0, col: 0 };
  let bestDistance = Infinity;
  for (const key of cells) {
    const [row, col] = key.split(",").map(Number) as [number, number];
    const distance = (row - targetRow) ** 2 + (col - targetCol) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { row, col };
    }
  }
  return best;
}

function allLandIslands(level: Level): Set<string>[] {
  const seen = new Set<string>();
  const islands: Set<string>[] = [];
  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      const key = cellKey(row, col);
      if (seen.has(key)) {
        continue;
      }
      const kind = terrainKindAt(level, row, col);
      if (!kind || !isLandKind(kind)) {
        continue;
      }
      const island = floodLandComponent(level, { row, col });
      for (const entry of island) {
        seen.add(entry);
      }
      if (island.size > 0) {
        islands.push(island);
      }
    }
  }
  return islands;
}

/**
 * THE LAND MASS ABOVE THE HOME ISLAND.
 * SCREEN-UP IS A SMALLER ROW+COL. THE BIGGEST SUCH ISLAND GETS THE HOW LABEL.
 */
function islandAboveHome(
  level: Level,
  homeCells: Set<string>,
  reserved: Set<string>,
): Set<string> | null {
  const homeDepth = meanDepth(homeCells);
  let best: Set<string> | null = null;
  for (const island of allLandIslands(level)) {
    const sample = island.values().next().value;
    if (!sample || reserved.has(sample) || homeCells.has(sample)) {
      continue;
    }
    if (meanDepth(island) >= homeDepth) {
      continue;
    }
    if (!best || island.size > best.size) {
      best = island;
    }
  }
  return best;
}

/**
 * HOME MAP FROM A LEVEL FILE.
 * Mission convention: X = HOME origin, Y = PLAY island, Z = CREATE island.
 * DAILY IS level.daily. HOW IS THE ISLAND ABOVE HOME.
 */
export function homeMapFromLevel(level: Level): HomeMapMeta {
  const homeOrigin = level.mission.x;
  const playCells = floodLandComponent(level, level.mission.y);
  const createCells = floodLandComponent(level, level.mission.z);
  const dailyCells = level.daily
    ? floodLandComponent(level, level.daily)
    : new Set<string>();

  if (playCells.size === 0) {
    console.error("[journeyman:home] PLAY mission Y is not on land", level.mission.y);
  }
  if (createCells.size === 0) {
    console.error("[journeyman:home] CREATE mission Z is not on land", level.mission.z);
  }

  const homeCells = floodLandComponent(level, homeOrigin);
  const reserved = new Set<string>([...playCells, ...createCells, ...dailyCells]);
  const howIsland = islandAboveHome(level, homeCells, reserved);
  const howCells = howIsland ?? new Set<string>();
  const howAt = howIsland ? labelCell(howIsland) : null;

  const yellow = "#fbbf24";
  const labels: HomeIslandLabel[] = [
    {
      id: "home",
      label: "HOME",
      at: homeOrigin,
      color: yellow,
    },
    {
      id: "play",
      label: "PLAY",
      at: level.mission.y,
      color: yellow,
    },
    {
      id: "create",
      label: "CREATE",
      at: level.mission.z,
      color: yellow,
    },
  ];
  if (level.daily && dailyCells.size > 0) {
    labels.push({
      id: "daily",
      label: "DAILY",
      at: level.daily,
      color: yellow,
    });
  }

  return {
    level,
    homeOrigin,
    playCells,
    createCells,
    dailyCells,
    howCells,
    howAt,
    labels,
  };
}

/** LIVE: HOME CONNECTED TO PLAY, DAILY, CREATE, OR THE ISLAND ABOVE */
export function resolveHomeDestination(
  level: Level,
  bridges: Set<string>,
  homeOrigin: CellCoord,
  playCells: Set<string>,
  createCells: Set<string>,
  dailyCells: Set<string>,
  howCells: Set<string>,
): HomeDestination | null {
  const reachable = floodReachable(level, bridges, homeOrigin);

  let playHit = false;
  let createHit = false;
  let dailyHit = false;
  let howHit = false;
  for (const key of reachable) {
    if (playCells.has(key)) {
      playHit = true;
    }
    if (createCells.has(key)) {
      createHit = true;
    }
    if (dailyCells.has(key)) {
      dailyHit = true;
    }
    if (howCells.has(key)) {
      howHit = true;
    }
  }

  if (playHit) {
    return "play";
  }
  if (dailyHit) {
    return "daily";
  }
  if (createHit) {
    return "create";
  }
  if (howHit) {
    return "how";
  }
  return null;
}

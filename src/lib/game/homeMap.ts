import { DIRECTIONS } from "@/lib/game/constants";
import { cellKey, coordKey, inBounds } from "@/lib/game/coords";
import type { Level } from "@/lib/game/level/types";
import { isLandKind, terrainKindAt } from "@/lib/game/rules";
import { floodReachable } from "@/lib/game/simulateLevel";
import type { CellCoord } from "@/lib/game/types";

export const HOME_LEVEL_ID = "home";

export type HomeDestination = "play" | "create";

export type HomeIslandLabel = {
  id: "home" | "play" | "create";
  label: string;
  at: CellCoord;
  color: string;
};

export type HomeMapMeta = {
  level: Level;
  homeOrigin: CellCoord;
  playCells: Set<string>;
  createCells: Set<string>;
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

/**
 * HOME MAP FROM A LEVEL FILE.
 * Mission convention: X = HOME origin, Y = PLAY island, Z = CREATE island.
 */
export function homeMapFromLevel(level: Level): HomeMapMeta {
  const homeOrigin = level.mission.x;
  const playCells = floodLandComponent(level, level.mission.y);
  const createCells = floodLandComponent(level, level.mission.z);

  if (playCells.size === 0) {
    console.error("[journeyman:home] PLAY mission Y is not on land", level.mission.y);
  }
  if (createCells.size === 0) {
    console.error("[journeyman:home] CREATE mission Z is not on land", level.mission.z);
  }

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

  return { level, homeOrigin, playCells, createCells, labels };
}

/** LIVE: HOME CONNECTED TO PLAY OR CREATE VIA BRIDGES */
export function resolveHomeDestination(
  level: Level,
  bridges: Set<string>,
  homeOrigin: CellCoord,
  playCells: Set<string>,
  createCells: Set<string>,
): HomeDestination | null {
  const reachable = floodReachable(level, bridges, homeOrigin);

  let playHit = false;
  let createHit = false;
  for (const key of reachable) {
    if (playCells.has(key)) {
      playHit = true;
    }
    if (createCells.has(key)) {
      createHit = true;
    }
  }

  if (playHit) {
    return "play";
  }
  if (createHit) {
    return "create";
  }
  return null;
}

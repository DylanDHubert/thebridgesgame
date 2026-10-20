import { DIRECTIONS } from "./constants";
import { cellKey, coordKey, inBounds } from "./coords";
import type { Level } from "./level/types";
import type { CellCoord, Mission, SimulationResult } from "./types";
import {
  bridgeCostAt,
  canPlaceBridgeAt,
  canTraverseAt,
  isWalkableAt,
  totalBridgeCost,
} from "./rules";

export function missionCheckpoints(mission: Mission): CellCoord[] {
  return [mission.x, mission.y, mission.z];
}

export function floodReachable(
  level: Level,
  bridges: Set<string>,
  origin: CellCoord,
): Set<string> {
  const visited = new Set<string>();
  const queue: CellCoord[] = [origin];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = coordKey(current);
    if (visited.has(key)) {
      continue;
    }
    if (!isWalkableAt(level, current.row, current.col, bridges)) {
      continue;
    }
    visited.add(key);
    for (const { dr, dc } of DIRECTIONS) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (canTraverseAt(level, current.row, current.col, nr, nc, bridges)) {
        queue.push({ row: nr, col: nc });
      }
    }
  }

  return visited;
}

export function shortestPath(
  level: Level,
  bridges: Set<string>,
  from: CellCoord,
  to: CellCoord,
): CellCoord[] {
  const startKey = coordKey(from);
  const goalKey = coordKey(to);
  const queue: CellCoord[] = [from];
  const previous = new Map<string, string | null>([[startKey, null]]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = coordKey(current);
    if (currentKey === goalKey) {
      break;
    }
    for (const { dr, dc } of DIRECTIONS) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (!inBounds(nr, nc, level.rows, level.cols)) {
        continue;
      }
      const neighborKey = cellKey(nr, nc);
      if (previous.has(neighborKey)) {
        continue;
      }
      if (!canTraverseAt(level, current.row, current.col, nr, nc, bridges)) {
        continue;
      }
      previous.set(neighborKey, currentKey);
      queue.push({ row: nr, col: nc });
    }
  }

  if (!previous.has(goalKey)) {
    return [];
  }

  const path: CellCoord[] = [];
  let cursor: string | null = goalKey;
  while (cursor) {
    const [row, col] = cursor.split(",").map(Number) as [number, number];
    path.unshift({ row, col });
    cursor = previous.get(cursor) ?? null;
  }
  return path;
}

function sameCell(a: CellCoord, b: CellCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

/** WALK FROM THE START, ALWAYS TO THE NEAREST FLOWER STILL LEFT */
function tourFromStart(
  level: Level,
  bridges: Set<string>,
  origin: CellCoord,
  flowers: CellCoord[],
): CellCoord[] {
  const remaining = [...flowers];
  let cursor = origin;
  const full: CellCoord[] = [];

  while (remaining.length > 0) {
    let bestIndex = -1;
    let bestPath: CellCoord[] = [];
    for (let index = 0; index < remaining.length; index += 1) {
      const flower = remaining[index]!;
      if (sameCell(cursor, flower)) {
        bestIndex = index;
        bestPath = [cursor];
        break;
      }
      const path = shortestPath(level, bridges, cursor, flower);
      if (path.length === 0) {
        return [];
      }
      if (bestIndex < 0 || path.length < bestPath.length) {
        bestPath = path;
        bestIndex = index;
      }
    }
    if (bestIndex < 0) {
      return [];
    }
    if (full.length === 0) {
      full.push(...bestPath);
    } else {
      full.push(...bestPath.slice(1));
    }
    cursor = remaining[bestIndex]!;
    remaining.splice(bestIndex, 1);
  }

  return full;
}

/** THE ROUTE THE BOAR WALKS ONCE EVERY FLOWER IS REACHABLE */
export function displayMissionPath(
  level: Level,
  bridges: Set<string>,
  mission: Mission,
): CellCoord[] {
  const flowers = missionCheckpoints(mission);
  if (level.start) {
    return tourFromStart(level, bridges, level.start, flowers);
  }
  const leg1 = shortestPath(level, bridges, mission.x, mission.y);
  if (leg1.length === 0) {
    return [];
  }
  const leg2 = shortestPath(level, bridges, mission.y, mission.z);
  if (leg2.length === 0) {
    return [];
  }
  return [...leg1, ...leg2.slice(1)];
}

/** START AND ALL THREE FLOWERS IN ONE WALKABLE COMPONENT (ORDER-AGNOSTIC) */
export function isMissionComplete(
  level: Level,
  bridges: Set<string>,
  mission: Mission,
): boolean {
  const checkpoints = missionCheckpoints(mission);
  const origin = level.start ?? mission.x;
  if (!isWalkableAt(level, origin.row, origin.col, bridges)) {
    return false;
  }
  if (!checkpoints.every((c) => isWalkableAt(level, c.row, c.col, bridges))) {
    return false;
  }
  const reachable = floodReachable(level, bridges, origin);
  return checkpoints.every((c) => reachable.has(coordKey(c)));
}

/**
 * SLIM PLAY SIMULATION — NO PAR SOLVER.
 * OLIVER: WIRE useLevelGame SUBMIT TO THIS.
 */
export function simulateLevel(
  level: Level,
  bridges: Set<string>,
): SimulationResult {
  const connected = isMissionComplete(level, bridges, level.mission);
  const origin = level.start ?? level.mission.x;
  const reachable = floodReachable(level, bridges, origin);
  const path = connected ? displayMissionPath(level, bridges, level.mission) : [];

  return {
    connected,
    bridgeCount: bridges.size,
    bridgeCost: totalBridgeCost(level, bridges),
    path,
    reachable,
  };
}

export { canPlaceBridgeAt, bridgeCostAt, totalBridgeCost };

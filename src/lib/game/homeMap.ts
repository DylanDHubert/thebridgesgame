import { DIRECTIONS } from "@/lib/game/constants";
import { cellKey, coordKey, inBounds, parseCellKey } from "@/lib/game/coords";
import type { HomeSpotId, Level } from "@/lib/game/level/types";
import { isLandKind, terrainKindAt } from "@/lib/game/rules";
import { floodReachable } from "@/lib/game/simulateLevel";
import type { CellCoord } from "@/lib/game/types";

export const HOME_LEVEL_ID = "home";

export const HOME_LINKS = [
  { id: "play", label: "PLAY", href: "/play" },
  { id: "daily", label: "DAILY", href: "/play?daily=1" },
  { id: "calendar", label: "CALENDAR", href: "/play/calendar" },
  { id: "create", label: "CREATE", href: "/create" },
  { id: "how", label: "TUTORIAL", href: "/tutorial" },
  { id: "creatures", label: "CREATURES", href: "/creatures" },
] as const;

export type HomeDestination = (typeof HOME_LINKS)[number]["id"];

export type HomeIslandLabel = {
  id: "home" | HomeDestination;
  label: string;
  at: CellCoord;
  color: string;
};

export type HomeMapMeta = {
  level: Level;
  homeOrigin: CellCoord;
  islands: Record<HomeDestination, Set<string>>;
  /** WHERE THE BOAR RUNS. NULL UNTIL THAT NAME HAS AN ISLAND. */
  anchors: Record<HomeDestination, CellCoord | null>;
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

function emptyIslands(): Record<HomeDestination, Set<string>> {
  return {
    play: new Set(),
    daily: new Set(),
    calendar: new Set(),
    create: new Set(),
    how: new Set(),
    creatures: new Set(),
  };
}

function spotAt(level: Level, id: HomeSpotId): CellCoord | null {
  return level.spots?.[id] ?? null;
}

/**
 * HOME MAP FROM A LEVEL FILE.
 * X IS HOME, Y IS PLAY, Z IS CREATE, daily IS DAILY.
 * CALENDAR AND CREATURES ARE SPOTS. TUTORIAL IS A SPOT, OR THE ISLAND ABOVE HOME.
 */
export function homeMapFromLevel(level: Level): HomeMapMeta {
  const homeOrigin = level.mission.x;
  const anchors: Record<HomeDestination, CellCoord | null> = {
    play: level.mission.y,
    daily: level.daily ?? null,
    calendar: spotAt(level, "calendar"),
    create: level.mission.z,
    how: spotAt(level, "how"),
    creatures: spotAt(level, "creatures"),
  };
  const islands = emptyIslands();
  for (const link of HOME_LINKS) {
    const at = anchors[link.id];
    if (at) {
      islands[link.id] = floodLandComponent(level, at);
    }
  }

  if (islands.play.size === 0) {
    console.error("[journeyman:home] PLAY mission Y is not on land", level.mission.y);
  }
  if (islands.create.size === 0) {
    console.error("[journeyman:home] CREATE mission Z is not on land", level.mission.z);
  }

  if (!anchors.how) {
    const homeCells = floodLandComponent(level, homeOrigin);
    const reserved = new Set<string>();
    for (const link of HOME_LINKS) {
      if (link.id === "how") {
        continue;
      }
      for (const key of islands[link.id]) {
        reserved.add(key);
      }
    }
    const howIsland = islandAboveHome(level, homeCells, reserved);
    if (howIsland) {
      islands.how = howIsland;
      anchors.how = labelCell(howIsland);
    }
  }

  const yellow = "#fbbf24";
  const labels: HomeIslandLabel[] = [
    { id: "home", label: "HOME", at: homeOrigin, color: yellow },
  ];
  for (const link of HOME_LINKS) {
    const at = anchors[link.id];
    if (!at || islands[link.id].size === 0) {
      continue;
    }
    labels.push({ id: link.id, label: link.label, at, color: yellow });
  }

  return { level, homeOrigin, islands, anchors, labels };
}

/** NAMES THAT ARE NOT ON AN ISLAND YET, SEATED ON HOME SO THEY CAN BE DRAGGED. */
export function homeEditorLabels(level: Level): HomeIslandLabel[] {
  const map = homeMapFromLevel(level);
  const placed = new Set(map.labels.map((label) => label.id));
  const homeCells = [...floodLandComponent(level, map.homeOrigin)].sort();
  let seat = 0;
  const labels = [...map.labels];
  for (const link of HOME_LINKS) {
    if (placed.has(link.id)) {
      continue;
    }
    const key = homeCells[seat] ?? homeCells[0];
    seat += 1;
    if (!key) {
      continue;
    }
    labels.push({
      id: link.id,
      label: link.label,
      at: parseCellKey(key),
      color: "#fbbf24",
    });
  }
  return labels;
}

/** LAND ON A MENU ISLAND. THE HOME ISLAND ITSELF IS NOT A DESTINATION. */
export function homeDestinationAt(
  map: HomeMapMeta,
  row: number,
  col: number,
): HomeDestination | null {
  const key = cellKey(row, col);
  for (const link of HOME_LINKS) {
    if (map.islands[link.id].has(key)) {
      return link.id;
    }
  }
  return null;
}

function distanceToSegment(
  point: CellCoord,
  from: CellCoord,
  to: CellCoord,
): { distance: number; along: number } {
  const rowSpan = to.row - from.row;
  const colSpan = to.col - from.col;
  const length = rowSpan * rowSpan + colSpan * colSpan;
  const along =
    length === 0
      ? 0
      : ((point.row - from.row) * rowSpan + (point.col - from.col) * colSpan) / length;
  const clamped = Math.max(0, Math.min(1, along));
  const row = from.row + rowSpan * clamped;
  const col = from.col + colSpan * clamped;
  return {
    distance: Math.hypot(point.row - row, point.col - col),
    along,
  };
}

/** WHICH MENU PATH THIS CLICK SITS ON. NEAREST ISLAND IN FRONT OF THE BOAR. */
function pathOwner(map: HomeMapMeta, cell: CellCoord): HomeDestination | null {
  let best: { id: HomeDestination; distance: number; line: number } | null = null;
  for (const link of HOME_LINKS) {
    const anchor = map.anchors[link.id];
    if (!anchor || map.islands[link.id].size === 0) {
      continue;
    }
    const { distance: line, along } = distanceToSegment(cell, map.homeOrigin, anchor);
    if (along <= 0) {
      continue;
    }
    const distance = Math.hypot(cell.row - anchor.row, cell.col - anchor.col);
    const closer = !best || distance < best.distance - 1e-6;
    const tie = best && Math.abs(distance - best.distance) <= 1e-6 && line < best.line;
    if (closer || tie) {
      best = { id: link.id, distance, line };
    }
  }
  return best?.id ?? null;
}

/** CLICKS ON THE WAY FROM HOME TO THIS ISLAND. */
export function homePathClicks(map: HomeMapMeta, destination: HomeDestination): CellCoord[] {
  const clicks = map.level.clicks ?? [];
  return clicks.filter((cell) => pathOwner(map, cell) === destination);
}

/** THE FIRST MENU ISLAND THE BOAR CAN WALK TO, IN HOME_LINKS ORDER. */
export function resolveHomeDestination(
  map: HomeMapMeta,
  bridges: Set<string>,
): HomeDestination | null {
  const reachable = floodReachable(map.level, bridges, map.homeOrigin);
  for (const link of HOME_LINKS) {
    for (const key of reachable) {
      if (map.islands[link.id].has(key)) {
        return link.id;
      }
    }
  }
  return null;
}

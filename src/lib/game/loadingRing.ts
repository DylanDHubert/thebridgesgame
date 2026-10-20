import { cellKey } from "@/lib/game/coords";
import { floodLandComponent } from "@/lib/game/homeMap";
import type { Level } from "@/lib/game/level/types";
import type { CellCoord } from "@/lib/game/types";
import { boarTravelMs } from "@/lib/rendering/boar";

export const LOADING_LEVEL_ID = "loading";

/** HOW MANY TIMES HE CAN CIRCLE BEFORE A STUCK LOAD GIVES UP. */
const RUN_LAPS = 16;

const CLOCKWISE = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: -1, dc: 0 },
] as const;

export type LoadingLabel = {
  id: "boar";
  label: string;
  at: CellCoord;
  color: string;
};

function sameCell(a: CellCoord, b: CellCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

function boundaryOf(land: Set<string>): Set<string> {
  const edge = new Set<string>();
  for (const key of land) {
    const [row, col] = key.split(",").map(Number) as [number, number];
    const exposed = CLOCKWISE.some(
      ({ dr, dc }) => !land.has(cellKey(row + dr, col + dc)),
    );
    if (exposed) {
      edge.add(key);
    }
  }
  return edge;
}

function nearestEdge(start: CellCoord, edge: Set<string>): CellCoord {
  let best = start;
  let bestDistance = Infinity;
  for (const key of edge) {
    const [row, col] = key.split(",").map(Number) as [number, number];
    const distance = Math.abs(row - start.row) + Math.abs(col - start.col);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { row, col };
    }
  }
  return best;
}

/** LAND STEPS FROM THE BOAR TO THE CELL THE LOOP STARTS ON. */
function approach(start: CellCoord, goal: CellCoord, land: Set<string>): CellCoord[] {
  if (sameCell(start, goal)) {
    return [start];
  }
  const queue: CellCoord[] = [start];
  const previous = new Map<string, string | null>([[cellKey(start.row, start.col), null]]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (sameCell(current, goal)) {
      break;
    }
    for (const { dr, dc } of CLOCKWISE) {
      const next = { row: current.row + dr, col: current.col + dc };
      const key = cellKey(next.row, next.col);
      if (!land.has(key) || previous.has(key)) {
        continue;
      }
      previous.set(key, cellKey(current.row, current.col));
      queue.push(next);
    }
  }
  const steps: CellCoord[] = [];
  let cursor: string | null = cellKey(goal.row, goal.col);
  if (!previous.has(cursor)) {
    return [start];
  }
  while (cursor) {
    const [row, col] = cursor.split(",").map(Number) as [number, number];
    steps.push({ row, col });
    cursor = previous.get(cursor) ?? null;
  }
  steps.reverse();
  return steps;
}

/**
 * ONE LAP AROUND THE EDGE OF THE BOAR'S ISLAND.
 * OUTSIDE WATER STAYS ON HIS LEFT. A SOLID BLOCK IS CIRCLED, NOT CROSSED.
 */
export function loadingLoop(level: Level): CellCoord[] {
  const start = level.start ?? level.mission.x;
  const land = floodLandComponent(level, start);
  if (land.size === 0) {
    return [start];
  }
  const edge = boundaryOf(land);
  const origin = edge.has(cellKey(start.row, start.col))
    ? start
    : nearestEdge(start, edge);
  const loop = traceShore(origin, land);
  if (sameCell(start, origin)) {
    return loop;
  }
  const walk = approach(start, origin, land);
  return [...walk.slice(0, -1), ...loop];
}

/**
 * ONE CIRCUIT WITH THE OUTSIDE WATER ON HIS LEFT.
 * A CORNER WHOSE LAND NEIGHBORS ARE INLAND CAN STILL STEP OUT.
 */
function traceShore(origin: CellCoord, land: Set<string>): CellCoord[] {
  const onLand = (row: number, col: number) => land.has(cellKey(row, col));
  const facing = CLOCKWISE.findIndex((_, index) => {
    const left = CLOCKWISE[(index + 3) % 4]!;
    return !onLand(origin.row + left.dr, origin.col + left.dc);
  });
  if (facing < 0) {
    return [origin];
  }
  const path: CellCoord[] = [origin];
  let dir = facing;
  let row = origin.row;
  let col = origin.col;
  const guard = land.size * 4 + 2;
  for (let step = 0; step < guard; step += 1) {
    const order = [(dir + 3) % 4, dir, (dir + 1) % 4, (dir + 2) % 4];
    let stepped = false;
    for (const next of order) {
      const turn = CLOCKWISE[next]!;
      const nr = row + turn.dr;
      const nc = col + turn.dc;
      if (!onLand(nr, nc)) {
        continue;
      }
      dir = next;
      row = nr;
      col = nc;
      path.push({ row, col });
      stepped = true;
      break;
    }
    if (!stepped || (row === origin.row && col === origin.col)) {
      break;
    }
  }
  return path;
}

/** HOW LONG ONE CIRCUIT TAKES. THE LOADER WILL NOT PASS BEFORE THIS. */
export function loadingLapMs(level: Level): number {
  return boarTravelMs(loadingLoop(level));
}

/** THE LAP, REPEATED, SO HE KEEPS RUNNING UNTIL THE PAGE IS READY. */
export function loadingRunPath(level: Level): CellCoord[] {
  const loop = loadingLoop(level);
  if (loop.length < 2) {
    return loop;
  }
  const closed = sameCell(loop[0]!, loop[loop.length - 1]!);
  const cycle = closed ? loop.slice(0, -1) : loop;
  const path: CellCoord[] = [];
  for (let lap = 0; lap < RUN_LAPS; lap += 1) {
    path.push(...cycle);
  }
  path.push(cycle[0]!);
  return path;
}

/** DRAG TARGET — THE BOAR ONLY. THE LAP IS THE EDGE OF HIS ISLAND. */
export function loadingLabels(level: Level): LoadingLabel[] {
  return [
    {
      id: "boar",
      label: "BOAR",
      at: level.start ?? level.mission.x,
      color: "#fbbf24",
    },
  ];
}

import { DIRECTIONS } from "@/lib/game/constants";
import { cellKey } from "@/lib/game/coords";
import type { Level } from "@/lib/game/level/types";
import {
  bridgeCostAt,
  canPlaceBridgeAt,
  isLandKind,
  isPlayableCell,
  terrainKindAt,
} from "@/lib/game/rules";
import type { CellCoord } from "@/lib/game/types";

const cache = new Map<string, number | null>();

type HeapItem = { cost: number; row: number; col: number };

function heapPush(heap: HeapItem[], item: HeapItem) {
  heap.push(item);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = (index - 1) >> 1;
    if (heap[parent]!.cost <= heap[index]!.cost) {
      break;
    }
    const swap = heap[parent]!;
    heap[parent] = heap[index]!;
    heap[index] = swap;
    index = parent;
  }
}

function heapPop(heap: HeapItem[]): HeapItem | undefined {
  const top = heap[0];
  const last = heap.pop();
  if (!top || !last || heap.length === 0) {
    return top;
  }
  heap[0] = last;
  let index = 0;
  for (;;) {
    const left = index * 2 + 1;
    const right = left + 1;
    let smallest = index;
    if (left < heap.length && heap[left]!.cost < heap[smallest]!.cost) {
      smallest = left;
    }
    if (right < heap.length && heap[right]!.cost < heap[smallest]!.cost) {
      smallest = right;
    }
    if (smallest === index) {
      break;
    }
    const swap = heap[smallest]!;
    heap[smallest] = heap[index]!;
    heap[index] = swap;
    index = smallest;
  }
  return top;
}

function canStep(
  level: Level,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
): boolean {
  if (!isPlayableCell(level, toRow, toCol)) {
    return false;
  }
  const fromKind = terrainKindAt(level, fromRow, fromCol);
  const toKind = terrainKindAt(level, toRow, toCol);
  if (!fromKind || !toKind) {
    return false;
  }
  const fromLand = isLandKind(fromKind);
  const toLand = isLandKind(toKind);
  if (!fromLand && !canPlaceBridgeAt(level, fromRow, fromCol)) {
    return false;
  }
  if (!toLand && !canPlaceBridgeAt(level, toRow, toCol)) {
    return false;
  }
  if (fromKind === "cliff" && !toLand) {
    return false;
  }
  if (toKind === "cliff" && !fromLand) {
    return false;
  }
  return true;
}

/** DISTANCE FROM A SET OF LAND CELLS. WATER COSTS ITS BRIDGE. LAND IS FREE. */
function distancesFrom(level: Level, sources: CellCoord[]): Map<string, number> {
  const dist = new Map<string, number>();
  const heap: HeapItem[] = [];
  for (const source of sources) {
    const key = cellKey(source.row, source.col);
    dist.set(key, 0);
    heapPush(heap, { cost: 0, row: source.row, col: source.col });
  }
  while (heap.length > 0) {
    const current = heapPop(heap);
    if (!current) {
      break;
    }
    const key = cellKey(current.row, current.col);
    if (current.cost !== dist.get(key)) {
      continue;
    }
    for (const { dr, dc } of DIRECTIONS) {
      const row = current.row + dr;
      const col = current.col + dc;
      if (!canStep(level, current.row, current.col, row, col)) {
        continue;
      }
      const kind = terrainKindAt(level, row, col);
      const step = kind && !isLandKind(kind) ? bridgeCostAt(level, row, col) : 0;
      const next = current.cost + step;
      const nextKey = cellKey(row, col);
      const prior = dist.get(nextKey);
      if (prior != null && prior <= next) {
        continue;
      }
      dist.set(nextKey, next);
      heapPush(heap, { cost: next, row, col });
    }
  }
  return dist;
}

function landComponents(level: Level): CellCoord[][] {
  const seen = new Set<string>();
  const groups: CellCoord[][] = [];
  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      const key = cellKey(row, col);
      if (seen.has(key) || !isPlayableCell(level, row, col)) {
        continue;
      }
      const kind = terrainKindAt(level, row, col);
      if (!kind || !isLandKind(kind)) {
        continue;
      }
      const cells: CellCoord[] = [];
      const queue: CellCoord[] = [{ row, col }];
      seen.add(key);
      while (queue.length > 0) {
        const current = queue.shift()!;
        cells.push(current);
        for (const { dr, dc } of DIRECTIONS) {
          const nextRow = current.row + dr;
          const nextCol = current.col + dc;
          const nextKey = cellKey(nextRow, nextCol);
          if (seen.has(nextKey) || !isPlayableCell(level, nextRow, nextCol)) {
            continue;
          }
          const nextKind = terrainKindAt(level, nextRow, nextCol);
          if (!nextKind || !isLandKind(nextKind)) {
            continue;
          }
          seen.add(nextKey);
          queue.push({ row: nextRow, col: nextCol });
        }
      }
      groups.push(cells);
    }
  }
  return groups;
}

function componentIndex(groups: CellCoord[][], cell: CellCoord): number {
  const key = cellKey(cell.row, cell.col);
  return groups.findIndex((group) =>
    group.some((entry) => cellKey(entry.row, entry.col) === key),
  );
}

/**
 * CHEAPEST BRIDGES THAT JOIN THE BOAR TO ALL THREE FLOWERS.
 * ISLAND TO ISLAND. A CORRIDOR SHARED BY TWO LEGS CAN BE COUNTED TWICE.
 */
export function perfectBridgeCost(level: Level): number | null {
  const cacheKey = `${level.id}:${level.seed}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const origin = level.start;
  if (!origin) {
    cache.set(cacheKey, null);
    return null;
  }
  const groups = landComponents(level);
  const terminals = [origin, level.mission.x, level.mission.y, level.mission.z]
    .map((cell) => componentIndex(groups, cell))
    .filter((index, place, all) => index >= 0 && all.indexOf(index) === place);
  if (terminals.length === 0) {
    cache.set(cacheKey, null);
    return null;
  }
  if (terminals.length === 1) {
    cache.set(cacheKey, 0);
    return 0;
  }

  const count = groups.length;
  const dist = Array.from({ length: count }, () => Array<number>(count).fill(Infinity));
  for (let from = 0; from < count; from += 1) {
    const reached = distancesFrom(level, groups[from]!);
    dist[from]![from] = 0;
    for (let to = 0; to < count; to += 1) {
      if (from === to) {
        continue;
      }
      let best = Infinity;
      for (const cell of groups[to]!) {
        const value = reached.get(cellKey(cell.row, cell.col));
        if (value != null && value < best) {
          best = value;
        }
      }
      dist[from]![to] = best;
    }
  }

  const width = 1 << terminals.length;
  const full = width - 1;
  const dp = Array.from({ length: width }, () => Array<number>(count).fill(Infinity));
  for (let index = 0; index < terminals.length; index += 1) {
    const bit = 1 << index;
    const source = terminals[index]!;
    for (let node = 0; node < count; node += 1) {
      dp[bit]![node] = dist[source]![node]!;
    }
    dp[bit]![source] = 0;
  }

  for (let mask = 1; mask <= full; mask += 1) {
    for (let node = 0; node < count; node += 1) {
      for (let sub = mask; sub > 0; sub = (sub - 1) & mask) {
        const rest = mask ^ sub;
        if (rest === 0) {
          continue;
        }
        const joined = dp[sub]![node]! + dp[rest]![node]!;
        if (joined < dp[mask]![node]!) {
          dp[mask]![node] = joined;
        }
      }
    }
    const next = dp[mask]!.slice();
    for (let node = 0; node < count; node += 1) {
      for (let other = 0; other < count; other += 1) {
        const via = dp[mask]![other]! + dist[other]![node]!;
        if (via < next[node]!) {
          next[node] = via;
        }
      }
    }
    dp[mask] = next;
  }

  let best = Infinity;
  for (let node = 0; node < count; node += 1) {
    best = Math.min(best, dp[full]![node]!);
  }
  const score = Number.isFinite(best) ? best : null;
  cache.set(cacheKey, score);
  console.log("[journeyman:play] perfect score", { levelId: level.id, score });
  return score;
}

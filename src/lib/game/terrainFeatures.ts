import { createNoise2D } from "simplex-noise";

import { DIRECTIONS } from "./constants";
import { indexFor, inBounds } from "./coords";
import { hashStringToSeed, mulberry32 } from "./seed";
import type { CellCoord, TileKind } from "./types";

/** INTERNAL GEN GRID — WHIRLPOOL EXISTS HERE UNTIL gridToLevel CONVERTS TO OBJECTS */
export type GenTileKind = TileKind | "whirlpool";

type BaseGrid = GenTileKind[][];

type FeatureContext = {
  rows: number;
  cols: number;
  rng: () => number;
  seed: string;
};

function isLandKind(kind: GenTileKind): boolean {
  return kind === "grass" || kind === "cliff";
}

function isWaterKind(kind: GenTileKind): boolean {
  return kind === "ocean" || kind === "marsh" || kind === "whirlpool";
}

export type TerrainFeatureToggles = {
  cliffs?: boolean;
  marsh?: boolean;
  whirlpools?: boolean;
};

const DEFAULT_TERRAIN_FEATURES: Required<TerrainFeatureToggles> = {
  cliffs: true,
  marsh: true,
  whirlpools: false,
};

function resolveTerrainFeatures(
  features: TerrainFeatureToggles = {},
): Required<TerrainFeatureToggles> {
  return { ...DEFAULT_TERRAIN_FEATURES, ...features };
}

/** CLIFFS ON SOME LAND EDGES. EVERY OTHER LAND CELL STAYS GRASS. */
export function applyLandKinds(
  grid: BaseGrid,
  rng: () => number,
  cliffs = true,
): void {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const kind = grid[row]![col]!;
      if (kind !== "grass") {
        continue;
      }

      let touchesWater = false;
      for (const { dr, dc } of DIRECTIONS) {
        const nr = row + dr;
        const nc = col + dc;
        if (!inBounds(nr, nc, rows, cols)) {
          continue;
        }
        const neighbor = grid[nr]![nc]!;
        if (neighbor === "ocean" || isWaterKind(neighbor)) {
          touchesWater = true;
          break;
        }
      }

      if (!touchesWater) {
        continue;
      }

      if (cliffs && rng() < 0.35) {
        grid[row]![col] = "cliff";
      }
    }
  }
}

/** SHALLOW COAST — BRIDGE COSTS 2 */
export function applyMarsh(grid: BaseGrid, rng: () => number): void {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const shallow: CellCoord[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (grid[row]![col] !== "ocean") {
        continue;
      }

      for (const { dr, dc } of DIRECTIONS) {
        const nr = row + dr;
        const nc = col + dc;
        if (!inBounds(nr, nc, rows, cols)) {
          continue;
        }
        const neighbor = grid[nr]![nc]!;
        if (neighbor === "grass") {
          shallow.push({ row, col });
          break;
        }
      }
    }
  }

  for (const { row, col } of shallow) {
    if (rng() < 0.42) {
      grid[row]![col] = "marsh";
    }
  }
}

function whirlpoolTouchesLand(grid: BaseGrid, row: number, col: number): boolean {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  for (const { dr, dc } of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inBounds(nr, nc, rows, cols)) {
      continue;
    }
    if (isLandKind(grid[nr]![nc]!)) {
      return true;
    }
  }

  return false;
}

/** DEEP WATER OBSTACLES — MULTI-TILE BLOBS */
export function applyWhirlpools(grid: BaseGrid, context: FeatureContext): void {
  const { rows, cols, rng, seed } = context;
  const noise2D = createNoise2D(mulberry32(hashStringToSeed(`${seed}-whirlpool`)));
  const blobCount = 3 + Math.floor(rng() * 4);
  const seeds: CellCoord[] = [];

  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < cols - 1; col += 1) {
      if (grid[row]![col] !== "ocean") {
        continue;
      }
      if (whirlpoolTouchesLand(grid, row, col)) {
        continue;
      }

      const n = noise2D(col * 0.21, row * 0.21);
      if (n > 0.58) {
        seeds.push({ row, col });
      }
    }
  }

  seeds.sort(() => rng() - 0.5);

  for (const origin of seeds.slice(0, blobCount)) {
    const targetSize = 2 + Math.floor(rng() * 4);
    const queue: CellCoord[] = [origin];
    const blob = new Set<string>([`${origin.row},${origin.col}`]);

    while (queue.length > 0 && blob.size < targetSize) {
      const current = queue.shift()!;
      grid[current.row]![current.col] = "whirlpool";

      for (const { dr, dc } of DIRECTIONS) {
        const nr = current.row + dr;
        const nc = current.col + dc;
        const key = `${nr},${nc}`;

        if (!inBounds(nr, nc, rows, cols) || blob.has(key)) {
          continue;
        }
        if (grid[nr]![nc] !== "ocean") {
          continue;
        }
        if (whirlpoolTouchesLand(grid, nr, nc)) {
          continue;
        }

        if (rng() > 0.55) {
          continue;
        }

        blob.add(key);
        queue.push({ row: nr, col: nc });
      }
    }
  }
}

export function buildTileGridFromNoise(
  rawGrid: Array<Array<"land" | "water">>,
  seed: string,
  rng: () => number,
  features: TerrainFeatureToggles = {},
): BaseGrid {
  const toggles = resolveTerrainFeatures(features);
  const rows = rawGrid.length;
  const cols = rawGrid[0]?.length ?? 0;
  const grid: BaseGrid = rawGrid.map((line) =>
    line.map((terrain) => (terrain === "land" ? "grass" : "ocean")),
  );

  applyLandKinds(grid, rng, toggles.cliffs);
  if (toggles.marsh) {
    applyMarsh(grid, rng);
  }
  if (toggles.whirlpools) {
    applyWhirlpools(grid, { rows, cols, rng, seed });
  }

  return grid;
}

export function labelLandComponents(
  grid: BaseGrid,
  rows: number,
  cols: number,
): number[][] {
  const labels = Array.from({ length: rows }, () =>
    Array<number>(cols).fill(-1),
  );
  let componentId = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!isLandKind(grid[row]![col]!) || labels[row]![col] !== -1) {
        continue;
      }

      const queue: CellCoord[] = [{ row, col }];
      labels[row]![col] = componentId;

      while (queue.length > 0) {
        const current = queue.pop()!;
        for (const { dr, dc } of DIRECTIONS) {
          const nr = current.row + dr;
          const nc = current.col + dc;

          if (!inBounds(nr, nc, rows, cols)) {
            continue;
          }
          if (!isLandKind(grid[nr]![nc]!) || labels[nr]![nc] !== -1) {
            continue;
          }

          labels[nr]![nc] = componentId;
          queue.push({ row: nr, col: nc });
        }
      }

      componentId += 1;
    }
  }

  return labels;
}

export function isInteriorGrass(
  grid: BaseGrid,
  row: number,
  col: number,
  rows: number,
  cols: number,
): boolean {
  if (grid[row]![col] !== "grass") {
    return false;
  }

  for (const { dr, dc } of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inBounds(nr, nc, rows, cols)) {
      continue;
    }
    const neighbor = grid[nr]![nc]!;
    if (isWaterKind(neighbor)) {
      return false;
    }
  }

  return true;
}

import { pickMissionEndpoints } from "../endpoints";
import { isoBoardFromContent, isoCellRole, isoLatticeCells, type IsoSpan } from "../isoBoard";
import { buildRawTerrainGrid } from "../terrainNoise";
import type { CreateGenerationConfig } from "../createConfig";
import { normalizeCreateConfig } from "../createConfig";
import { hashStringToSeed, mulberry32 } from "../seed";
import {
  buildTileGridFromNoise,
  labelLandComponents,
} from "../terrainFeatures";
import type { CellCoord } from "../types";
import {
  buildLevel,
  missionFromEndpoints,
  tileGridToLevelParts,
} from "./gridToLevel";
import type { Level } from "./types";

type GenerateLevelOptions = {
  seed: string;
  config?: CreateGenerationConfig;
};

function distinctCoords(
  coords: CellCoord[],
  rng: () => number,
  count: number,
): CellCoord[] {
  const picked: CellCoord[] = [];
  const used = new Set<string>();

  for (let attempt = 0; attempt < coords.length * 4 && picked.length < count; attempt += 1) {
    const coord = coords[Math.floor(rng() * coords.length)]!;
    const key = `${coord.row},${coord.col}`;
    if (used.has(key)) {
      continue;
    }
    used.add(key);
    picked.push(coord);
  }

  return picked;
}

function fallbackMission(
  labels: number[][],
  rows: number,
  cols: number,
  span: IsoSpan,
  rng: () => number,
) {
  const landCells: CellCoord[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (labels[row]![col]! >= 0) {
        landCells.push({ row, col });
      }
    }
  }

  if (landCells.length >= 3) {
    const [x, y, z] = distinctCoords(landCells, rng, 3);
    if (x && y && z) {
      return missionFromEndpoints(x, y, z);
    }
  }

  const playable = isoLatticeCells(span).filter((cell) => cell.role === "play");
  const first = playable[0] ?? { row: 0, col: 0 };
  const mid = playable[Math.floor(playable.length / 2)] ?? first;
  const last = playable[playable.length - 1] ?? first;
  return missionFromEndpoints(first, mid, last);
}

/**
 * CREATE ENTRY — NOISE FILLS THE ISO INTERIOR.
 * THE OUTER TWO LAYERS STAY OCEAN AND ARE NOT PART OF THE PUZZLE.
 */
export function generateLevel(options: GenerateLevelOptions): Level {
  const config = normalizeCreateConfig(options.config);
  const seed = options.seed;
  const rng = mulberry32(hashStringToSeed(seed));
  const board = isoBoardFromContent(config.grid.rows, config.grid.cols);

  const rawGrid = buildRawTerrainGrid(
    { grid: { rows: board.rows, cols: board.cols }, noise: config.noise },
    seed,
  );
  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      if (isoCellRole(row, col, board.span) !== "play") {
        rawGrid[row]![col] = "water";
      }
    }
  }

  const tileGrid = buildTileGridFromNoise(rawGrid, seed, rng);
  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      if (isoCellRole(row, col, board.span) !== "play") {
        tileGrid[row]![col] = "ocean";
      }
    }
  }

  const labels = labelLandComponents(tileGrid, board.rows, board.cols);
  const mission =
    pickMissionEndpoints(tileGrid, labels, board.rows, board.cols, rng) ??
    fallbackMission(labels, board.rows, board.cols, board.span, rng);

  const { terrain, objects } = tileGridToLevelParts(tileGrid, board.rows, board.cols);

  return buildLevel(
    seed,
    board.rows,
    board.cols,
    terrain,
    objects,
    mission,
    board.span,
  );
}

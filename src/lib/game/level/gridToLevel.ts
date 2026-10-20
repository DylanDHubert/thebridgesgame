import type { IsoSpan } from "../isoBoard";
import type { GenTileKind } from "../terrainFeatures";
import type { CellCoord, Mission, TileKind } from "../types";
import type { Level, LevelObject } from "./types";

type TileGrid = GenTileKind[][];

function levelIdFromSeed(seed: string): string {
  const safe = seed.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return safe.replace(/^-+|-+$/g, "") || "level";
}

/** TITLE CASE SO "AMBER CAY" STAYS A NAME AND "amber-cay" DOES NOT */
function displayNameFromSeed(seed: string): string {
  const words = seed
    .trim()
    .split(/[\s_-]+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) {
    return "Island";
  }
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** FLATTEN TILE GRID. WHIRLPOOL CELLS BECOME PLAIN OCEAN. */
export function tileGridToLevelParts(
  grid: TileGrid,
  rows: number,
  cols: number,
): { terrain: TileKind[]; objects: LevelObject[] } {
  const terrain: TileKind[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const kind = grid[row]![col]!;
      terrain.push(kind === "whirlpool" ? "ocean" : (kind as TileKind));
    }
  }

  return { terrain, objects: [] };
}

export function buildLevel(
  seed: string,
  rows: number,
  cols: number,
  terrain: TileKind[],
  objects: LevelObject[],
  mission: Mission,
  iso: IsoSpan,
  name?: string,
  start?: CellCoord,
): Level {
  const id = levelIdFromSeed(seed);
  return {
    id,
    name: name ?? displayNameFromSeed(seed),
    seed,
    rows,
    cols,
    terrain,
    objects,
    routes: [],
    mission,
    ...(start ? { start } : {}),
    iso,
  };
}

export function missionFromEndpoints(
  start: CellCoord,
  waypoint: CellCoord,
  goal: CellCoord,
): Mission {
  return { x: start, y: waypoint, z: goal };
}

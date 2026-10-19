import type { IsoSpan } from "../isoBoard";
import type { GenTileKind } from "../terrainFeatures";
import type { CellCoord, Mission, TileKind } from "../types";
import type { Level, LevelObject } from "./types";

type TileGrid = GenTileKind[][];

function levelIdFromSeed(seed: string): string {
  const safe = seed.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return safe.replace(/^-+|-+$/g, "") || "level";
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
): Level {
  const id = levelIdFromSeed(seed);
  return {
    id,
    name: name ?? id,
    seed,
    rows,
    cols,
    terrain,
    objects,
    routes: [],
    mission,
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

import type { IsoSpan } from "@/lib/game/isoBoard";
import type { Level } from "@/lib/game/level/types";
import type { TileKind } from "@/lib/game/types";

/** MINIMAL INPUT FOR TERRAIN RENDERING — DECOUPLED FROM PLAY STATE */
export type TerrainView = {
  seed: string;
  rows: number;
  cols: number;
  terrain: readonly TileKind[];
  iso: IsoSpan;
};

export function terrainViewFromLevel(level: Level): TerrainView {
  return {
    seed: level.seed,
    rows: level.rows,
    cols: level.cols,
    terrain: level.terrain,
    iso: level.iso,
  };
}

export function terrainKindAt(
  view: TerrainView,
  row: number,
  col: number,
): TileKind | undefined {
  if (row < 0 || col < 0 || row >= view.rows || col >= view.cols) {
    return undefined;
  }
  return view.terrain[row * view.cols + col];
}

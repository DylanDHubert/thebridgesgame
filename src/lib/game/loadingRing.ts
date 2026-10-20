import { isoBoardFromContent, isoCellRole } from "@/lib/game/isoBoard";
import type { Level } from "@/lib/game/level/types";
import type { CellCoord, TileKind } from "@/lib/game/types";
import { boarTravelMs } from "@/lib/rendering/boar";

/** GRASS TRACK. HE RUNS THE BORDER ONCE, THEN THE PAGE OPENS. */
const TRACK_ROW_0 = 7;
const TRACK_ROW_1 = 13;
const TRACK_COL_0 = 7;
const TRACK_COL_1 = 13;

function onTrack(row: number, col: number): boolean {
  const onRow = row === TRACK_ROW_0 || row === TRACK_ROW_1;
  const onCol = col === TRACK_COL_0 || col === TRACK_COL_1;
  const inRows = row >= TRACK_ROW_0 && row <= TRACK_ROW_1;
  const inCols = col >= TRACK_COL_0 && col <= TRACK_COL_1;
  return (onRow && inCols) || (onCol && inRows);
}

function ringPath(): CellCoord[] {
  const path: CellCoord[] = [];
  for (let col = TRACK_COL_0; col <= TRACK_COL_1; col += 1) {
    path.push({ row: TRACK_ROW_0, col });
  }
  for (let row = TRACK_ROW_0 + 1; row <= TRACK_ROW_1; row += 1) {
    path.push({ row, col: TRACK_COL_1 });
  }
  for (let col = TRACK_COL_1 - 1; col >= TRACK_COL_0; col -= 1) {
    path.push({ row: TRACK_ROW_1, col });
  }
  for (let row = TRACK_ROW_1 - 1; row >= TRACK_ROW_0; row -= 1) {
    path.push({ row, col: TRACK_COL_0 });
  }
  return path;
}

function buildRing(): { level: Level; path: CellCoord[] } {
  const board = isoBoardFromContent(11, 11);
  const terrain: TileKind[] = [];
  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      if (isoCellRole(row, col, board.span) !== "play") {
        terrain.push("ocean");
        continue;
      }
      if (onTrack(row, col)) {
        terrain.push("grass");
        continue;
      }
      const inside =
        row > TRACK_ROW_0 &&
        row < TRACK_ROW_1 &&
        col > TRACK_COL_0 &&
        col < TRACK_COL_1;
      if (!inside) {
        terrain.push("ocean");
        continue;
      }
      const moat =
        row === TRACK_ROW_0 + 1 ||
        row === TRACK_ROW_1 - 1 ||
        col === TRACK_COL_0 + 1 ||
        col === TRACK_COL_1 - 1;
      terrain.push(moat ? "marsh" : "grass");
    }
  }
  const start = { row: TRACK_ROW_0, col: TRACK_COL_0 };
  const level: Level = {
    id: "loading",
    name: "One lap",
    seed: "loading-ring",
    rows: board.rows,
    cols: board.cols,
    terrain,
    objects: [],
    routes: [],
    mission: { x: start, y: start, z: start },
    start,
    iso: board.span,
  };
  return { level, path: ringPath() };
}

const RING = buildRing();

/** IN MEMORY ONLY. NOT A SAVED LEVEL. */
export const LOADING_LEVEL = RING.level;
export const LOADING_PATH = RING.path;
/** ONE FULL LAP. THE PAGE WAITS FOR ALL OF IT. */
export const LOADING_LAP_MS = boarTravelMs(LOADING_PATH);

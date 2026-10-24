import { DIRECTIONS } from "../constants";
import { cellKey, indexFor } from "../coords";
import { floodLandComponent } from "../homeMap";
import { isLandKind, isPlayableCell, terrainKindAt } from "../rules";
import type { CellCoord } from "../types";
import type { Level } from "./types";

function manhattan(a: CellCoord, b: CellCoord): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/** A BRIDGE CAN LAND HERE. PADDING WATER DOES NOT COUNT. */
function grassLanding(level: Level, row: number, col: number): boolean {
  if (!isPlayableCell(level, row, col) || terrainKindAt(level, row, col) !== "grass") {
    return false;
  }
  for (const { dr, dc } of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (!isPlayableCell(level, nr, nc)) {
      continue;
    }
    const kind = terrainKindAt(level, nr, nc);
    if (kind === "ocean" || kind === "marsh") {
      return true;
    }
  }
  return false;
}

/**
 * EACH ISLAND THE BOAR MUST ENTER OR LEAVE KEEPS ONE GRASS SHORE CELL.
 * THE CELL FACES THE OTHER REQUIRED ISLANDS. THE REST OF THE RIM CAN STAY STONE.
 */
export function openRequiredLandings(level: Level): CellCoord[] {
  const targets: CellCoord[] = [
    ...(level.start ? [level.start] : []),
    level.mission.x,
    level.mission.y,
    level.mission.z,
  ];
  const opened: CellCoord[] = [];
  const seen = new Set<string>();

  for (const target of targets) {
    const kind = terrainKindAt(level, target.row, target.col);
    if (!kind || !isLandKind(kind)) {
      continue;
    }
    const island = floodLandComponent(level, target);
    const stamp = [...island].sort()[0];
    if (!stamp || seen.has(stamp)) {
      continue;
    }
    seen.add(stamp);

    const cliffShores: CellCoord[] = [];
    let open = false;
    for (const key of island) {
      const [row, col] = key.split(",").map(Number) as [number, number];
      if (grassLanding(level, row, col)) {
        open = true;
        break;
      }
      if (
        isPlayableCell(level, row, col) &&
        terrainKindAt(level, row, col) === "cliff" &&
        shoreWater(level, row, col)
      ) {
        cliffShores.push({ row, col });
      }
    }
    if (open || cliffShores.length === 0) {
      if (!open && cliffShores.length === 0) {
        console.log("[journeyman:landings] sealed island has no shore", {
          levelId: level.id,
          row: target.row,
          col: target.col,
        });
      }
      continue;
    }

    const others = targets.filter((cell) => !island.has(cellKey(cell.row, cell.col)));
    const nearest = (cell: CellCoord) =>
      others.length === 0
        ? 0
        : Math.min(...others.map((other) => manhattan(cell, other)));
    cliffShores.sort((a, b) => nearest(a) - nearest(b) || a.row - b.row || a.col - b.col);
    const pick = cliffShores[0]!;
    level.terrain[indexFor(pick.row, pick.col, level.cols)] = "grass";
    opened.push(pick);
    console.log("[journeyman:landings] opened shore", {
      levelId: level.id,
      row: pick.row,
      col: pick.col,
    });
  }

  return opened;
}

function shoreWater(level: Level, row: number, col: number): boolean {
  for (const { dr, dc } of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (!isPlayableCell(level, nr, nc)) {
      continue;
    }
    const kind = terrainKindAt(level, nr, nc);
    if (kind === "ocean" || kind === "marsh") {
      return true;
    }
  }
  return false;
}

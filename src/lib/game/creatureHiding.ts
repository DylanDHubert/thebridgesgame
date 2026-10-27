import { DIRECTIONS } from "@/lib/game/constants";
import { cellKey } from "@/lib/game/coords";
import { CREATURES, type Creature } from "@/lib/game/creatures";
import { HOME_LEVEL_ID } from "@/lib/game/homeMap";
import { isPlayableCell, terrainKindAt } from "@/lib/game/rules";
import { hashStringToSeed } from "@/lib/game/seed";
import type { Level } from "@/lib/game/level/types";
import { grassKeysOnStartIsland } from "@/lib/rendering/terrainView";

/** ONE HIDING IN THIS MANY BOARDS. THE SAME SEED ALWAYS AGREES. */
const BOARDS_PER_HIDING = 8;

/** SHOWING EVERY PLAY BOARD. FLIP OFF TO RESTORE ONE IN EIGHT. */
const SHOW_EVERY_LEVEL = true;

/** NATIVE PIXELS. THE PLANT IS DRAWN AFTER, SO THE BODY STAYS IN THE LEAVES. */
export const CREATURE_BEHIND_LIFT = 6;

export type CreatureHiding = {
  creature: Creature;
  row: number;
  col: number;
};

function touchesWater(level: Level, row: number, col: number): boolean {
  for (const { dr, dc } of DIRECTIONS) {
    const kind = terrainKindAt(level, row + dr, col + dc);
    if (kind === "ocean" || kind === "marsh") {
      return true;
    }
  }
  return false;
}

/** INLAND GRASS THAT DRAWS AS A PLANT, NOT MUD AND NOT THE SHORE. */
function plantCells(level: Level): { row: number; col: number }[] {
  const mud = grassKeysOnStartIsland(level.terrain, level.rows, level.cols, level.start);
  const reserved = new Set<string>([
    cellKey(level.mission.x.row, level.mission.x.col),
    cellKey(level.mission.y.row, level.mission.y.col),
    cellKey(level.mission.z.row, level.mission.z.col),
  ]);
  if (level.start) {
    reserved.add(cellKey(level.start.row, level.start.col));
  }
  const cells: { row: number; col: number }[] = [];
  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      if (!isPlayableCell(level, row, col) || terrainKindAt(level, row, col) !== "grass") {
        continue;
      }
      const key = cellKey(row, col);
      if (mud.has(key) || reserved.has(key) || touchesWater(level, row, col)) {
        continue;
      }
      cells.push({ row, col });
    }
  }
  return cells;
}

/** HOME AND LESSONS NEVER HIDE ONE. PLAY BOARDS DO, EVERY ONE WHILE SHOWING OFF. */
export function creatureHiding(level: Level): CreatureHiding | null {
  if (CREATURES.length === 0 || level.id === HOME_LEVEL_ID || level.id.startsWith("tutorial-")) {
    return null;
  }
  const roll = hashStringToSeed(`${level.seed}:creature-board`);
  if (!SHOW_EVERY_LEVEL && roll % BOARDS_PER_HIDING !== 0) {
    return null;
  }
  const cells = plantCells(level);
  if (cells.length === 0) {
    return null;
  }
  const cell = cells[hashStringToSeed(`${level.seed}:creature-cell`) % cells.length]!;
  const creature = CREATURES[hashStringToSeed(`${level.seed}:creature-id`) % CREATURES.length]!;
  return { creature, row: cell.row, col: cell.col };
}

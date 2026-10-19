import { DIRECTIONS } from "./constants";
import { cellKey, inBounds, indexFor } from "./coords";
import { isoCellRole } from "./isoBoard";
import type { Level, LevelObject } from "./level/types";
import type { CellCoord, TileKind } from "./types";
import { resolveEffects, type Effect, type ResolvedEffects } from "./objects/effects";
import {
  objectDefinition,
  terrainDefinition,
  type ObjectDefinition,
} from "./objects/registry";

const FALLBACK_BRIDGE_COST = 1;

/** INTERIOR OF THE ISO RECTANGLE. THE OUTER TWO LAYERS AND THE ROW/COL CORNERS ARE NOT PLAYABLE. */
export function isPlayableCell(level: Level, row: number, col: number): boolean {
  return isoCellRole(row, col, level.iso) === "play";
}

export function terrainKindAt(
  level: Level,
  row: number,
  col: number,
): TileKind | undefined {
  if (!inBounds(row, col, level.rows, level.cols)) {
    return undefined;
  }
  return level.terrain[indexFor(row, col, level.cols)];
}

export function objectAt(
  level: Level,
  row: number,
  col: number,
): LevelObject | undefined {
  return level.objects.find(
    (object) => object.at.row === row && object.at.col === col,
  );
}

export function isLandKind(kind: TileKind): boolean {
  const def = terrainDefinition(kind);
  return def?.land ?? false;
}

export function effectsAtCell(level: Level, row: number, col: number): Effect[] {
  const effects: Effect[] = [];
  const kind = terrainKindAt(level, row, col);
  if (kind) {
    const terrain = terrainDefinition(kind);
    if (terrain) {
      effects.push(...terrain.effects);
    }
  }
  const object = objectAt(level, row, col);
  if (object) {
    const definition = objectDefinition(object.defId);
    if (definition) {
      effects.push(...definition.effects);
    }
  }
  return effects;
}

export function resolvedAtCell(
  level: Level,
  row: number,
  col: number,
): ResolvedEffects {
  return resolveEffects(effectsAtCell(level, row, col));
}

export function canPlaceBridgeAt(
  level: Level,
  row: number,
  col: number,
): boolean {
  if (!isPlayableCell(level, row, col)) {
    return false;
  }
  const kind = terrainKindAt(level, row, col);
  if (!kind) {
    return false;
  }
  const terrain = terrainDefinition(kind);
  if (!terrain?.bridgeable) {
    return false;
  }
  return !resolvedAtCell(level, row, col).blocksBridge;
}

export function bridgeCostAt(level: Level, row: number, col: number): number {
  return resolvedAtCell(level, row, col).bridgeCost ?? FALLBACK_BRIDGE_COST;
}

export function totalBridgeCost(level: Level, bridges: Set<string>): number {
  let cost = 0;
  for (const key of bridges) {
    const [row, col] = key.split(",").map(Number) as [number, number];
    cost += bridgeCostAt(level, row, col);
  }
  return cost;
}

function isCliffAt(level: Level, row: number, col: number): boolean {
  const kind = terrainKindAt(level, row, col);
  return terrainDefinition(kind!)?.traversalClass === "cliff";
}

export function isWalkableAt(
  level: Level,
  row: number,
  col: number,
  bridges: Set<string>,
): boolean {
  if (!isPlayableCell(level, row, col)) {
    return false;
  }
  const kind = terrainKindAt(level, row, col);
  if (!kind) {
    return false;
  }
  if (isLandKind(kind)) {
    return true;
  }
  return bridges.has(cellKey(row, col));
}

/** CLIFFS CAN SIT BESIDE BRIDGES BUT CANNOT STEP ON/OFF THEM — FROM traversalClass */
export function canTraverseAt(
  level: Level,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  bridges: Set<string>,
): boolean {
  if (!isWalkableAt(level, toRow, toCol, bridges)) {
    return false;
  }
  if (!isWalkableAt(level, fromRow, fromCol, bridges)) {
    return false;
  }
  const fromBridge = bridges.has(cellKey(fromRow, fromCol));
  const toBridge = bridges.has(cellKey(toRow, toCol));
  if ((isCliffAt(level, fromRow, fromCol) && toBridge) ||
      (fromBridge && isCliffAt(level, toRow, toCol))) {
    return false;
  }
  return true;
}

function hasAdjacentTerrain(
  level: Level,
  row: number,
  col: number,
  allowed: TileKind[],
): boolean {
  for (const { dr, dc } of DIRECTIONS) {
    const neighbor = terrainKindAt(level, row + dr, col + dc);
    if (neighbor && allowed.includes(neighbor)) {
      return true;
    }
  }
  return false;
}

export function canPlaceObjectAt(
  level: Level,
  definition: ObjectDefinition,
  row: number,
  col: number,
): boolean {
  if (!isPlayableCell(level, row, col)) {
    return false;
  }
  const kind = terrainKindAt(level, row, col);
  if (!kind) {
    return false;
  }
  if (!definition.placement.allowedTerrain.includes(kind)) {
    return false;
  }
  const adjacency = definition.placement.requiresAdjacentTerrain;
  if (adjacency && !hasAdjacentTerrain(level, row, col, adjacency)) {
    return false;
  }
  return true;
}

export function canRouteEnter(
  level: Level,
  allowedTerrain: TileKind[],
  cell: CellCoord,
): boolean {
  if (!isPlayableCell(level, cell.row, cell.col)) {
    return false;
  }
  const kind = terrainKindAt(level, cell.row, cell.col);
  return Boolean(kind && allowedTerrain.includes(kind));
}

export function manhattanDistance(a: CellCoord, b: CellCoord): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

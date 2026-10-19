import { isoCellRole, type IsoSpan } from "@/lib/game/isoBoard";
import type { TileKind } from "@/lib/game/types";
import {
  CLIFF_BLOCK,
  CLIFF_STONE_LIFT,
  GRASS_VARIANTS,
  OCEAN_VARIANTS,
  SAND_VARIANTS,
} from "@/lib/rendering/tileCatalog";

/** NATIVE SPRITE — SQUARE IMAGE, GROUND DIAMOND INSIDE IT */
export const SPRITE_NATIVE = 32;

/** TOP VERTEX OF THE GROUND DIAMOND, IN SPRITE PIXELS */
export const SPRITE_ANCHOR_X = 16;
export const SPRITE_ANCHOR_Y = 8;

/** PALETTE STAND-IN — THE BOARD PICKS A VARIANT PER CELL */
export const TILE_SPRITES: Record<TileKind, string> = {
  grass: GRASS_VARIANTS[0]!,
  beach: SAND_VARIANTS[0]!,
  cliff: CLIFF_BLOCK,
  ocean: OCEAN_VARIANTS[0]!,
  marsh: OCEAN_VARIANTS[0]!,
};

export type IsoMetrics = {
  tileWidth: number;
  halfW: number;
  halfH: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  rows: number;
  cols: number;
  span?: IsoSpan;
};

/**
 * 2:1 ISO GRID.
 * TILE (row, col) TOP VERTEX:
 *   x = originX + (col - row) * halfW
 *   y = originY + (col + row) * halfH
 * SPRITE HANGS BELOW THAT VERTEX (FRONT FACE), SO THE BOARD IS TALLER THAN THE DIAMOND GRID.
 */
export function isoMetrics(
  tileWidth: number,
  rows: number,
  cols: number,
  span?: IsoSpan,
): IsoMetrics {
  const halfW = tileWidth / 2;
  const halfH = tileWidth / 4;
  const propLift = (CLIFF_STONE_LIFT * tileWidth) / SPRITE_NATIVE;
  const bounds = span ?? {
    uMin: 1 - rows,
    uMax: cols - 1,
    vMin: 0,
    vMax: rows + cols - 2,
  };
  const originX = halfW * (1 - bounds.uMin);
  const originY = halfH + propLift - bounds.vMin * halfH;
  return {
    tileWidth,
    halfW,
    halfH,
    originX,
    originY,
    width: (bounds.uMax - bounds.uMin + 2) * halfW,
    height: propLift + (bounds.vMax - bounds.vMin + 4) * halfH,
    rows,
    cols,
    span,
  };
}

export function isoCellTop(
  row: number,
  col: number,
  metrics: IsoMetrics,
): { x: number; y: number } {
  return {
    x: metrics.originX + (col - row) * metrics.halfW,
    y: metrics.originY + (col + row) * metrics.halfH,
  };
}

/** CENTER OF THE GROUND DIAMOND */
export function isoCellCenter(
  row: number,
  col: number,
  metrics: IsoMetrics,
): { x: number; y: number } {
  const top = isoCellTop(row, col, metrics);
  return { x: top.x, y: top.y + metrics.halfH };
}

/** TOP-LEFT OF THE SPRITE SO ITS ANCHOR LANDS ON THE CELL TOP VERTEX */
export function isoSpriteOrigin(
  row: number,
  col: number,
  metrics: IsoMetrics,
): { x: number; y: number } {
  const top = isoCellTop(row, col, metrics);
  const scale = metrics.tileWidth / SPRITE_NATIVE;
  return {
    x: top.x - SPRITE_ANCHOR_X * scale,
    y: top.y - SPRITE_ANCHOR_Y * scale,
  };
}

/** SCREEN POINT → CELL. SHARED EDGES GO TO THE NEIGHBOR WITH THE HIGHER INDEX. */
export function cellAtIsoPoint(
  x: number,
  y: number,
  metrics: IsoMetrics,
): { row: number; col: number } | null {
  const a = (x - metrics.originX) / metrics.halfW;
  const b = (y - (metrics.originY + metrics.halfH)) / metrics.halfH;
  const col = Math.round((a + b) / 2);
  const row = Math.round((b - a) / 2);
  if (row < 0 || col < 0 || row >= metrics.rows || col >= metrics.cols) {
    return null;
  }
  if (metrics.span && isoCellRole(row, col, metrics.span) !== "play") {
    return null;
  }
  return { row, col };
}

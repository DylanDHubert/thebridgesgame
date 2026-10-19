import {
  buildTerrainMaps,
  maxWaterDistance,
  waterDepthAt,
} from "@/lib/game/terrain";
import { isLandKind } from "@/lib/game/rules";
import type { TileKind } from "@/lib/game/types";
import type { Level } from "@/lib/game/level/types";
import type { TerrainView } from "@/lib/rendering/terrainView";
import { terrainKindAt } from "@/lib/rendering/terrainView";
import type { CellAppearance, OverlayKind } from "./types";
import {
  buildBeachSandField,
  type BeachSandField,
} from "./beachSand";
import {
  buildBridgeWoodField,
  type BridgeWoodField,
} from "./bridgeWood";
import {
  buildCliffRockField,
  type CliffRockField,
} from "./cliffRock";
import {
  buildGrassTerrainField,
  type GrassTerrainField,
} from "./grassTerrain";
import {
  buildMarshSplotchField,
  type MarshSplotchField,
} from "./waterFeatures";
import {
  buildWaterNoiseField,
  WATER_SUBCELLS,
  type WaterNoiseField,
} from "./waterNoise";

const SHALLOW_WATER = { r: 72, g: 176, b: 210 };
const DEEP_WATER = { r: 12, g: 48, b: 92 };
/** TURQUOISE-GREEN TINT FOR MARSH — BLENDED ON TOP OF OCEAN DEPTH */
const MARSH_TURQUOISE = { r: 30, g: 188, b: 152 };
const MARSH_GREEN_PUSH = { r: 46, g: 156, b: 88 };
/** EXTRA SHADE FOR WHIRLPOOL — DARKER OCEAN */
const WHIRLPOOL_SHADE = { r: 4, g: 24, b: 58 };
const INTERIOR_LAND = { r: 88, g: 156, b: 72 };
const BEACH_SAND = { r: 232, g: 210, b: 148 };
const CLIFF_STONE = { r: 110, g: 98, b: 86 };
const PATH_GLOW = { r: 255, g: 244, b: 180 };

const BRIDGE_WOOD_RGB = { r: 168, g: 118, b: 62 };

function mixColorRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function mixColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): string {
  const mixed = mixColorRgb(a, b, t);
  return `rgb(${mixed.r} ${mixed.g} ${mixed.b})`;
}

function oceanWaterRgb(depth: number): { r: number; g: number; b: number } {
  return mixColorRgb(SHALLOW_WATER, DEEP_WATER, depth);
}

function tileBaseRgb(
  kind: TileKind,
  depth: number,
): { r: number; g: number; b: number } {
  switch (kind) {
    case "grass":
      return mixColorRgb(INTERIOR_LAND, { r: 64, g: 130, b: 58 }, 0.35);
    case "beach":
      return mixColorRgb(BEACH_SAND, INTERIOR_LAND, 0.15);
    case "cliff":
      return mixColorRgb(CLIFF_STONE, { r: 72, g: 64, b: 56 }, 0.4);
    case "marsh":
      return mixColorRgb(
        mixColorRgb(oceanWaterRgb(depth), MARSH_TURQUOISE, 0.52),
        MARSH_GREEN_PUSH,
        0.2,
      );
    case "ocean":
    default:
      return oceanWaterRgb(depth);
  }
}

function tileBaseColor(
  kind: TileKind,
  depth: number,
): string {
  const rgb = tileBaseRgb(kind, depth);
  return `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
}

function isAnimatedWaterKind(kind: TileKind): boolean {
  return kind === "ocean" || kind === "marsh";
}

/** UNDERLYING TILE — INCLUDES BRIDGE CELLS FOR BACKGROUND PAINTING */
export function isAnimatedWaterTile(
  view: TerrainView,
  row: number,
  col: number,
): boolean {
  if (row < 0 || col < 0 || row >= view.rows || col >= view.cols) {
    return false;
  }

  return isAnimatedWaterKind(terrainKindAt(view, row, col)!);
}

export function hasBridgeAt(
  bridges: Set<string>,
  row: number,
  col: number,
): boolean {
  return bridges.has(`${row},${col}`);
}

export function isWaterCell(
  view: TerrainView,
  bridges: Set<string>,
  row: number,
  col: number,
): boolean {
  if (row < 0 || col < 0 || row >= view.rows || col >= view.cols) {
    return false;
  }

  if (hasBridgeAt(bridges, row, col)) {
    return false;
  }

  return isAnimatedWaterKind(terrainKindAt(view, row, col)!);
}

export function terrainSurfaceRgb(
  row: number,
  col: number,
  context: AppearanceContext,
): { r: number; g: number; b: number } {
  const { view, bridges, terrainMaps, maxDepth } = context;
  const key = `${row},${col}`;

  if (bridges.has(key)) {
    return BRIDGE_WOOD_RGB;
  }

  const kind = terrainKindAt(view, row, col)!;
  const distance = terrainMaps.distanceFromLand[row]![col]!;
  const depth = waterDepthAt(distance, maxDepth);

  return tileBaseRgb(kind, depth);
}

export function oceanWaterRgbForCell(
  row: number,
  col: number,
  context: AppearanceContext,
): { r: number; g: number; b: number } {
  const { terrainMaps, maxDepth } = context;
  const distance = terrainMaps.distanceFromLand[row]![col]!;
  const depth = waterDepthAt(distance, maxDepth);

  return tileBaseRgb("ocean", depth);
}

function sampleWaterDepthAt(
  row: number,
  col: number,
  context: AppearanceContext,
): number {
  const { view, terrainMaps, maxDepth } = context;
  const clampedRow = Math.min(view.rows - 1, Math.max(0, row));
  const clampedCol = Math.min(view.cols - 1, Math.max(0, col));
  const distance = terrainMaps.distanceFromLand[clampedRow]![clampedCol]!;
  return waterDepthAt(distance, maxDepth);
}

/** BILINEAR DEPTH BETWEEN NEIGHBOR CELL CENTERS — WATER PAINT ONLY */
export function interpolatedWaterDepth(
  row: number,
  col: number,
  subRow: number,
  subCol: number,
  context: AppearanceContext,
  amount: number,
): number {
  const cellDepth = sampleWaterDepthAt(row, col, context);
  if (amount <= 0) {
    return cellDepth;
  }

  // CELL DEPTHS LIVE AT CENTERS — SAMPLE IN THAT SPACE
  const cx = col + (subCol + 0.5) / WATER_SUBCELLS - 0.5;
  const cy = row + (subRow + 0.5) / WATER_SUBCELLS - 0.5;
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const tx = cx - x0;
  const ty = cy - y0;

  const d00 = sampleWaterDepthAt(y0, x0, context);
  const d10 = sampleWaterDepthAt(y0, x0 + 1, context);
  const d01 = sampleWaterDepthAt(y0 + 1, x0, context);
  const d11 = sampleWaterDepthAt(y0 + 1, x0 + 1, context);

  const blended =
    d00 * (1 - tx) * (1 - ty) +
    d10 * tx * (1 - ty) +
    d01 * (1 - tx) * ty +
    d11 * tx * ty;

  return cellDepth + (blended - cellDepth) * Math.min(1, amount);
}

export function waterBaseForCell(
  row: number,
  col: number,
  context: AppearanceContext,
): { rgb: { r: number; g: number; b: number }; kind: TileKind } | null {
  const { view, terrainMaps, maxDepth } = context;
  const kind = terrainKindAt(view, row, col)!;

  if (!isAnimatedWaterKind(kind)) {
    return null;
  }

  const distance = terrainMaps.distanceFromLand[row]![col]!;
  const depth = waterDepthAt(distance, maxDepth);

  return {
    rgb: tileBaseRgb(kind, depth),
    kind,
  };
}

/** WATER SUB-CELL BASE — DEPTH MAY BE INTERPOLATED; KIND STAYS PER-CELL */
export function waterBaseForSubcell(
  row: number,
  col: number,
  subRow: number,
  subCol: number,
  context: AppearanceContext,
  depthInterpolation: number,
): { rgb: { r: number; g: number; b: number }; kind: TileKind } | null {
  const { view } = context;
  const kind = terrainKindAt(view, row, col)!;

  if (!isAnimatedWaterKind(kind)) {
    return null;
  }

  const depth = interpolatedWaterDepth(
    row,
    col,
    subRow,
    subCol,
    context,
    depthInterpolation,
  );

  return {
    rgb: tileBaseRgb(kind, depth),
    kind,
  };
}

export function oceanWaterRgbForSubcell(
  row: number,
  col: number,
  subRow: number,
  subCol: number,
  context: AppearanceContext,
  depthInterpolation: number,
): { r: number; g: number; b: number } {
  const depth = interpolatedWaterDepth(
    row,
    col,
    subRow,
    subCol,
    context,
    depthInterpolation,
  );
  return tileBaseRgb("ocean", depth);
}

export function beachBaseForCell(
  row: number,
  col: number,
  context: AppearanceContext,
): { rgb: { r: number; g: number; b: number } } | null {
  const kind = terrainKindAt(context.view, row, col);

  if (kind !== "beach") {
    return null;
  }

  return {
    rgb: tileBaseRgb("beach", 0),
  };
}

export function grassBaseForCell(
  row: number,
  col: number,
  context: AppearanceContext,
): { rgb: { r: number; g: number; b: number } } | null {
  const kind = terrainKindAt(context.view, row, col);

  if (kind !== "grass") {
    return null;
  }

  return {
    rgb: tileBaseRgb("grass", 0),
  };
}

export function cliffBaseForCell(
  row: number,
  col: number,
  context: AppearanceContext,
): { rgb: { r: number; g: number; b: number } } | null {
  const kind = terrainKindAt(context.view, row, col);

  if (kind !== "cliff") {
    return null;
  }

  return {
    rgb: tileBaseRgb("cliff", 0),
  };
}

export type AppearanceContext = {
  view: TerrainView;
  /** WHEN SET (PLAY MODE), BRIDGE COST LABELS USE RULES ENGINE */
  level?: Level;
  bridges: Set<string>;
  pathKeys: Set<string>;
  showComponents: boolean;
  terrainMaps: ReturnType<typeof buildTerrainMaps>;
  maxDepth: number;
  waterNoise: WaterNoiseField;
  marshSplotch: MarshSplotchField;
  beachSand: BeachSandField;
  grassTerrain: GrassTerrainField;
  cliffRock: CliffRockField;
  bridgeWood: BridgeWoodField;
};

export function createAppearanceContext(
  view: TerrainView,
  bridges: Set<string>,
  pathKeys: Set<string>,
  showComponents: boolean,
  level?: Level,
): AppearanceContext {
  const terrainMaps = buildTerrainMaps(view);
  const maxDepth = maxWaterDistance(terrainMaps);
  const waterNoise = buildWaterNoiseField(view);
  const marshSplotch = buildMarshSplotchField(view);
  const beachSand = buildBeachSandField(view);
  const grassTerrain = buildGrassTerrainField(view);
  const cliffRock = buildCliffRockField(view);
  const bridgeWood = buildBridgeWoodField(view);

  return {
    view,
    level,
    bridges,
    pathKeys,
    showComponents,
    terrainMaps,
    maxDepth,
    waterNoise,
    marshSplotch,
    beachSand,
    grassTerrain,
    cliffRock,
    bridgeWood,
  };
}

export function appearanceForCell(
  row: number,
  col: number,
  context: AppearanceContext,
  overlayOverride?: OverlayKind,
): CellAppearance {
  const { view, bridges, pathKeys, terrainMaps, maxDepth } = context;
  const kind = terrainKindAt(view, row, col)!;
  const key = `${row},${col}`;
  const hasBridge = bridges.has(key);
  const onPath = pathKeys.has(key);

  let overlay: OverlayKind = overlayOverride ?? "none";
  if (overlay === "none") {
    if (hasBridge) {
      overlay = "bridge";
    } else if (onPath) {
      overlay = "path";
    }
  }

  let backgroundColor = "transparent";

  if (!hasBridge) {
    const distance = terrainMaps.distanceFromLand[row]![col]!;
    const depth = waterDepthAt(distance, maxDepth);

    if (
      isAnimatedWaterKind(kind) ||
      kind === "beach" ||
      kind === "grass" ||
      kind === "cliff"
    ) {
      backgroundColor = "transparent";
    } else {
      backgroundColor = tileBaseColor(kind, depth);
    }
  }

  return {
    backgroundColor,
    shimmer: undefined,
    overlay,
    componentTint: undefined,
  };
}

export function overlayAccent(overlay: OverlayKind): string | undefined {
  switch (overlay) {
    case "start":
      return "#38bdf8";
    case "waypoint":
      return "#a78bfa";
    case "goal":
      return "#fbbf24";
    case "bridge":
      return "#92400e";
    case "path":
      return mixColor(PATH_GLOW, { r: 255, g: 255, b: 255 }, 0.2);
    default:
      return undefined;
  }
}

export function overlayLabel(overlay: OverlayKind): string | null {
  switch (overlay) {
    case "start":
      return "X";
    case "waypoint":
      return "Y";
    case "goal":
      return "Z";
    default:
      return null;
  }
}

export function isMarkerOverlay(overlay: OverlayKind): boolean {
  return overlay === "start" || overlay === "waypoint" || overlay === "goal";
}

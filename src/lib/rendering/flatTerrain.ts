import type { TileKind } from "@/lib/game/types";

/** FLAT THUMBNAIL COLORS — NO NOISE, MATCHES BOARD PALETTE AT MID DEPTH */
const FLAT_TERRAIN_RGB: Record<TileKind, { r: number; g: number; b: number }> = {
  ocean: { r: 42, g: 112, b: 151 },
  marsh: { r: 36, g: 148, b: 132 },
  beach: { r: 210, g: 196, b: 138 },
  grass: { r: 78, g: 145, b: 66 },
  cliff: { r: 95, g: 84, b: 74 },
};

const MISSION_RGB = {
  x: { r: 248, g: 113, b: 113 },
  y: { r: 251, g: 191, b: 36 },
  z: { r: 96, g: 165, b: 250 },
} as const;

export function flatTerrainRgb(kind: TileKind): { r: number; g: number; b: number } {
  return FLAT_TERRAIN_RGB[kind] ?? FLAT_TERRAIN_RGB.ocean;
}

export function missionMarkerRgb(
  label: keyof typeof MISSION_RGB,
): { r: number; g: number; b: number } {
  return MISSION_RGB[label];
}

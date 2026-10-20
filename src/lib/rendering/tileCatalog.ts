import { DIRECTIONS } from "@/lib/game/constants";
import { hashStringToSeed } from "@/lib/game/seed";
import { isLandKind } from "@/lib/game/rules";
import type { TileKind } from "@/lib/game/types";
import type { TerrainView } from "@/lib/rendering/terrainView";
import { terrainKindAt } from "@/lib/rendering/terrainView";

/** TILE SHEET ORDER — SLUG PLUS ORIGINAL INDEX. SPLIT A SLUG BY RENAMING ENTRIES. */
export type TileCatalogEntry = {
  index: number;
  slug: string;
  file: string;
};

export const TILE_CATALOG: readonly TileCatalogEntry[] = [
  { index: 0, slug: "mud", file: "mud_000.png" },
  { index: 1, slug: "mud", file: "mud_001.png" },
  { index: 2, slug: "mud", file: "mud_002.png" },
  { index: 3, slug: "mud", file: "mud_003.png" },
  { index: 4, slug: "mud", file: "mud_004.png" },
  { index: 5, slug: "mud", file: "mud_005.png" },
  { index: 6, slug: "mud", file: "mud_006.png" },
  { index: 7, slug: "mud", file: "mud_007.png" },
  { index: 8, slug: "mud", file: "mud_008.png" },
  { index: 9, slug: "mud", file: "mud_009.png" },
  { index: 10, slug: "mud", file: "mud_010.png" },
  { index: 11, slug: "dry_mud", file: "dry_mud_011.png" },
  { index: 12, slug: "dry_mud", file: "dry_mud_012.png" },
  { index: 13, slug: "dry_mud", file: "dry_mud_013.png" },
  { index: 14, slug: "dry_mud", file: "dry_mud_014.png" },
  { index: 15, slug: "dry_mud", file: "dry_mud_015.png" },
  { index: 16, slug: "dry_mud", file: "dry_mud_016.png" },
  { index: 17, slug: "cracked_mud", file: "cracked_mud_017.png" },
  { index: 18, slug: "cracked_mud", file: "cracked_mud_018.png" },
  { index: 19, slug: "cracked_mud_plants", file: "cracked_mud_plants_019.png" },
  { index: 20, slug: "cracked_mud_plants", file: "cracked_mud_plants_020.png" },
  { index: 21, slug: "cracked_mud", file: "cracked_mud_021.png" },
  { index: 22, slug: "grass", file: "grass_022.png" },
  { index: 23, slug: "grass", file: "grass_023.png" },
  { index: 24, slug: "grass", file: "grass_024.png" },
  { index: 25, slug: "wood", file: "wood_025.png" },
  { index: 26, slug: "wood_moss", file: "wood_moss.png" },
  { index: 27, slug: "jungle_grass", file: "jungle_grass_027.png" },
  { index: 28, slug: "jungle_grass", file: "jungle_grass_028.png" },
  { index: 29, slug: "jungle_plants", file: "jungle_plants_029.png" },
  { index: 30, slug: "jungle_plants", file: "jungle_plants_030.png" },
  { index: 31, slug: "jungle_plants", file: "jungle_plants_031.png" },
  { index: 32, slug: "jungle_plants", file: "jungle_plants_032.png" },
  { index: 33, slug: "jungle_plants", file: "jungle_plants_033.png" },
  { index: 34, slug: "jungle_plants", file: "jungle_plants_034.png" },
  { index: 35, slug: "jungle_plants", file: "jungle_plants_035.png" },
  { index: 36, slug: "jungle_plants", file: "jungle_plants_036.png" },
  { index: 37, slug: "jungle_grass", file: "jungle_grass_037.png" },
  { index: 38, slug: "jungle_grass_light", file: "jungle_grass_light_038.png" },
  { index: 39, slug: "jungle_grass_light", file: "jungle_grass_light_039.png" },
  { index: 40, slug: "grass_dark", file: "grass_dark_040.png" },
  { index: 41, slug: "flower", file: "flower_041.png" },
  { index: 42, slug: "flower", file: "flower_042.png" },
  { index: 43, slug: "plant", file: "plant_043.png" },
  { index: 44, slug: "flower", file: "flower_044.png" },
  { index: 45, slug: "plant", file: "plant_045.png" },
  { index: 46, slug: "flower", file: "flower_046.png" },
  { index: 47, slug: "flower", file: "flower_047.png" },
  { index: 48, slug: "log", file: "log_048.png" },
  { index: 49, slug: "log", file: "log_049.png" },
  { index: 50, slug: "log_grass", file: "log_grass_050.png" },
  { index: 51, slug: "log_grass", file: "log_grass_051.png" },
  { index: 52, slug: "log_grass", file: "log_grass_052.png" },
  { index: 53, slug: "mud_rock", file: "mud_rock_053.png" },
  { index: 54, slug: "mud_rock", file: "mud_rock_054.png" },
  { index: 55, slug: "mud_rock", file: "mud_rock_055.png" },
  { index: 56, slug: "mud_rock", file: "mud_rock_056.png" },
  { index: 57, slug: "mud_rock", file: "mud_rock_057.png" },
  { index: 58, slug: "mud_rock", file: "mud_rock_058.png" },
  { index: 59, slug: "mud_rock", file: "mud_rock_059.png" },
  { index: 60, slug: "mud_rock", file: "mud_rock_060.png" },
  { index: 61, slug: "cobble_block", file: "cobble_block_061.png" },
  { index: 62, slug: "cobble_round", file: "cobble_round_062.png" },
  { index: 63, slug: "stone_block", file: "stone_block_063.png" },
  { index: 64, slug: "stone", file: "stone_064.png" },
  { index: 65, slug: "stone", file: "stone_065.png" },
  { index: 66, slug: "stone", file: "stone_066.png" },
  { index: 67, slug: "stone", file: "stone_067.png" },
  { index: 68, slug: "cobble_block_water", file: "cobble_block_water_068.png" },
  { index: 69, slug: "stone_block_water", file: "stone_block_water_069.png" },
  { index: 70, slug: "cobble_round_water", file: "cobble_round_water_070.png" },
  { index: 71, slug: "cobble_round_water", file: "cobble_round_water_071.png" },
  { index: 72, slug: "stone_water", file: "stone_water_072.png" },
  { index: 73, slug: "stone_water", file: "stone_water_073.png" },
  { index: 74, slug: "stone_water", file: "stone_water_074.png" },
  { index: 75, slug: "cobble_block_water", file: "cobble_block_water_075.png" },
  { index: 76, slug: "cobble_block_water", file: "cobble_block_water_076.png" },
  { index: 77, slug: "cobble_block_water", file: "cobble_block_water_077.png" },
  { index: 78, slug: "cobble_block_water", file: "cobble_block_water_078.png" },
  { index: 79, slug: "stone", file: "stone_079.png" },
  { index: 80, slug: "stone", file: "stone_080.png" },
  { index: 81, slug: "stone", file: "stone_081.png" },
  { index: 82, slug: "water_splash", file: "water_splash_082.png" },
  { index: 83, slug: "water_splash", file: "water_splash_083.png" },
  { index: 84, slug: "water_splash", file: "water_splash_084.png" },
  { index: 85, slug: "water_splash", file: "water_splash_085.png" },
  { index: 86, slug: "water_deep", file: "water_deep_086.png" },
  { index: 87, slug: "water_deep", file: "water_deep_087.png" },
  { index: 88, slug: "water_deep", file: "water_deep_088.png" },
  { index: 89, slug: "water_deep", file: "water_deep_089.png" },
  { index: 90, slug: "water_deep", file: "water_deep_090.png" },
  { index: 91, slug: "water_deep", file: "water_deep_091.png" },
  { index: 92, slug: "water_deep", file: "water_deep_092.png" },
  { index: 93, slug: "water_deep", file: "water_deep_093.png" },
  { index: 94, slug: "water_deep", file: "water_deep_094.png" },
  { index: 95, slug: "water_deep_flat", file: "water_deep_flat_095.png" },
  { index: 96, slug: "water_deep_flat", file: "water_deep_flat_096.png" },
  { index: 97, slug: "water_deep_flat", file: "water_deep_flat_097.png" },
  { index: 98, slug: "water_deep_flat", file: "water_deep_flat_098.png" },
  { index: 99, slug: "water_deep_flat", file: "water_deep_flat_099.png" },
  { index: 100, slug: "water_deep_flat", file: "water_deep_flat_100.png" },
  { index: 101, slug: "water_deep_flat", file: "water_deep_flat_101.png" },
  { index: 102, slug: "water_deep_flat", file: "water_deep_flat_102.png" },
  { index: 103, slug: "water_deep_flat", file: "water_deep_flat_103.png" },
  { index: 104, slug: "water_light", file: "water_light_104.png" },
  { index: 105, slug: "water_light", file: "water_light_105.png" },
  { index: 106, slug: "water_light", file: "water_light_106.png" },
  { index: 107, slug: "water_light", file: "water_light_107.png" },
  { index: 108, slug: "water_light", file: "water_light_108.png" },
  { index: 109, slug: "water_light", file: "water_light_109.png" },
  { index: 110, slug: "water_light", file: "water_light_110.png" },
  { index: 111, slug: "water_light", file: "water_light_111.png" },
  { index: 112, slug: "water_light", file: "water_light_112.png" },
  { index: 113, slug: "water_light", file: "water_light_113.png" },
  { index: 114, slug: "water_light", file: "water_light_114.png" },
];

export function tileSrc(file: string): string {
  return `/assets/sprites/tiles/${file}`;
}

function filesFrom(indexes: readonly number[]): string[] {
  return indexes.map((index) => {
    const entry = TILE_CATALOG[index];
    if (!entry || entry.index !== index) {
      throw new Error(`MISSING TILE ${index}`);
    }
    return tileSrc(entry.file);
  });
}

/** INLAND GRASS — JUNGLE PLANTS 30 THROUGH 36. 37 IS GRASS, NOT A PLANT. */
export const GRASS_VARIANTS = filesFrom([30, 31, 32, 33, 34, 35, 36]);

/** START ISLAND — EVERY CRACKED MUD TILE. SAME RULES AS GRASS. */
export const MUD_BLOCK_VARIANTS = filesFrom([17, 18, 21]);

/** GRASS TOUCHING WATER — JUNGLE GRASS 27 AND 28 */
export const SHORE_GRASS_VARIANTS = filesFrom([27, 28]);

/** GROUND UNDER A FLOWER. STILL GRASS. THE LIGHT BLADE IS THE HIGHLIGHT. */
export const FLOWER_BED = filesFrom([39])[0]!;

/** OPEN LIGHT WATER — NO LAND NEIGHBORS. SHORE TILES ARE CHOSEN PER CELL. */
export const OCEAN_VARIANTS = filesFrom([104]);

/**
 * LIGHT WATER SHORE, TURNED 90° CLOCKWISE FROM THE FIRST MAPPING.
 * NORTH USES NE, EAST USES SE, SOUTH USES SW, WEST USES NW.
 * 112 WAS LISTED THE SAME AS 111, SO IT IS NE AND SE.
 */
const SHORE_NW = 1;
const SHORE_NE = 2;
const SHORE_SE = 4;
const SHORE_SW = 8;

const LIGHT_WATER_BY_SHORE: Readonly<Record<number, number>> = {
  0: 104,
  [SHORE_NE]: 105,
  [SHORE_NW]: 106,
  [SHORE_SE]: 107,
  [SHORE_SW]: 108,
  [SHORE_NW | SHORE_NE]: 109,
  [SHORE_SE | SHORE_SW]: 110,
  [SHORE_NW | SHORE_SW]: 111,
  [SHORE_NE | SHORE_SE]: 112,
};

function neighborIsLand(view: TerrainView, row: number, col: number): boolean {
  const kind = terrainKindAt(view, row, col);
  return kind ? isLandKind(kind) : false;
}

/** SHORE FROM ORTHOGONAL LAND. WHIRLPOOL WINS. ANY OTHER MASK USES THE ALL TILE. */
export function oceanSprite(
  view: TerrainView,
  row: number,
  col: number,
  whirlpool: boolean,
): string {
  if (whirlpool) {
    return filesFrom([114])[0]!;
  }
  let shore = 0;
  if (neighborIsLand(view, row - 1, col)) {
    shore |= SHORE_NE;
  }
  if (neighborIsLand(view, row, col + 1)) {
    shore |= SHORE_SE;
  }
  if (neighborIsLand(view, row + 1, col)) {
    shore |= SHORE_SW;
  }
  if (neighborIsLand(view, row, col - 1)) {
    shore |= SHORE_NW;
  }
  return filesFrom([LIGHT_WATER_BY_SHORE[shore] ?? 113])[0]!;
}

/** CLIFF BASE — THE STONE BLOCK */
export const CLIFF_BLOCK = filesFrom([63])[0]!;

type Rgb = { r: number; g: number; b: number };

const SHALLOW_OCEAN: Rgb = { r: 150, g: 206, b: 226 };
const DEEP_OCEAN: Rgb = { r: 8, g: 32, b: 72 };
const SHALLOW_MARSH: Rgb = { r: 28, g: 150, b: 64 };
const DEEP_MARSH: Rgb = { r: 8, g: 64, b: 32 };
const SHALLOW_MARSH_YELLOW: Rgb = { r: 176, g: 168, b: 42 };
const DEEP_MARSH_YELLOW: Rgb = { r: 78, g: 86, b: 18 };

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

/**
 * WASH OVER THE WATER SPRITE.
 * DEPTH 0 IS NEXT TO LAND. DEPTH 1 IS THE FARTHEST WATER ON THE MAP.
 * MARSH WARMTH 0 IS THE CURRENT GREEN. 1 IS THE YELLOWER END.
 */
export function waterSurfaceTint(
  kind: "ocean" | "marsh",
  depth: number,
  warmth = 0,
): string {
  const t = Math.min(1, Math.max(0, depth));
  if (kind === "marsh") {
    const green = mixRgb(SHALLOW_MARSH, DEEP_MARSH, t);
    const yellow = mixRgb(SHALLOW_MARSH_YELLOW, DEEP_MARSH_YELLOW, t);
    const color = mixRgb(green, yellow, Math.min(1, Math.max(0, warmth)));
    const alpha = 0.52 + t * 0.22;
    return `rgb(${color.r} ${color.g} ${color.b} / ${alpha.toFixed(3)})`;
  }
  const color = mixRgb(SHALLOW_OCEAN, DEEP_OCEAN, t);
  const alpha = 0.06 + t * 0.56;
  return `rgb(${color.r} ${color.g} ${color.b} / ${alpha.toFixed(3)})`;
}

/** PALETTE SAMPLE — A SHALLOW-TO-MID MARSH */
export const MARSH_WATER_TINT = waterSurfaceTint("marsh", 0.35);

/** PICKUP SPLASH — PLAYS ONCE OVER THE REVEALED WATER */
export const WATER_SPLASH_FRAMES = filesFrom([82, 83, 84, 85]);

/** BRIDGE ON OPEN WATER */
export const BRIDGE_WOOD = filesFrom([25])[0]!;

/** BRIDGE ON MARSH */
export const BRIDGE_MARSH = filesFrom([26])[0]!;

/** OBJECTIVES X / Y / Z — FLOWER TILES */
export const FLOWER_VARIANTS = filesFrom([41, 42, 44, 46, 47]);

/** NATIVE PIXELS TO LIFT THE STONE ONTO THE BLOCK'S TOP FACE */
export const CLIFF_STONE_LIFT = 12;

export type SpriteLayer = {
  src: string;
  lift: number;
  /** FILLED OVER THE OPAQUE SPRITE PIXELS */
  tint?: string;
};

/** STABLE PICK — SAME SEED AND CELL ALWAYS GET THE SAME FILE */
export function pickVariant(
  variants: readonly string[],
  seed: string,
  row: number,
  col: number,
  salt: string,
): string {
  const roll = hashStringToSeed(`${seed}:${salt}:${row}:${col}`);
  return variants[roll % variants.length]!;
}

function grassTouchesWater(view: TerrainView, row: number, col: number): boolean {
  for (const { dr, dc } of DIRECTIONS) {
    const neighbor = terrainKindAt(view, row + dr, col + dc);
    if (neighbor === "ocean" || neighbor === "marsh") {
      return true;
    }
  }
  return false;
}

/** INLAND GRASS IS JUNGLE PLANTS. GRASS ON THE WATER IS JUNGLE GRASS. MUD IS THE START ISLAND. */
function grassSprite(view: TerrainView, row: number, col: number, mud: boolean): string {
  if (mud) {
    return pickVariant(MUD_BLOCK_VARIANTS, view.seed, row, col, "mud-block");
  }
  const shore = grassTouchesWater(view, row, col);
  return pickVariant(
    shore ? SHORE_GRASS_VARIANTS : GRASS_VARIANTS,
    view.seed,
    row,
    col,
    shore ? "shore-grass" : "grass",
  );
}

/** LAYERS FOR ONE CELL. CLIFFS ARE THE STONE BLOCK. */
export function terrainLayers(
  kind: TileKind,
  view: TerrainView,
  row: number,
  col: number,
  whirlpool = false,
  mud = false,
): SpriteLayer[] {
  if (kind === "cliff") {
    return [{ src: CLIFF_BLOCK, lift: 0 }];
  }
  if (kind === "grass") {
    return [{ src: grassSprite(view, row, col, mud), lift: 0 }];
  }
  return [
    {
      src: oceanSprite(view, row, col, kind === "ocean" && whirlpool),
      lift: 0,
    },
  ];
}

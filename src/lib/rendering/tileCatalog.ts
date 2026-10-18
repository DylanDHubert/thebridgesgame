import { hashStringToSeed } from "@/lib/game/seed";
import type { TileKind } from "@/lib/game/types";

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
  { index: 25, slug: "farmland_mud", file: "farmland_mud_025.png" },
  { index: 26, slug: "farmland_mud_plants", file: "farmland_mud_plants_026.png" },
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
  { index: 37, slug: "jungle_plants", file: "jungle_plants_037.png" },
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

/** GRASS CELLS — JUNGLE PLANTS 30 THROUGH 37 */
export const GRASS_VARIANTS = filesFrom([30, 31, 32, 33, 34, 35, 36, 37]);

/** SAND / BEACH CELLS — JUNGLE GRASS 27 AND 28 */
export const SAND_VARIANTS = filesFrom([27, 28]);

/** OCEAN CELLS — DEEP WATER 86 THROUGH 94. DIRECTION COMES LATER. */
export const OCEAN_VARIANTS = TILE_CATALOG.filter(
  (entry) => entry.slug === "water_deep",
).map((entry) => tileSrc(entry.file));

/** CLIFF BASE — THE STONE BLOCK */
export const CLIFF_BLOCK = filesFrom([63])[0]!;

/** STONE SITTING ON THE CLIFF BLOCK — LOOSE STONES, NOT 66 */
export const CLIFF_STONES = filesFrom([64, 65, 67]);

/** OBJECTIVES X / Y / Z — FLOWER TILES */
export const FLOWER_VARIANTS = filesFrom([41, 42, 44, 46, 47]);

/** NATIVE PIXELS TO LIFT THE STONE ONTO THE BLOCK'S TOP FACE */
export const CLIFF_STONE_LIFT = 12;

export type SpriteLayer = {
  src: string;
  lift: number;
};

/** PLACED BRIDGES — EVERY COBBLE-IN-WATER TILE */
export const BRIDGE_VARIANTS = TILE_CATALOG.filter(
  (entry) => entry.slug === "cobble_block_water",
).map((entry) => tileSrc(entry.file));

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

/** SPRITE FOR A TERRAIN CELL. KINDS WITHOUT A POOL STAY UNDRAWN. */
export function terrainSprite(
  kind: TileKind,
  seed: string,
  row: number,
  col: number,
): string | null {
  if (kind === "grass") {
    return pickVariant(GRASS_VARIANTS, seed, row, col, "grass");
  }
  if (kind === "beach") {
    return pickVariant(SAND_VARIANTS, seed, row, col, "beach");
  }
  if (kind === "ocean") {
    return pickVariant(OCEAN_VARIANTS, seed, row, col, "ocean");
  }
  return null;
}

/** LAYERS FOR ONE CELL. CLIFFS ARE A BLOCK WITH A STONE ON TOP. */
export function terrainLayers(
  kind: TileKind,
  seed: string,
  row: number,
  col: number,
): SpriteLayer[] {
  if (kind === "cliff") {
    return [
      { src: CLIFF_BLOCK, lift: 0 },
      {
        src: pickVariant(CLIFF_STONES, seed, row, col, "cliff"),
        lift: CLIFF_STONE_LIFT,
      },
    ];
  }
  const src = terrainSprite(kind, seed, row, col);
  return src ? [{ src, lift: 0 }] : [];
}

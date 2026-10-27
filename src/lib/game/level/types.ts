import type { IsoSpan } from "../isoBoard";
import type { CellCoord, Mission, TileKind } from "../types";

export type TerrainKind = TileKind;

export const TERRAIN_KINDS: readonly TerrainKind[] = [
  "ocean",
  "marsh",
  "grass",
  "cliff",
];

/** HOME MAP NAMES THAT ARE NOT MISSION X/Y/Z OR DAILY. */
export type HomeSpotId = "calendar" | "creatures" | "how";

export type ObjectDefId = string;
export type RouteDefId = string;

export type LevelObject = {
  defId: ObjectDefId;
  at: CellCoord;
  config?: Record<string, unknown>;
};

export type LevelRoute = {
  id: string;
  defId: RouteDefId;
  closed: boolean;
  path: CellCoord[];
  config?: Record<string, unknown>;
};

/** THE CANONICAL MAP — TERRAIN + OBJECTS + ROUTES + MISSION */
export type Level = {
  id: string;
  name: string;
  seed: string;
  rows: number;
  cols: number;
  terrain: TileKind[];
  objects: LevelObject[];
  routes: LevelRoute[];
  mission: Mission;
  /** BOAR'S ISLAND. ABSENT ON THE HOME MAP, WHICH REUSES MISSION AS LABELS. */
  start?: CellCoord;
  /** DAILY ISLAND ON THE HOME MAP. */
  daily?: CellCoord;
  /** EXTRA HOME MENU ANCHORS. TUTORIAL STAYS GUESSED UNTIL ONE IS SAVED. */
  spots?: Partial<Record<HomeSpotId, CellCoord>>;
  /** U/V BOUNDS OF THE ISO RECTANGLE IN STORED ROW/COL. OUTER TWO LAYERS ARE PADDING. */
  iso: IsoSpan;
  /** WATER CELLS THE PLAYER SHOULD BRIDGE. TUTORIAL AND HOME. NOT GUESSED. */
  clicks?: CellCoord[];
};

export const LEVEL_FILE_VERSION = 3;

export type LevelFile = {
  version: number;
  id: string;
  name: string;
  seed: string;
  grid: { rows: number; cols: number };
  terrain: string;
  mission: {
    x: [number, number];
    y: [number, number];
    z: [number, number];
  };
  /** BOAR START. OMITTED ON HOME AND OLDER FILES. */
  start?: [number, number];
  /** DAILY ISLAND ORIGIN. HOME MAP ONLY. */
  daily?: [number, number];
  /** CALENDAR, CREATURES, AND A PLACED TUTORIAL. HOME MAP ONLY. */
  spots?: Partial<Record<HomeSpotId, [number, number]>>;
  objects: Array<{
    defId: string;
    row: number;
    col: number;
    config?: Record<string, unknown>;
  }>;
  routes: Array<{
    id: string;
    defId: string;
    closed: boolean;
    path: Array<[number, number]>;
    config?: Record<string, unknown>;
  }>;
  meta?: {
    author?: string;
    createdAt?: string;
  };
  /** PRESENT ON V3. V2 FILES ARE CONTENT RECTS AND GET EMBEDDED ON LOAD. */
  iso?: IsoSpan;
  /** TUTORIAL CLICKS. OMITTED ON PLAY BOARDS. */
  clicks?: Array<[number, number]>;
};

/** TERRAIN KINDS — WHIRLPOOL IS AN OBJECT, NOT TERRAIN (SEE content/objects/) */
export type TileKind = "grass" | "cliff" | "ocean" | "marsh";

export type CellCoord = {
  row: number;
  col: number;
};

/**
 * THE THREE FLOWERS. THE BOAR'S START IS Level.start, NOT ONE OF THESE.
 * WIN LOGIC: ALL THREE MUST BE REACHABLE FROM THE START (ORDER-AGNOSTIC).
 */
export type Mission = {
  x: CellCoord;
  y: CellCoord;
  z: CellCoord;
};

export type SimulationResult = {
  /** START AND ALL THREE FLOWERS LIE IN ONE WALKABLE COMPONENT */
  connected: boolean;
  bridgeCount: number;
  bridgeCost: number;
  /** WALK FROM THE START, NEAREST FLOWER FIRST */
  path: CellCoord[];
  reachable: Set<string>;
};

export type GamePhase = "editing" | "success" | "disconnected";

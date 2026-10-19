/** TERRAIN KINDS — WHIRLPOOL IS AN OBJECT, NOT TERRAIN (SEE content/objects/) */
export type TileKind = "grass" | "cliff" | "ocean" | "marsh";

export type CellCoord = {
  row: number;
  col: number;
};

/**
 * MISSION CHECKPOINTS — SHOWN TO PLAYER AS X → Y → Z.
 * WIN LOGIC: ALL THREE MUST BE REACHABLE (ORDER-AGNOSTIC); SEE simulateLevel.ts.
 */
export type Mission = {
  x: CellCoord;
  y: CellCoord;
  z: CellCoord;
};

export type SimulationResult = {
  /** ALL MISSION CHECKPOINTS LIE IN ONE WALKABLE COMPONENT */
  connected: boolean;
  bridgeCount: number;
  bridgeCost: number;
  /** DISPLAY PATH IN X → Y → Z ORDER (UX ONLY) */
  path: CellCoord[];
  reachable: Set<string>;
};

export type GamePhase = "editing" | "success" | "disconnected";

/** SPRITE SHEET REFERENCE — SWAP CSS COLORS FOR FRAMES LATER */
export type SpriteRef = {
  sheet: string;
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type OverlayKind =
  | "none"
  | "start"
  | "waypoint"
  | "goal"
  | "bridge"
  | "path"
  | "hover-bridge";

export type CellAppearance = {
  backgroundColor: string;
  backgroundImage?: string;
  shimmer?: string;
  sprite?: SpriteRef;
  overlay: OverlayKind;
  componentTint?: string;
};

export const SPRITE_SHEETS = {
  terrain: "/assets/sprites/terrain.png",
  characters: "/assets/sprites/characters.png",
  ui: "/assets/sprites/ui.png",
} as const;

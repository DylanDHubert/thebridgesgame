import { TILE_SPRITES } from "@/lib/rendering/isoTiles";
import type { TileKind } from "@/lib/game/types";

/** PALETTE PREVIEW — THE SAME SPRITE THE BOARD DRAWS */
export function TileSwatch({
  kind,
  size = 40,
}: {
  kind: TileKind;
  size?: number;
}) {
  return (
    <div
      aria-hidden
      className="block"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${TILE_SPRITES[kind]})`,
        backgroundSize: "100% 100%",
        imageRendering: "pixelated",
      }}
    />
  );
}

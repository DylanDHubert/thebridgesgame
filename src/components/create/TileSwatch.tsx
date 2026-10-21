import type { TileKind } from "@/lib/game/types";
import { TILE_SPRITES } from "@/lib/rendering/isoTiles";
import { MARSH_WATER_TINT } from "@/lib/rendering/tileCatalog";

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
      className="relative block"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${TILE_SPRITES[kind]})`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        imageRendering: "pixelated",
      }}
    >
      {kind === "marsh" ? (
        <span
          className="absolute inset-0"
          style={{
            backgroundColor: MARSH_WATER_TINT,
            maskImage: `url(${TILE_SPRITES[kind]})`,
            WebkitMaskImage: `url(${TILE_SPRITES[kind]})`,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      ) : null}
    </div>
  );
}

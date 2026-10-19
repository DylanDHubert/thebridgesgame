import type { CSSProperties } from "react";

import { canPlaceBridgeAt } from "@/lib/game/rules";
import { isoCellTop, type IsoMetrics } from "@/lib/rendering/isoTiles";
import {
  appearanceForCell,
  type AppearanceContext,
} from "@/lib/rendering/cellAppearance";

type CellViewProps = {
  row: number;
  col: number;
  context: AppearanceContext;
  metrics: IsoMetrics;
  interactive: boolean;
  editable?: boolean;
  onToggle?: (row: number, col: number) => void;
};

/** DIAMOND HIT TARGET OVER THE SPRITE — TERRAIN ART IS THE CANVAS UNDERNEATH */
export function CellView({
  row,
  col,
  context,
  metrics,
  interactive,
  editable = false,
  onToggle,
}: CellViewProps) {
  const appearance = appearanceForCell(row, col, context);
  const bridgeable = context.level
    ? canPlaceBridgeAt(context.level, row, col)
    : false;
  const clickable = editable || (interactive && bridgeable);
  const top = isoCellTop(row, col, metrics);
  const wash =
    appearance.overlay === "path" ? "rgb(251 191 36 / 0.35)" : "transparent";

  const style: CSSProperties = {
    left: top.x - metrics.halfW,
    top: top.y,
    width: metrics.tileWidth,
    height: metrics.halfH * 2,
    backgroundColor: wash,
    clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
    zIndex: row + col,
  };

  return (
    <button
      type="button"
      aria-label={`Cell ${row + 1}, ${col + 1}`}
      disabled={!clickable}
      onClick={() => onToggle?.(row, col)}
      className={[
        "absolute",
        clickable ? "cursor-pointer border-0 p-0 hover:bg-white/25" : "cursor-default border-0 p-0",
      ].join(" ")}
      style={style}
    />
  );
}

import type { CSSProperties } from "react";

import { canPlaceBridgeAt } from "@/lib/game/rules";
import { isoCellTop, type IsoMetrics } from "@/lib/rendering/isoTiles";
import type { AppearanceContext } from "@/lib/rendering/cellAppearance";

type CellViewProps = {
  row: number;
  col: number;
  context: AppearanceContext;
  metrics: IsoMetrics;
  interactive: boolean;
  editable?: boolean;
  /** WHEN FALSE THE CELL REFUSES THE CLICK. THE LESSON USES THIS. */
  open?: boolean;
  /** LAND THAT STILL TAKES A CLICK. HOME ISLANDS USE THIS. */
  pressable?: boolean;
  onToggle?: (row: number, col: number) => void;
  onHover?: (key: string | null) => void;
};

/** DIAMOND HIT TARGET OVER THE SPRITE — TERRAIN ART IS THE CANVAS UNDERNEATH */
export function CellView({
  row,
  col,
  context,
  metrics,
  interactive,
  editable = false,
  open = true,
  pressable = false,
  onToggle,
  onHover,
}: CellViewProps) {
  const bridgeable = context.level
    ? canPlaceBridgeAt(context.level, row, col)
    : false;
  const clickable = open && (editable || pressable || (interactive && bridgeable));
  const top = isoCellTop(row, col, metrics);

  const style: CSSProperties = {
    left: top.x - metrics.halfW,
    top: top.y,
    width: metrics.tileWidth,
    height: metrics.halfH * 2,
    clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
    zIndex: row + col,
  };

  return (
    <button
      type="button"
      aria-label={`Cell ${row + 1}, ${col + 1}`}
      disabled={!clickable}
      onClick={() => onToggle?.(row, col)}
      onPointerEnter={() => {
        if (clickable) {
          onHover?.(`${row},${col}`);
        }
      }}
      onPointerLeave={() => onHover?.(null)}
      className={[
        "absolute border-0 bg-transparent p-0",
        clickable ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
      style={style}
    />
  );
}

import type { Mission } from "@/lib/game/types";
import { isoCellCenter, SPRITE_NATIVE, type IsoMetrics } from "@/lib/rendering/isoTiles";
import { CLIFF_STONE_LIFT } from "@/lib/rendering/tileCatalog";

type MissionMarkerOverlayProps = {
  mission: Mission;
  metrics: IsoMetrics;
};

const MARKERS: Array<{ key: keyof Mission; label: string; color: string }> = [
  { key: "x", label: "X", color: "#38bdf8" },
  { key: "y", label: "Y", color: "#a78bfa" },
  { key: "z", label: "Z", color: "#fbbf24" },
];

/** X / Y / Z MARKERS — UPRIGHT ON THE ISO DIAMOND. WIN LOGIC IS ORDER-AGNOSTIC */
export function MissionMarkerOverlay({
  mission,
  metrics,
}: MissionMarkerOverlayProps) {
  const tileWidth = metrics.tileWidth;
  const fontSize = Math.max(10, metrics.halfH * 0.9);

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={metrics.width}
      height={metrics.height}
      viewBox={`0 0 ${metrics.width} ${metrics.height}`}
      aria-hidden
    >
      {MARKERS.map(({ key, label, color }) => {
        const cell = mission[key];
        const { x, y } = isoCellCenter(cell.row, cell.col, metrics);
        const labelY = y - (CLIFF_STONE_LIFT * tileWidth) / SPRITE_NATIVE;
        return (
          <g key={key}>
            <text
              x={x}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={fontSize}
              fontWeight="bold"
              style={{ paintOrder: "stroke", stroke: color, strokeWidth: 3 }}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

import type { CellCoord } from "@/lib/game/types";
import { isoCellCenter, type IsoMetrics } from "@/lib/rendering/isoTiles";

export type PathLineStyle = {
  id: string;
  path: CellCoord[];
  stroke: string;
  strokeWidth?: number;
  dashArray?: string;
  opacity?: number;
};

type PathLineOverlayProps = {
  paths: PathLineStyle[];
  metrics: IsoMetrics;
};

function pathToPoints(path: CellCoord[], metrics: IsoMetrics): string {
  return path
    .map(({ row, col }) => {
      const { x, y } = isoCellCenter(row, col, metrics);
      return `${x},${y}`;
    })
    .join(" ");
}

export function PathLineOverlay({ paths, metrics }: PathLineOverlayProps) {
  const visiblePaths = paths.filter((entry) => entry.path.length >= 2);
  if (visiblePaths.length === 0) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={metrics.width}
      height={metrics.height}
      viewBox={`0 0 ${metrics.width} ${metrics.height}`}
      aria-hidden
    >
      {visiblePaths.map((entry) => (
        <polyline
          key={entry.id}
          points={pathToPoints(entry.path, metrics)}
          fill="none"
          stroke={entry.stroke}
          strokeWidth={entry.strokeWidth ?? Math.max(2, metrics.halfH * 0.35)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={entry.dashArray}
          opacity={entry.opacity ?? 1}
        />
      ))}
    </svg>
  );
}

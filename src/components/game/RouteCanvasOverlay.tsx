import { routeDefinition } from "@/lib/game/objects/registry";
import type { LevelRoute } from "@/lib/game/level/types";
import type { CellCoord } from "@/lib/game/types";
import { isoCellCenter, isoMetrics } from "@/lib/rendering/isoTiles";

export type DraftRoute = {
  defId: string;
  path: CellCoord[];
  closed: boolean;
};

type RouteCanvasOverlayProps = {
  routes: LevelRoute[];
  draftRoute?: DraftRoute | null;
  rows: number;
  cols: number;
  tileWidth: number;
};

function pointsFor(
  path: CellCoord[],
  closed: boolean,
  metrics: ReturnType<typeof isoMetrics>,
): string {
  const cells = closed && path.length > 1 ? [...path, path[0]!] : path;
  return cells
    .map((cell) => {
      const { x, y } = isoCellCenter(cell.row, cell.col, metrics);
      return `${x},${y}`;
    })
    .join(" ");
}

function RoutePolyline({
  path,
  closed,
  color,
  metrics,
  dashed,
}: {
  path: CellCoord[];
  closed: boolean;
  color: string;
  metrics: ReturnType<typeof isoMetrics>;
  dashed?: boolean;
}) {
  const strokeWidth = Math.max(2, metrics.halfH * 0.4);
  const nodeRadius = Math.max(1.5, metrics.halfH * 0.28);

  return (
    <g>
      {path.length >= 2 ? (
        <polyline
          points={pointsFor(path, closed, metrics)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashed ? `${strokeWidth * 1.5} ${strokeWidth * 1.5}` : undefined}
          opacity={0.9}
        />
      ) : null}
      {path.map((cell, index) => {
        const { x, y } = isoCellCenter(cell.row, cell.col, metrics);
        const isEnd = index === 0 || index === path.length - 1;
        return (
          <circle
            key={`${cell.row}-${cell.col}-${index}`}
            cx={x}
            cy={y}
            r={isEnd ? nodeRadius * 1.4 : nodeRadius}
            fill={isEnd ? color : "white"}
            stroke={color}
            strokeWidth={Math.max(1, metrics.tileWidth * 0.03)}
          />
        );
      })}
    </g>
  );
}

export function RouteCanvasOverlay({
  routes,
  draftRoute,
  rows,
  cols,
  tileWidth,
}: RouteCanvasOverlayProps) {
  const metrics = isoMetrics(tileWidth, rows, cols);

  if (routes.length === 0 && (!draftRoute || draftRoute.path.length === 0)) {
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
      {routes.map((route) => (
        <RoutePolyline
          key={route.id}
          path={route.path}
          closed={route.closed}
          color={routeDefinition(route.defId)?.color ?? "rgb(226 232 240)"}
          metrics={metrics}
        />
      ))}
      {draftRoute && draftRoute.path.length > 0 ? (
        <RoutePolyline
          path={draftRoute.path}
          closed={draftRoute.closed}
          color={routeDefinition(draftRoute.defId)?.color ?? "rgb(226 232 240)"}
          metrics={metrics}
          dashed
        />
      ) : null}
    </svg>
  );
}

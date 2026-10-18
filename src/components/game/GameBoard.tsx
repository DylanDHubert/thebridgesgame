"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CellView } from "@/components/game/CellView";
import { MapLabelOverlay, type MapLabel } from "@/components/game/MapLabelOverlay";
import { MissionMarkerOverlay } from "@/components/game/MissionMarkerOverlay";
import { ObjectCanvasOverlay } from "@/components/game/ObjectCanvasOverlay";
import { PathLineOverlay, type PathLineStyle } from "@/components/game/PathLineOverlay";
import { RouteCanvasOverlay, type DraftRoute } from "@/components/game/RouteCanvasOverlay";
import { RouteShipOverlay } from "@/components/game/RouteShipOverlay";
import { SpriteTerrainCanvas } from "@/components/game/SpriteTerrainCanvas";
import { WoodFrame } from "@/components/ui/woodPlaque";
import type { Level } from "@/lib/game/level/types";
import type { CellCoord } from "@/lib/game/types";
import { createAppearanceContext } from "@/lib/rendering/cellAppearance";
import { isoMetrics } from "@/lib/rendering/isoTiles";
import { FLOWER_VARIANTS } from "@/lib/rendering/tileCatalog";
import { terrainViewFromLevel } from "@/lib/rendering/terrainView";

type GameBoardProps = {
  level: Level;
  bridges: Set<string>;
  pathKeys: Set<string>;
  runPath?: CellCoord[];
  showMission?: boolean;
  interactive?: boolean;
  editable?: boolean;
  sizing?: "play" | "contain";
  draftRoute?: DraftRoute | null;
  /** WHITE CELL OUTLINE OPACITY — 0 HIDES THE GRID */
  cellGridOpacity?: number;
  /** BLEND WATER DEPTH ACROSS NEIGHBOR CELLS — 0 = CHUNKY, 1 = FULL */
  waterDepthInterpolation?: number;
  onToggleBridge?: (row: number, col: number) => void;
  onCellClick?: (row: number, col: number) => void;
  mapLabels?: MapLabel[];
  /** CAP CONTAIN CELL SIZE — SMALLER = MORE ZOOMED OUT */
  maxContainCell?: number;
  /** WOOD BEZEL HUGGING THE GRID (NO INNER PAD) */
  framed?: boolean;
  mapLabelsDraggable?: boolean;
  onMapLabelMove?: (id: string, row: number, col: number) => void;
};

const MAX_TILE = 64;
const MIN_TILE = 16;
const emptyRoutes: Level["routes"] = [];
const CONTAIN_MIN_TILE = 8;
const TILE_STEP = 4;
const BOARD_PADDING = 24;
const BOARD_CARD_PADDING = 12;
const BOARD_CARD_BORDER = 1;

function boardCardPixelSize(tileWidth: number, rows: number, cols: number) {
  const board = isoMetrics(tileWidth, rows, cols);
  const chrome = BOARD_CARD_PADDING * 2 + BOARD_CARD_BORDER * 2;
  return { width: board.width + chrome, height: board.height + chrome };
}

/** TILE WIDTH IN MULTIPLES OF 4 SO THE 2:1 DIAMOND LANDS ON WHOLE PIXELS */
function resolveTileWidth(
  width: number,
  height: number,
  rows: number,
  cols: number,
  sizing: "play" | "contain",
  maxContainCell = 512,
): number {
  const min = sizing === "contain" ? CONTAIN_MIN_TILE : MIN_TILE;
  const max = sizing === "contain" ? Math.max(min, maxContainCell) : MAX_TILE;
  if (width <= 0 || height <= 0) {
    return min;
  }
  let best = min;
  for (let tile = min; tile <= max; tile += TILE_STEP) {
    const card = boardCardPixelSize(tile, rows, cols);
    if (card.width <= width && card.height <= height) {
      best = tile;
    } else {
      break;
    }
  }
  return best;
}

export function GameBoard({
  level,
  bridges,
  pathKeys,
  runPath = [],
  showMission = true,
  interactive = true,
  editable = false,
  sizing = "play",
  draftRoute,
  onToggleBridge,
  onCellClick,
  mapLabels,
  maxContainCell = 512,
  framed = false,
  mapLabelsDraggable = false,
  onMapLabelMove,
}: GameBoardProps) {
  const handleCellActivate = editable ? onCellClick : onToggleBridge;
  const containerRef = useRef<HTMLDivElement>(null);
  const [tileWidth, setTileWidth] = useState(() =>
    sizing === "contain" ? CONTAIN_MIN_TILE : MAX_TILE,
  );
  const view = useMemo(() => terrainViewFromLevel(level), [level]);
  const metrics = useMemo(
    () => isoMetrics(tileWidth, level.rows, level.cols),
    [tileWidth, level.rows, level.cols],
  );

  const context = useMemo(
    () =>
      createAppearanceContext(
        view,
        bridges,
        pathKeys,
        false,
        interactive && !editable ? level : undefined,
      ),
    [view, bridges, pathKeys, level, interactive, editable],
  );

  const objectiveMarkers = useMemo(() => {
    if (!showMission) {
      return [];
    }
    const keys = ["x", "y", "z"] as const;
    return keys.map((key, index) => ({
      row: level.mission[key].row,
      col: level.mission[key].col,
      src: FLOWER_VARIANTS[index]!,
    }));
  }, [showMission, level.mission]);

  const pathLines = useMemo((): PathLineStyle[] => {
    if (runPath.length < 2) {
      return [];
    }
    return [
      {
        id: "run",
        path: runPath,
        stroke: "rgb(251 191 36)",
        opacity: 0.95,
      },
    ];
  }, [runPath]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const updateSize = () => {
      if (sizing === "contain") {
        // ROOM FOR WOOD BEZEL + OUTER RINGS WHEN framed
        const framePad = framed ? 14 : 0;
        setTileWidth(
          resolveTileWidth(
            Math.max(1, element.clientWidth - framePad),
            Math.max(1, element.clientHeight - framePad),
            level.rows,
            level.cols,
            sizing,
            maxContainCell,
          ),
        );
        return;
      }
      const width = element.clientWidth - BOARD_PADDING;
      const heightBudget = Math.min(window.innerHeight * 0.58, 640);
      setTileWidth(
        resolveTileWidth(width, heightBudget, level.rows, level.cols, sizing),
      );
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [level.rows, level.cols, sizing, maxContainCell, framed]);

  const grid = (
    <div
      className="relative"
      style={{ width: metrics.width, height: metrics.height }}
    >
      <SpriteTerrainCanvas
        view={view}
        metrics={metrics}
        bridges={bridges}
        objectives={objectiveMarkers}
      />
      {level.objects.length > 0 ? (
        <ObjectCanvasOverlay
          objects={level.objects}
          rows={level.rows}
          cols={level.cols}
          tileWidth={tileWidth}
        />
      ) : null}
      {level.routes.length > 0 ? (
        <RouteShipOverlay
          routes={level.routes}
          rows={level.rows}
          cols={level.cols}
          tileWidth={tileWidth}
        />
      ) : null}
      {draftRoute && draftRoute.path.length > 0 ? (
        <RouteCanvasOverlay
          routes={emptyRoutes}
          draftRoute={draftRoute}
          rows={level.rows}
          cols={level.cols}
          tileWidth={tileWidth}
        />
      ) : null}
      {Array.from({ length: level.rows }, (_, row) =>
        Array.from({ length: level.cols }, (_, col) => (
          <CellView
            key={`${row}-${col}`}
            row={row}
            col={col}
            context={context}
            metrics={metrics}
            interactive={interactive}
            editable={editable}
            onToggle={handleCellActivate}
          />
        )),
      )}
      {showMission ? (
        <MissionMarkerOverlay
          mission={level.mission}
          rows={level.rows}
          cols={level.cols}
          tileWidth={tileWidth}
        />
      ) : null}
      {mapLabels && mapLabels.length > 0 ? (
        <MapLabelOverlay
          labels={mapLabels}
          rows={level.rows}
          cols={level.cols}
          tileWidth={tileWidth}
          draggable={mapLabelsDraggable}
          onMoveLabel={onMapLabelMove}
        />
      ) : null}
      <PathLineOverlay
        paths={pathLines}
        rows={level.rows}
        cols={level.cols}
        tileWidth={tileWidth}
      />
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={
        sizing === "contain"
          ? "flex h-full w-full items-center justify-center"
          : "w-full max-w-md lg:max-w-none lg:flex-1"
      }
    >
      {framed ? (
        <WoodFrame className="max-h-full max-w-full shrink-0">{grid}</WoodFrame>
      ) : (
        <div
          className={
            sizing === "contain"
              ? "max-h-full max-w-full shrink-0 border border-[rgb(95_84_74)] bg-[rgb(12_48_92)] p-2"
              : "mx-auto w-fit max-w-full border border-[rgb(95_84_74)] bg-[rgb(12_48_92)] p-2"
          }
        >
          {grid}
        </div>
      )}
    </div>
  );
}

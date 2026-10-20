"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BoarClick, BOAR_THOUGHTS } from "@/components/game/BoarClick";
import { BridgeSplash } from "@/components/game/BridgeSplash";
import { CellView } from "@/components/game/CellView";
import { MapLabelOverlay, type MapLabel } from "@/components/game/MapLabelOverlay";
import type { DraftRoute } from "@/components/game/RouteCanvasOverlay";
import { SpriteTerrainCanvas, type ReachFlash } from "@/components/game/SpriteTerrainCanvas";
import { WoodFrame } from "@/components/ui/woodPlaque";
import { cellKey } from "@/lib/game/coords";
import { bleedRimSpan, isoLatticeCells, type IsoSpan } from "@/lib/game/isoBoard";
import type { Level } from "@/lib/game/level/types";
import { floodReachable } from "@/lib/game/simulateLevel";
import { latticeWaterDepth } from "@/lib/game/terrain";
import type { CellCoord } from "@/lib/game/types";
import { createAppearanceContext } from "@/lib/rendering/cellAppearance";
import {
  boarPose,
  BOAR_FOOT,
  BOAR_FRAME_H,
  BOAR_FRAME_W,
  type BoarPlan,
} from "@/lib/rendering/boar";
import { isoCellCenter, isoMetrics, SPRITE_NATIVE } from "@/lib/rendering/isoTiles";
import { FLOWER_VARIANTS, waterSurfaceTint } from "@/lib/rendering/tileCatalog";
import { terrainKindAt, terrainViewFromLevel } from "@/lib/rendering/terrainView";
import { buildMarshWarmth } from "@/lib/rendering/waterWaves";
import { playSfx } from "@/lib/sound/bed";

type BridgePickup = {
  id: number;
  row: number;
  col: number;
  tint?: string;
};

type BoarThought = {
  id: number;
  text: string;
};

const THOUGHT_MS = 2400;

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
  onToggleBridge?: (row: number, col: number) => void;
  onCellClick?: (row: number, col: number) => void;
  mapLabels?: MapLabel[];
  /** CAP CONTAIN CELL SIZE — SMALLER = MORE ZOOMED OUT */
  maxContainCell?: number;
  /** WOOD BEZEL HUGGING THE GRID (NO INNER PAD) */
  framed?: boolean;
  /** SCALE UNTIL THE MAP COVERS THE FRAME. PADDING OCEAN CLIPS UNDER THE BORDER. */
  bleed?: boolean;
  /** PARENT OWNS THE EDGE */
  borderless?: boolean;
  /** DIAMOND HIT TARGETS. OFF FOR THUMBNAILS. */
  cells?: boolean;
  /** BOAR HIT TARGET. THE SPRITE STILL DRAWS. */
  boarClick?: boolean;
  /** DRAW THE BOAR AT level.start EVEN WHEN THE FLOWERS ARE HIDDEN. */
  showBoar?: boolean;
  /** LESSON HEARS THE POKE. THE YELLOW FLASH STILL HAPPENS. */
  onBoarClick?: () => void;
  /** STAYS IN HIS BUBBLE. A CLICK FLASHES REACH, IT DOES NOT REPLACE THE LINE. */
  boarLine?: string;
  /** WHEN SET, ONLY THESE CELLS TAKE A BRIDGE CLICK. THEY STAY YELLOW. */
  hintKeys?: ReadonlySet<string>;
  /** THE LOADING LAP RUNS EVEN WHEN THE VIEWER ASKED FOR LESS MOTION. */
  alwaysAnimate?: boolean;
  mapLabelsDraggable?: boolean;
  onMapLabelMove?: (id: string, row: number, col: number) => void;
};

const MAX_TILE = 64;
const MIN_TILE = 16;
const CONTAIN_MIN_TILE = 8;
const emptyWhirlpools = new Set<string>();
const TILE_STEP = 4;
const BOARD_PADDING = 24;
const BOARD_CARD_PADDING = 12;
const BOARD_CARD_BORDER = 1;

function boardCardPixelSize(
  tileWidth: number,
  rows: number,
  cols: number,
  iso: IsoSpan,
  bleed = false,
) {
  const board = isoMetrics(tileWidth, rows, cols, iso);
  if (bleed) {
    return { width: board.width, height: board.height };
  }
  const chrome = BOARD_CARD_PADDING * 2 + BOARD_CARD_BORDER * 2;
  return { width: board.width + chrome, height: board.height + chrome };
}

/** TILE WIDTH IN MULTIPLES OF 4 SO THE 2:1 DIAMOND LANDS ON WHOLE PIXELS */
function resolveTileWidth(
  width: number,
  height: number,
  rows: number,
  cols: number,
  iso: IsoSpan,
  sizing: "play" | "contain",
  maxContainCell = 512,
  bleed = false,
): number {
  const min = sizing === "contain" ? CONTAIN_MIN_TILE : MIN_TILE;
  const max = sizing === "contain" ? Math.max(min, maxContainCell) : MAX_TILE;
  if (width <= 0 || height <= 0) {
    return min;
  }
  let best = min;
  for (let tile = min; tile <= max; tile += TILE_STEP) {
    const card = boardCardPixelSize(tile, rows, cols, iso, bleed);
    const fits = card.width <= width && card.height <= height;
    if (bleed) {
      // SMALLEST TILE THAT COVERS THE FRAME. THE RIM PAST THE EDGE IS CLIPPED.
      if (card.width >= width && card.height >= height) {
        return tile;
      }
      best = tile;
      continue;
    }
    if (fits) {
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
  draftRoute: _draftRoute,
  onToggleBridge,
  onCellClick,
  mapLabels,
  maxContainCell = 512,
  framed = false,
  bleed = false,
  borderless = false,
  cells = true,
  boarClick = true,
  showBoar = false,
  onBoarClick,
  boarLine,
  hintKeys,
  alwaysAnimate = false,
  mapLabelsDraggable = false,
  onMapLabelMove,
}: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tileWidth, setTileWidth] = useState(() =>
    sizing === "contain" ? CONTAIN_MIN_TILE : MAX_TILE,
  );
  const [bleedPlace, setBleedPlace] = useState({ scale: 1, left: 0, top: 0 });
  const view = useMemo(() => {
    const base = terrainViewFromLevel(level);
    // HOME SHOWS THE BOAR WITHOUT TURNING HIS ISLAND INTO MUD.
    if (!showMission) {
      return { ...base, start: undefined };
    }
    return base;
  }, [level, showMission]);
  const splashId = useRef(0);
  const thoughtId = useRef(0);
  const lastThought = useRef(-1);
  const thoughtTimer = useRef(0);
  const flashRef = useRef<ReachFlash | null>(null);
  const hintRef = useRef<Set<string> | null>(null);
  hintRef.current = hintKeys ? new Set(hintKeys) : null;
  const [pickups, setPickups] = useState<BridgePickup[]>([]);
  const [thought, setThought] = useState<BoarThought | null>(null);
  const [bubbleRoot, setBubbleRoot] = useState<HTMLDivElement | null>(null);
  const depthAt = useMemo(
    () => latticeWaterDepth(view, level.iso),
    [view, level.iso],
  );
  const warmthAt = useMemo(() => buildMarshWarmth(view.seed), [view.seed]);

  const handleCellActivate = (row: number, col: number) => {
    if (!editable && bridges.has(cellKey(row, col))) {
      const kind = terrainKindAt(view, row, col);
      const tint =
        kind === "marsh"
          ? waterSurfaceTint("marsh", depthAt(row, col), warmthAt(row, col))
          : undefined;
      const id = splashId.current;
      splashId.current += 1;
      setPickups((prev) => [...prev, { id, row, col, tint }]);
    }
    if (editable) {
      onCellClick?.(row, col);
      return;
    }
    onToggleBridge?.(row, col);
  };
  const pokeBoar = () => {
    if (!level.start) {
      return;
    }
    if (
      !hintKeys &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      flashRef.current = {
        keys: floodReachable(level, bridges, level.start),
        beganAt: performance.now(),
      };
    }
    let index = Math.floor(Math.random() * BOAR_THOUGHTS.length);
    if (BOAR_THOUGHTS.length > 1 && index === lastThought.current) {
      index = (index + 1) % BOAR_THOUGHTS.length;
    }
    lastThought.current = index;
    const id = thoughtId.current + 1;
    thoughtId.current = id;
    if (!boarLine) {
      setThought({ id, text: BOAR_THOUGHTS[index]! });
    }
    playSfx("click");
    onBoarClick?.();
    window.clearTimeout(thoughtTimer.current);
    thoughtTimer.current = window.setTimeout(() => setThought(null), THOUGHT_MS);
  };

  useEffect(() => {
    return () => window.clearTimeout(thoughtTimer.current);
  }, []);
  const drawSpan = useMemo(
    () => (bleed ? bleedRimSpan(level.iso) : level.iso),
    [bleed, level.iso],
  );
  const metrics = useMemo(
    () => isoMetrics(tileWidth, level.rows, level.cols, drawSpan),
    [tileWidth, level.rows, level.cols, drawSpan],
  );
  const drawView = useMemo(
    () => (bleed ? { ...view, iso: drawSpan } : view),
    [bleed, view, drawSpan],
  );
  const playableCells = useMemo(
    () => isoLatticeCells(level.iso).filter((cell) => cell.role === "play"),
    [level.iso],
  );
  const boarRef = useRef<BoarPlan | null>(null);
  const boarWalkKey = useRef("");
  const boarPathKey = runPath.map((cell) => `${cell.row},${cell.col}`).join(";");
  const boarStartKey = level.start ? `${level.start.row},${level.start.col}` : "";
  const boarKey = `${boarStartKey}|${boarPathKey}`;
  const boarOn = Boolean(level.start) && (showMission || showBoar);
  if (!boarOn || !level.start) {
    boarRef.current = null;
    boarWalkKey.current = "";
  } else {
    const beganAt =
      boarWalkKey.current === boarKey && boarRef.current
        ? boarRef.current.beganAt
        : performance.now();
    boarWalkKey.current = boarKey;
    boarRef.current = {
      start: level.start,
      path: runPath,
      flowers: showMission
        ? [level.mission.x, level.mission.y, level.mission.z]
        : [],
      beganAt,
    };
  }

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

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const updateSize = () => {
      if (sizing === "contain") {
        // ROOM FOR WOOD BEZEL + OUTER RINGS WHEN framed
        const framePad = framed ? 14 : 0;
        const width = Math.max(1, element.clientWidth - framePad);
        const height = Math.max(1, element.clientHeight - framePad);
        const tile = resolveTileWidth(
          width,
          height,
          level.rows,
          level.cols,
          level.iso,
          sizing,
          maxContainCell,
          bleed,
        );
        setTileWidth(tile);
        if (bleed) {
          // SCALE FROM THE ORIGINAL MAP. THE EXTRA RIM SITS OUTSIDE IT AND GETS CLIPPED.
          const base = isoMetrics(tile, level.rows, level.cols, level.iso);
          const grown = isoMetrics(tile, level.rows, level.cols, bleedRimSpan(level.iso));
          const scale = Math.max(width / base.width, height / base.height);
          const dx = grown.originX - base.originX;
          const dy = grown.originY - base.originY;
          setBleedPlace({
            scale,
            left: (width - base.width * scale) / 2 - dx * scale,
            top: (height - base.height * scale) / 2 - dy * scale,
          });
        }
        return;
      }
      const width = element.clientWidth - BOARD_PADDING;
      const heightBudget = Math.min(window.innerHeight * 0.58, 640);
      setTileWidth(
        resolveTileWidth(
          width,
          heightBudget,
          level.rows,
          level.cols,
          level.iso,
          sizing,
        ),
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
  }, [level.rows, level.cols, level.iso, sizing, maxContainCell, framed, bleed]);

  const grid = (
    <div
      className="relative"
      style={{ width: metrics.width, height: metrics.height }}
    >
      <SpriteTerrainCanvas
        view={drawView}
        depthIso={level.iso}
        metrics={metrics}
        bridges={bridges}
        objectives={objectiveMarkers}
        whirlpools={emptyWhirlpools}
        boarRef={boarOn ? boarRef : undefined}
        flashRef={flashRef}
        hintRef={hintRef}
        hintMark={hintKeys ? [...hintKeys].sort().join("|") : ""}
        alwaysAnimate={alwaysAnimate}
      />
      {pickups.map((pickup) => (
        <BridgeSplash
          key={pickup.id}
          row={pickup.row}
          col={pickup.col}
          metrics={metrics}
          tint={pickup.tint}
          onDone={() =>
            setPickups((prev) => prev.filter((entry) => entry.id !== pickup.id))
          }
        />
      ))}
      {cells
        ? playableCells.map((cell) => (
            <CellView
              key={`${cell.row}-${cell.col}`}
              row={cell.row}
              col={cell.col}
              context={context}
              metrics={metrics}
              interactive={interactive}
              editable={editable}
              open={hintKeys == null || hintKeys.has(cellKey(cell.row, cell.col))}
              onToggle={handleCellActivate}
            />
          ))
        : null}
      {mapLabels && mapLabels.length > 0 ? (
        <MapLabelOverlay
          labels={mapLabels}
          metrics={metrics}
          draggable={mapLabelsDraggable}
          onMoveLabel={onMapLabelMove}
        />
      ) : null}
      {(showMission || showBoar) && level.start && boarClick ? (
        <BoarClick
          boarRef={boarRef}
          metrics={metrics}
          thought={boarLine ? { id: 0, text: boarLine } : thought}
          pinned={Boolean(boarLine)}
          bubbleRoot={boarLine ? bubbleRoot : null}
          bubbleAnchor={bleed ? bleedPlace : undefined}
          alwaysAnimate={alwaysAnimate}
          onClick={pokeBoar}
        />
      ) : null}
    </div>
  );

  if (bleed) {
    return (
      <div ref={containerRef} className="relative h-full min-h-0 w-full min-w-0">
        <div
          className={[
            "absolute inset-0 overflow-hidden bg-[rgb(12_48_92)]",
            borderless ? "" : "border border-black",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div
            className="absolute origin-top-left"
            style={{
              width: metrics.width,
              height: metrics.height,
              left: bleedPlace.left,
              top: bleedPlace.top,
              transform: `scale(${bleedPlace.scale})`,
            }}
          >
            {grid}
          </div>
        </div>
        <div
          ref={setBubbleRoot}
          className="pointer-events-none absolute inset-0 overflow-visible"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={
        sizing === "contain"
          ? "flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-hidden"
          : "w-full max-w-md lg:max-w-none lg:flex-1"
      }
    >
      {framed ? (
        <WoodFrame className="max-h-full max-w-full shrink-0">{grid}</WoodFrame>
      ) : (
        <div
          className={
            sizing === "contain"
              ? "max-h-full max-w-full shrink-0 border border-black bg-[rgb(12_48_92)] p-2"
              : "mx-auto w-fit max-w-full border border-black bg-[rgb(12_48_92)] p-2"
          }
        >
          {grid}
        </div>
      )}
    </div>
  );
}

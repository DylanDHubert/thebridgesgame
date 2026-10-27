"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import { BoarClick, BOAR_THOUGHTS } from "@/components/game/BoarClick";
import { BridgeCostPop } from "@/components/game/BridgeCostPop";
import { BridgeSplash } from "@/components/game/BridgeSplash";
import { CellView } from "@/components/game/CellView";
import { MapLabelOverlay, type MapLabel } from "@/components/game/MapLabelOverlay";
import type { DraftRoute } from "@/components/game/RouteCanvasOverlay";
import { SpriteTerrainCanvas, type ReachFlash } from "@/components/game/SpriteTerrainCanvas";
import { WoodFrame } from "@/components/ui/woodPlaque";
import { creatureHiding } from "@/lib/game/creatureHiding";
import { cellKey } from "@/lib/game/coords";
import { getPlaySettings } from "@/lib/settings";
import { bleedRimSpan, isoLatticeCells, type IsoSpan } from "@/lib/game/isoBoard";
import type { Level } from "@/lib/game/level/types";
import { bridgeCostAt, canPlaceBridgeAt } from "@/lib/game/rules";
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
import { runNow } from "@/lib/rendering/runClock";
import { playSfx } from "@/lib/sound/bed";

type BridgePickup = {
  id: number;
  row: number;
  col: number;
  tint?: string;
};

type CostPop = {
  id: number;
  row: number;
  col: number;
  cost: number;
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
  /** CHECK FLOOD. GOLD IS IN REACH. GREEN MEANS HE CAN BE SENT. RED IS NOT. */
  reach?: {
    id: number;
    gold: readonly string[];
    red: readonly string[];
    origin: CellCoord;
    ready: boolean;
  } | null;
  /** A CLICK ON THE BOAR RUNS THE CHECK. HE STILL GRUNTS AND TALKS. */
  pokeChecks?: boolean;
  /** BUMP TO GRUNT AND TALK. THE CHECK BUTTON USES THIS. */
  boarCue?: number;
  /** WHEN SET, ONLY THESE CELLS TAKE A BRIDGE CLICK. THEY STAY YELLOW. */
  hintKeys?: ReadonlySet<string>;
  /** LAND CELLS THAT STILL TAKE A CLICK. HOME MENU ISLANDS. */
  pressKeys?: ReadonlySet<string>;
  /** FALSE KEEPS THE YELLOW AND STILL LETS EVERY CELL BE CLICKED. THE EDITOR USES THIS. */
  hintLocks?: boolean;
  /** THE LOADING LAP RUNS EVEN WHEN THE VIEWER ASKED FOR LESS MOTION. */
  alwaysAnimate?: boolean;
  /** OFF WHILE A LEVEL IS BEING MADE. PLAY USES THE ONE-IN-EIGHT HIDING. */
  creatures?: boolean;
  mapLabelsDraggable?: boolean;
  onMapLabelMove?: (id: string, row: number, col: number) => void;
  onMapLabelSelect?: (id: string) => void;
  /** FILLED WITH A GRAB OF THE BOARD AS IT IS DRAWN, CROP AND ALL. */
  stillRef?: RefObject<StillGrab | null>;
  /** THE MAP CANVAS HAS ITS FIRST FRAME. */
  onStill?: () => void;
};

/** PNG OF THE VISIBLE BOARD. */
export type StillGrab = () => Promise<Blob | null>;

const THUMB_LONG = 640;

function captureBoard(
  view: HTMLDivElement | null,
  place: { scale: number; left: number; top: number },
  metrics: { width: number; height: number },
  bleed: boolean,
): Promise<Blob | null> {
  if (!view) {
    return Promise.resolve(null);
  }
  const canvases = view.querySelectorAll("canvas");
  const map = canvases[0];
  const boar = canvases[canvases.length - 1];
  if (!map || map.width === 0) {
    return Promise.resolve(null);
  }
  const srcW = Math.max(1, view.clientWidth);
  const srcH = Math.max(1, view.clientHeight);
  const fit = THUMB_LONG / Math.max(srcW, srcH);
  const width = Math.max(1, Math.round(srcW * fit));
  const height = Math.max(1, Math.round(srcH * fit));
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) {
    return Promise.resolve(null);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "rgb(12, 48, 92)";
  ctx.fillRect(0, 0, width, height);
  const draw = (source: HTMLCanvasElement, dx: number, dy: number, dw: number, dh: number) => {
    ctx.drawImage(source, dx * fit, dy * fit, dw * fit, dh * fit);
  };
  if (bleed) {
    draw(map, place.left, place.top, metrics.width * place.scale, metrics.height * place.scale);
    if (boar && boar !== map) {
      draw(boar, place.left, place.top, metrics.width * place.scale, metrics.height * place.scale);
    }
  } else {
    draw(map, 0, 0, srcW, srcH);
    if (boar && boar !== map) {
      draw(boar, 0, 0, srcW, srcH);
    }
  }
  // A BLANK OCEAN FILL IS ONE COLOR. AN ISLAND HAS MORE THAN THAT.
  const probes = [
    [0.5, 0.5],
    [0.35, 0.42],
    [0.65, 0.58],
    [0.5, 0.28],
    [0.5, 0.72],
  ];
  const seen = new Set<string>();
  for (const [fx, fy] of probes) {
    const x = Math.min(width - 1, Math.max(0, Math.floor(width * fx)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(height * fy)));
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    seen.add(`${pixel[0]},${pixel[1]},${pixel[2]}`);
  }
  if (seen.size < 2) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    out.toBlob((blob) => resolve(blob), "image/png");
  });
}

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
  reach = null,
  pokeChecks = false,
  boarCue = 0,
  hintKeys,
  pressKeys,
  hintLocks = true,
  alwaysAnimate = false,
  creatures = true,
  mapLabelsDraggable = false,
  onMapLabelMove,
  onMapLabelSelect,
  stillRef,
  onStill,
}: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // TRUE AFTER THE FRAME HAS BEEN MEASURED. THE FIRST PAINT IS OFTEN UNSCALED.
  const placed = useRef(false);
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
  const hiding = useMemo(
    () => (creatures ? creatureHiding(level) : null),
    [creatures, level],
  );
  const splashId = useRef(0);
  const costId = useRef(0);
  const thoughtId = useRef(0);
  const lastThought = useRef(-1);
  const thoughtTimer = useRef(0);
  const flashRef = useRef<ReachFlash | null>(null);
  const seenReach = useRef(0);
  if (!reach) {
    seenReach.current = 0;
    flashRef.current = null;
  } else if (reach.id !== seenReach.current) {
    seenReach.current = reach.id;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cells: ReachFlash["cells"] = [];
    let maxDist = 0;
    const push = (keys: readonly string[], red: boolean) => {
      for (const key of keys) {
        const [row, col] = key.split(",").map(Number) as [number, number];
        const dist =
          Math.abs(row - reach.origin.row) + Math.abs(col - reach.origin.col);
        maxDist = Math.max(maxDist, dist);
        cells.push({ key, dist, red });
      }
    };
    push(reach.gold, false);
    push(reach.red, true);
    flashRef.current = {
      beganAt: performance.now(),
      cells,
      maxDist,
      stepMs: reduced ? 0 : 12,
      fadeScale: getPlaySettings().checkFade === "slow" ? 4 : 1,
      ready: reach.ready,
    };
  }
  const hintRef = useRef<Set<string> | null>(null);
  hintRef.current = hintKeys ? new Set(hintKeys) : null;
  const [pickups, setPickups] = useState<BridgePickup[]>([]);
  const [costs, setCosts] = useState<CostPop[]>([]);
  const [thought, setThought] = useState<BoarThought | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [bubbleRoot, setBubbleRoot] = useState<HTMLDivElement | null>(null);
  const depthAt = useMemo(
    () => latticeWaterDepth(view, level.iso),
    [view, level.iso],
  );
  const warmthAt = useMemo(() => buildMarshWarmth(view.seed), [view.seed]);

  const handleCellActivate = (row: number, col: number) => {
    const key = cellKey(row, col);
    const placed = bridges.has(key);
    if (!editable && placed) {
      const kind = terrainKindAt(view, row, col);
      const tint =
        kind === "marsh"
          ? waterSurfaceTint("marsh", depthAt(row, col), warmthAt(row, col))
          : undefined;
      const id = splashId.current;
      splashId.current += 1;
      setPickups((prev) => [...prev, { id, row, col, tint }]);
    }
    if (!editable && canPlaceBridgeAt(level, row, col)) {
      const amount = bridgeCostAt(level, row, col);
      if (amount > 0) {
        const id = costId.current;
        costId.current += 1;
        setCosts((prev) => [
          ...prev,
          { id, row, col, cost: placed ? -amount : amount },
        ]);
      }
    }
    if (editable) {
      onCellClick?.(row, col);
      return;
    }
    onToggleBridge?.(row, col);
  };
  const grunt = () => {
    if (!level.start) {
      return;
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
    window.clearTimeout(thoughtTimer.current);
    thoughtTimer.current = window.setTimeout(() => setThought(null), THOUGHT_MS);
  };
  const gruntRef = useRef(grunt);
  gruntRef.current = grunt;
  const heardCue = useRef(0);
  useEffect(() => {
    if (!boarCue || boarCue === heardCue.current) {
      return;
    }
    heardCue.current = boarCue;
    gruntRef.current();
  }, [boarCue]);
  const pokeBoar = () => {
    if (!level.start) {
      return;
    }
    if (
      showMission &&
      !pokeChecks &&
      !hintKeys &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const keys = floodReachable(level, bridges, level.start);
      flashRef.current = {
        beganAt: performance.now(),
        cells: [...keys].map((key) => ({ key, dist: 0, red: false })),
        maxDist: 0,
        stepMs: 0,
        fadeScale: 1,
        ready: false,
      };
    }
    grunt();
    onBoarClick?.();
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
        : runNow();
    boarWalkKey.current = boarKey;
    boarRef.current = {
      start: level.start,
      path: runPath,
      flowers: showMission
        ? [level.mission.x, level.mission.y, level.mission.z]
        : [],
      beganAt,
      level,
      bridges,
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
        placed.current = width >= 8 && height >= 8;
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
      placed.current = element.clientWidth >= 8 && element.clientHeight >= 8;
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

  if (stillRef) {
    stillRef.current = () => {
      if (!placed.current) {
        return Promise.resolve(null);
      }
      return captureBoard(containerRef.current, bleedPlace, metrics, bleed);
    };
  }

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
        hiding={hiding}
        boarRef={boarOn ? boarRef : undefined}
        flashRef={flashRef}
        hintRef={hintRef}
        hintMark={hintKeys ? [...hintKeys].sort().join("|") : ""}
        flashMark={reach?.id ?? 0}
        hoverKey={hoverKey}
        alwaysAnimate={alwaysAnimate}
        onStill={onStill}
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
      {costs.map((pop) => {
        const center = isoCellCenter(pop.row, pop.col, metrics);
        const at = bleed
          ? {
              left: bleedPlace.left + center.x * bleedPlace.scale,
              top: bleedPlace.top + center.y * bleedPlace.scale,
            }
          : { left: center.x, top: center.y };
        const mark = (
          <BridgeCostPop
            left={at.left}
            top={at.top}
            cost={pop.cost}
            onDone={() =>
              setCosts((prev) => prev.filter((entry) => entry.id !== pop.id))
            }
          />
        );
        if (bleed && bubbleRoot) {
          return (
            <Fragment key={pop.id}>{createPortal(mark, bubbleRoot)}</Fragment>
          );
        }
        return <Fragment key={pop.id}>{mark}</Fragment>;
      })}
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
              open={
                !hintLocks || hintKeys == null || hintKeys.has(cellKey(cell.row, cell.col))
              }
              pressable={pressKeys?.has(cellKey(cell.row, cell.col)) ?? false}
              onToggle={handleCellActivate}
              onHover={setHoverKey}
            />
          ))
        : null}
      {mapLabels && mapLabels.length > 0 ? (
        <MapLabelOverlay
          labels={mapLabels}
          metrics={metrics}
          draggable={mapLabelsDraggable}
          onMoveLabel={onMapLabelMove}
          onSelect={onMapLabelSelect}
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

"use client";

import { useEffect, useId, useRef, type RefObject } from "react";

import { cellKey } from "@/lib/game/coords";
import { isoLatticeCells, type IsoSpan } from "@/lib/game/isoBoard";
import { latticeWaterDepth } from "@/lib/game/terrain";
import {
  allBoarFrameSrcs,
  boarFrameSrc,
  boarPlace,
  boarPose,
  BOAR_FOOT,
  boarSink,
  BOAR_FRAME_H,
  BOAR_FRAME_W,
  type BoarPlan,
} from "@/lib/rendering/boar";
import { isoCellTop, isoSpriteOrigin, SPRITE_NATIVE, type IsoMetrics } from "@/lib/rendering/isoTiles";
import { playSfx, setWalker } from "@/lib/sound/bed";
import {
  BRIDGE_MARSH,
  BRIDGE_WOOD,
  CLIFF_STONE_LIFT,
  FLOWER_BED,
  oceanSprite,
  terrainLayers,
  waterSurfaceTint,
  type SpriteLayer,
} from "@/lib/rendering/tileCatalog";
import type { TerrainView } from "@/lib/rendering/terrainView";
import { grassKeysOnStartIsland, terrainKindAt } from "@/lib/rendering/terrainView";
import {
  animatedWaterDepth,
  buildMarshWarmth,
  buildWaterWaveField,
} from "@/lib/rendering/waterWaves";

type ObjectiveMarker = {
  row: number;
  col: number;
  src: string;
};

type PaintedLayer = SpriteLayer & {
  water?: { kind: "ocean" | "marsh"; depth: number; warmth: number };
};

type SpriteTerrainCanvasProps = {
  view: TerrainView;
  /** PLAYABLE SPAN FOR THE DEPTH CEILING. THE DRAW SPAN MAY INCLUDE THE BLEED RIM. */
  depthIso?: IsoSpan;
  metrics: IsoMetrics;
  bridges: Set<string>;
  objectives: ObjectiveMarker[];
  whirlpools: Set<string>;
  /** READ EACH PAINT. NULL ON THE HOME MAP. */
  boarRef?: RefObject<BoarPlan | null>;
  /** YELLOW WASH ON REACHABLE TILES. THE BOAR IS PUNCHED OUT SO HE STAYS ON TOP. */
  flashRef?: RefObject<ReachFlash | null>;
  /** STEADY YELLOW ON THE CELL THE LESSON WANTS CLICKED. */
  hintRef?: RefObject<Set<string> | null>;
  /** CHANGES WHEN THE HINT CELLS CHANGE, SO THE WASH REPAINTS. */
  hintMark?: string;
  /** BUMPED WHEN A RED MISS FLASH SHOULD PAINT, INCLUDING REDUCED MOTION. */
  flashMark?: number;
  /** KEEP THE RUN GOING. THE LOADING LAP DOES NOT HONOR REDUCED MOTION. */
  alwaysAnimate?: boolean;
};

/** ONE CELL IN THE CHECK FLOOD. DISTANCE IS MANHATTAN FROM THE BOAR. */
export type ReachCell = {
  key: string;
  dist: number;
  red: boolean;
};

/** GOLD AND RED SPREAD OUT FROM THE BOAR, THEN FADE TOGETHER. */
export type ReachFlash = {
  beganAt: number;
  cells: ReachCell[];
  maxDist: number;
  stepMs: number;
};

const FLASH_ALPHA = 0.62;
const FLASH_TAIL_MS = 700;

function flashLifetime(flash: ReachFlash): number {
  return flash.maxDist * flash.stepMs + FLASH_TAIL_MS;
}

let washCanvas: HTMLCanvasElement | null = null;

/**
 * YELLOW DIAMONDS. A HINT STAYS. A REACH FLASH FADES.
 * THE BOAR'S OPAQUE PIXELS ARE CUT OUT SO THE WASH SITS UNDER HIM.
 */
function paintReachFlash(
  ctx: CanvasRenderingContext2D,
  metrics: IsoMetrics,
  hints: Set<string> | null,
  flash: ReachFlash | null,
  place: { x: number; y: number } | null,
  facing: keyof typeof BOAR_FOOT | null,
  boarImage: CanvasImageSource | undefined,
  scale: number,
) {
  const hinting = Boolean(hints && hints.size > 0);
  const age = flash ? performance.now() - flash.beganAt : 0;
  const alive = Boolean(flash && age >= 0 && age < flashLifetime(flash));
  if (!hinting && !alive) {
    return;
  }

  const width = Math.max(1, Math.round(metrics.width));
  const height = Math.max(1, Math.round(metrics.height));
  if (!washCanvas) {
    washCanvas = document.createElement("canvas");
  }
  if (washCanvas.width !== width || washCanvas.height !== height) {
    washCanvas.width = width;
    washCanvas.height = height;
  }
  const wash = washCanvas.getContext("2d");
  if (!wash) {
    return;
  }
  wash.setTransform(1, 0, 0, 1, 0, 0);
  wash.clearRect(0, 0, width, height);
  wash.globalCompositeOperation = "source-over";
  const fillDiamonds = (keys: Set<string>, alpha: number, red = false) => {
    wash.fillStyle = red
      ? `rgba(239, 68, 68, ${alpha})`
      : `rgba(251, 191, 36, ${alpha})`;
    for (const key of keys) {
      const [row, col] = key.split(",").map(Number) as [number, number];
      const top = isoCellTop(row, col, metrics);
      wash.beginPath();
      wash.moveTo(top.x, top.y);
      wash.lineTo(top.x + metrics.halfW, top.y + metrics.halfH);
      wash.lineTo(top.x, top.y + metrics.halfH * 2);
      wash.lineTo(top.x - metrics.halfW, top.y + metrics.halfH);
      wash.closePath();
      wash.fill();
    }
  };
  if (hints && hinting) {
    fillDiamonds(hints, 0.5);
  }
  if (flash && alive) {
    const fadeStart = flash.maxDist * flash.stepMs + 280;
    const fade =
      age < fadeStart ? 1 : Math.max(0, 1 - (age - fadeStart) / 420);
    const gold = new Set<string>();
    const red = new Set<string>();
    for (const cell of flash.cells) {
      if (age < cell.dist * flash.stepMs) {
        continue;
      }
      if (cell.red) {
        red.add(cell.key);
      } else {
        gold.add(cell.key);
      }
    }
    if (gold.size > 0) {
      fillDiamonds(gold, FLASH_ALPHA * fade);
    }
    if (red.size > 0) {
      fillDiamonds(red, FLASH_ALPHA * fade, true);
    }
  }
  if (place && facing && boarImage) {
    const foot = BOAR_FOOT[facing];
    const sink = boarSink(metrics.halfH * 2);
    wash.globalCompositeOperation = "destination-out";
    wash.drawImage(
      boarImage,
      place.x - foot.x * scale,
      place.y - foot.y * scale + sink,
      BOAR_FRAME_W * scale,
      BOAR_FRAME_H * scale,
    );
  }
  ctx.drawImage(washCanvas, 0, 0);
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const tintCache = new Map<string, HTMLCanvasElement>();

/** COLOR WASH ON WATER. ONLY THE SPRITE'S OPAQUE PIXELS CHANGE. */
function tintedSprite(
  image: HTMLImageElement,
  src: string,
  tint: string,
): CanvasImageSource {
  const key = `${src}|${tint}`;
  const cached = tintCache.get(key);
  if (cached) {
    return cached;
  }
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const tintContext = canvas.getContext("2d");
  if (!tintContext) {
    return image;
  }
  tintContext.drawImage(image, 0, 0);
  tintContext.globalCompositeOperation = "source-atop";
  tintContext.fillStyle = tint;
  tintContext.fillRect(0, 0, canvas.width, canvas.height);
  tintCache.set(key, canvas);
  return canvas;
}

function loadSprite(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) {
    return cached;
  }
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`SPRITE FAILED ${src}`));
    image.src = src;
  });
  imageCache.set(src, pending);
  return pending;
}

/** BRIDGE REPLACES THE CELL. THE OUTER TWO ISO LAYERS ARE OPEN WATER. */
function layersForCell(
  view: TerrainView,
  bridges: Set<string>,
  objectiveSrc: Map<string, string>,
  whirlpools: Set<string>,
  row: number,
  col: number,
  padding: boolean,
  depthAt: (row: number, col: number) => number,
  warmthAt: (row: number, col: number) => number,
  mudKeys: Set<string>,
): PaintedLayer[] {
  const key = cellKey(row, col);
  const whirlpool = whirlpools.has(key);

  if (padding) {
    return [
      {
        src: oceanSprite(view, row, col, false),
        lift: 0,
        water: { kind: "ocean", depth: depthAt(row, col), warmth: 0 },
      },
    ];
  }

  const layers: PaintedLayer[] = [];

  if (bridges.has(key)) {
    const kind = terrainKindAt(view, row, col);
    layers.push({
      src: kind === "marsh" ? BRIDGE_MARSH : BRIDGE_WOOD,
      lift: 0,
    });
  } else if (objectiveSrc.has(key)) {
    layers.push({ src: FLOWER_BED, lift: 0 });
  } else {
    const kind = terrainKindAt(view, row, col);
    if (kind) {
      const painted = terrainLayers(kind, view, row, col, whirlpool, mudKeys.has(key));
      if ((kind === "ocean" || kind === "marsh") && !whirlpool) {
        const water = {
          kind,
          depth: depthAt(row, col),
          warmth: kind === "marsh" ? warmthAt(row, col) : 0,
        };
        layers.push(...painted.map((layer) => ({ ...layer, water })));
      } else {
        layers.push(...painted);
      }
    }
  }

  const flower = objectiveSrc.get(key);
  if (flower) {
    layers.push({ src: flower, lift: CLIFF_STONE_LIFT });
  }
  return layers;
}

export function SpriteTerrainCanvas({
  view,
  depthIso,
  metrics,
  bridges,
  objectives,
  whirlpools,
  boarRef,
  flashRef,
  hintRef,
  hintMark = "",
  flashMark = 0,
  alwaysAnimate = false,
}: SpriteTerrainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const walkId = useId();
  const heardEat = useRef(new Set<string>());
  const eatBegan = useRef(0);

  // BACK TO FRONT SO EACH FRONT FACE COVERS THE TILE BEHIND
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let cancelled = false;

    const objectiveSrc = new Map(
      objectives.map((marker) => [cellKey(marker.row, marker.col), marker.src]),
    );
    const depthAt = latticeWaterDepth(view, depthIso ?? view.iso);
    const waves = buildWaterWaveField(view.seed, view.iso);
    const warmthAt = buildMarshWarmth(view.seed);
    const mudKeys = grassKeysOnStartIsland(view.terrain, view.rows, view.cols, view.start);
    const placements: { row: number; col: number; layers: PaintedLayer[] }[] = [];
    for (const cell of isoLatticeCells(view.iso)) {
      const layers = layersForCell(
        view,
        bridges,
        objectiveSrc,
        whirlpools,
        cell.row,
        cell.col,
        cell.role === "pad",
        depthAt,
        warmthAt,
        mudKeys,
      );
      if (layers.length > 0) {
        placements.push({ row: cell.row, col: cell.col, layers });
      }
    }
    const sources = [
      ...new Set([
        ...placements.flatMap((cell) => cell.layers.map((layer) => layer.src)),
        ...(boarRef ? allBoarFrameSrcs() : []),
      ]),
    ];

    let frame = 0;

    Promise.all(
      sources.map(async (src) => {
        try {
          return [src, await loadSprite(src)] as const;
        } catch (error: unknown) {
          console.error("[journeyman:sprites]", error);
          return null;
        }
      }),
    ).then((loaded) => {
      if (cancelled) {
        return;
      }
      const bySrc = new Map(
        loaded.filter((entry) => entry !== null),
      );
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(metrics.width * dpr));
      canvas.height = Math.max(1, Math.round(metrics.height * dpr));
      ctx.imageSmoothingEnabled = false;
      const scale = metrics.tileWidth / SPRITE_NATIVE;

      const reduceMotion =
        !alwaysAnimate &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const paint = (time: number) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, metrics.width, metrics.height);
        const plan = boarRef?.current;
        const pose = plan ? boarPose(plan, performance.now(), reduceMotion) : null;
        if (pose && plan) {
          if (eatBegan.current !== plan.beganAt) {
            eatBegan.current = plan.beganAt;
            heardEat.current = new Set();
          }
          setWalker(walkId, pose.anim === "run");
          for (const key of pose.eaten) {
            if (!heardEat.current.has(key)) {
              heardEat.current.add(key);
              playSfx("eat");
            }
          }
        } else {
          setWalker(walkId, false);
        }
        const boarImage = pose
          ? bySrc.get(boarFrameSrc(pose.facing, pose.anim, pose.frame))
          : undefined;
        const place = pose ? boarPlace(pose, metrics) : null;
        for (const cell of placements) {
          const origin = isoSpriteOrigin(cell.row, cell.col, metrics);
          const key = cellKey(cell.row, cell.col);
          const flowerSrc = objectiveSrc.get(key);
          for (const layer of cell.layers) {
            if (flowerSrc && layer.src === flowerSrc && pose?.eaten.has(key)) {
              continue;
            }
            const image = bySrc.get(layer.src);
            if (!image) {
              continue;
            }
            const tint = layer.water
              ? waterSurfaceTint(
                  layer.water.kind,
                  animatedWaterDepth(
                    waves,
                    layer.water.depth,
                    cell.row,
                    cell.col,
                    time,
                  ),
                  layer.water.warmth,
                )
              : layer.tint;
            const sprite = tint ? tintedSprite(image, layer.src, tint) : image;
            ctx.drawImage(
              sprite,
              origin.x,
              origin.y - layer.lift * scale,
              metrics.tileWidth,
              metrics.tileWidth,
            );
          }
          if (
            pose &&
            place &&
            boarImage &&
            cell.row === place.row &&
            cell.col === place.col
          ) {
            const foot = BOAR_FOOT[pose.facing];
            const sink = boarSink(metrics.halfH * 2);
            ctx.drawImage(
              boarImage,
              place.x - foot.x * scale,
              place.y - foot.y * scale + sink,
              BOAR_FRAME_W * scale,
              BOAR_FRAME_H * scale,
            );
          }
        }
        paintReachFlash(
          ctx,
          metrics,
          hintRef?.current ?? null,
          flashRef?.current ?? null,
          place,
          pose?.facing ?? null,
          boarImage,
          scale,
        );
      };

      paint(0);
      if (reduceMotion) {
        return;
      }

      let last = 0;
      const tick = (now: number) => {
        if (cancelled) {
          return;
        }
        frame = requestAnimationFrame(tick);
        const flash = flashRef?.current;
        const flashing = Boolean(
          flash && now - flash.beganAt < flashLifetime(flash),
        );
        if (document.hidden || (!flashing && now - last < 80)) {
          return;
        }
        last = now;
        paint(now / 1000);
      };
      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      setWalker(walkId, false);
    };
  }, [view, depthIso, metrics, bridges, objectives, whirlpools, boarRef, flashRef, hintRef, hintMark, flashMark, alwaysAnimate, walkId]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0"
      style={{
        width: metrics.width,
        height: metrics.height,
        imageRendering: "pixelated",
      }}
    />
  );
}

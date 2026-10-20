"use client";

import { useEffect, useRef, type RefObject } from "react";

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
import { isoSpriteOrigin, SPRITE_NATIVE, type IsoMetrics } from "@/lib/rendering/isoTiles";
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
};

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
}: SpriteTerrainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const paint = (time: number) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, metrics.width, metrics.height);
        const plan = boarRef?.current;
        const pose = plan ? boarPose(plan, performance.now(), reduceMotion) : null;
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
        if (document.hidden || now - last < 80) {
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
    };
  }, [view, depthIso, metrics, bridges, objectives, whirlpools, boarRef]);

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

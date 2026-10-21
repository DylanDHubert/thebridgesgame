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
import { isoSpriteOrigin, SPRITE_NATIVE, type IsoMetrics } from "@/lib/rendering/isoTiles";
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
  /** CELL UNDER THE POINTER. TINTED WHITE ON ITS SPRITE. */
  hoverKey?: string | null;
  /** KEEP THE RUN GOING. THE LOADING LAP DOES NOT HONOR REDUCED MOTION. */
  alwaysAnimate?: boolean;
  /** FIRST FRAME OF THIS SCENE IS ON THE MAP CANVAS. */
  onStill?: () => void;
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

const FLASH_ALPHA = 0.55;
const HOVER_ALPHA = 0.4;
const HINT_ALPHA = 0.5;
const FLASH_TAIL_MS = 700;
const WATER_TICK_MS = 80;
const OPAQUE = 16;

const LAYER_CLASS = "pointer-events-none absolute left-0 top-0";

function flashLifetime(flash: ReachFlash): number {
  return flash.maxDist * flash.stepMs + FLASH_TAIL_MS;
}

function flashFade(flash: ReachFlash, age: number): number {
  const fadeStart = flash.maxDist * flash.stepMs + 280;
  if (age < fadeStart) {
    return 1;
  }
  return Math.max(0, 1 - (age - fadeStart) / 420);
}

type CssBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Placement = {
  row: number;
  col: number;
  key: string;
  index: number;
  pad: boolean;
  layers: PaintedLayer[];
  box: CssBox;
};

type DeviceRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type MaskCell = {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** FRONT TILE WINS EACH PIXEL. 0 IS EMPTY. */
type BoardMask = {
  width: number;
  height: number;
  ids: Uint16Array;
  cells: Map<string, MaskCell>;
};

type CellPlate = {
  canvas: HTMLCanvasElement;
  offsetY: number;
};

let scratch: HTMLCanvasElement | null = null;

function scratchContext(size: number): CanvasRenderingContext2D | null {
  if (!scratch) {
    scratch = document.createElement("canvas");
  }
  if (scratch.width !== size || scratch.height !== size) {
    scratch.width = size;
    scratch.height = size;
  }
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size, size);
  return ctx;
}

function rgbOf(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** OPAQUE SPRITE PIXELS CLAIM THE CELL. A LATER CELL OVERWRITES THEM. */
function intersects(a: CssBox, b: CssBox): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

function unionBox(a: CssBox, b: CssBox): CssBox {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.left + a.width, b.left + b.width);
  const bottom = Math.max(a.top + a.height, b.top + b.height);
  return { left, top, width: right - left, height: bottom - top };
}

function deviceRect(box: CssBox, dpr: number, bitmapW: number, bitmapH: number): DeviceRect {
  const x = Math.max(0, Math.floor(box.left * dpr));
  const y = Math.max(0, Math.floor(box.top * dpr));
  const right = Math.min(bitmapW, Math.ceil((box.left + box.width) * dpr));
  const bottom = Math.min(bitmapH, Math.ceil((box.top + box.height) * dpr));
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
}

function coverLayer(
  ids: Uint16Array,
  width: number,
  height: number,
  index: number,
  image: CanvasImageSource,
  cssX: number,
  cssY: number,
  cssSize: number,
  dpr: number,
  clip?: DeviceRect,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const size = Math.max(1, Math.round(cssSize * dpr));
  const ctx = scratchContext(size);
  if (!ctx) {
    return null;
  }
  ctx.drawImage(image, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const ox = Math.round(cssX * dpr);
  const oy = Math.round(cssY * dpr);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let ly = 0; ly < size; ly += 1) {
    const y = oy + ly;
    if (y < 0 || y >= height) {
      continue;
    }
    for (let lx = 0; lx < size; lx += 1) {
      if (data[(ly * size + lx) * 4 + 3] < OPAQUE) {
        continue;
      }
      const x = ox + lx;
      if (x < 0 || x >= width) {
        continue;
      }
      if (clip && (x < clip.x || y < clip.y || x >= clip.x + clip.w || y >= clip.y + clip.h)) {
        continue;
      }
      ids[y * width + x] = index;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

function clearIds(mask: BoardMask, rect: DeviceRect) {
  const x1 = Math.max(0, rect.x);
  const y1 = Math.max(0, rect.y);
  const x2 = Math.min(mask.width, rect.x + rect.w);
  const y2 = Math.min(mask.height, rect.y + rect.h);
  for (let y = y1; y < y2; y += 1) {
    const row = y * mask.width;
    mask.ids.fill(0, row + x1, row + x2);
  }
}

/** COLOR ONLY THE PIXELS THIS CELL STILL OWNS. */
function tintCell(
  ctx: CanvasRenderingContext2D,
  mask: BoardMask,
  key: string,
  color: string,
  alpha: number,
) {
  const cell = mask.cells.get(key);
  if (!cell || cell.w <= 0 || cell.h <= 0) {
    return;
  }
  const x = Math.max(0, cell.x);
  const y = Math.max(0, cell.y);
  const w = Math.min(cell.w, mask.width - x);
  const h = Math.min(cell.h, mask.height - y);
  if (w <= 0 || h <= 0) {
    return;
  }
  const image = ctx.getImageData(x, y, w, h);
  const pix = image.data;
  const [red, green, blue] = rgbOf(color);
  const ink = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  for (let ly = 0; ly < h; ly += 1) {
    const row = (y + ly) * mask.width;
    for (let lx = 0; lx < w; lx += 1) {
      if (mask.ids[row + x + lx] !== cell.index) {
        continue;
      }
      const p = (ly * w + lx) * 4;
      pix[p] = red;
      pix[p + 1] = green;
      pix[p + 2] = blue;
      pix[p + 3] = ink;
    }
  }
  ctx.putImageData(image, x, y);
}

function fitBitmap(canvas: HTMLCanvasElement, width: number, height: number) {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
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
  hoverKey = null,
  alwaysAnimate = false,
  onStill,
}: SpriteTerrainCanvasProps) {
  const mapRef = useRef<HTMLCanvasElement>(null);
  const flashLayerRef = useRef<HTMLCanvasElement>(null);
  const markLayerRef = useRef<HTMLCanvasElement>(null);
  const boarLayerRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<BoardMask | null>(null);
  const bridgesRef = useRef(bridges);
  const paintMarksRef = useRef<() => void>(() => {});
  const startFlashRef = useRef<() => void>(() => {});
  const patchBridgesRef = useRef<(next: Set<string>) => void>(() => {});
  const onStillRef = useRef(onStill);
  bridgesRef.current = bridges;
  onStillRef.current = onStill;
  const walkId = useId();
  const heardEat = useRef(new Set<string>());
  const eatBegan = useRef(0);
  const layerStyle = {
    width: metrics.width,
    height: metrics.height,
    imageRendering: "pixelated" as const,
  };

  // BACK TO FRONT SO EACH FRONT FACE COVERS THE TILE BEHIND
  useEffect(() => {
    const canvas = mapRef.current;
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
    const scale = metrics.tileWidth / SPRITE_NATIVE;
    const placements: Placement[] = [];
    const byKey = new Map<string, Placement>();

    const spriteBox = (
      row: number,
      col: number,
      layers: PaintedLayer[],
      eaten: ReadonlySet<string>,
    ): CssBox => {
      const origin = isoSpriteOrigin(row, col, metrics);
      const tile = metrics.tileWidth;
      let top = origin.y;
      let bottom = origin.y + tile;
      const flowerSrc = objectiveSrc.get(cellKey(row, col));
      for (const layer of layers) {
        if (flowerSrc && layer.src === flowerSrc && eaten.has(cellKey(row, col))) {
          continue;
        }
        const y = origin.y - layer.lift * scale;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y + tile);
      }
      return { left: origin.x, top, width: tile, height: bottom - top };
    };

    const fillPlacements = (bridgeSet: Set<string>, eaten: ReadonlySet<string>) => {
      placements.length = 0;
      byKey.clear();
      let index = 1;
      for (const cell of isoLatticeCells(view.iso)) {
        const key = cellKey(cell.row, cell.col);
        const layers = layersForCell(
          view,
          bridgeSet,
          objectiveSrc,
          whirlpools,
          cell.row,
          cell.col,
          cell.role === "pad",
          depthAt,
          warmthAt,
          mudKeys,
        );
        if (layers.length === 0) {
          continue;
        }
        const placed: Placement = {
          row: cell.row,
          col: cell.col,
          key,
          index,
          pad: cell.role === "pad",
          layers,
          box: spriteBox(cell.row, cell.col, layers, eaten),
        };
        placements.push(placed);
        byKey.set(key, placed);
        index += 1;
      }
    };

    fillPlacements(bridgesRef.current, new Set());
    const sources = [
      ...new Set([
        ...placements.flatMap((cell) => cell.layers.map((layer) => layer.src)),
        BRIDGE_WOOD,
        BRIDGE_MARSH,
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
      const bitmapW = Math.max(1, Math.round(metrics.width * dpr));
      const bitmapH = Math.max(1, Math.round(metrics.height * dpr));
      ctx.imageSmoothingEnabled = false;

      const reduceMotion =
        !alwaysAnimate &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      fillPlacements(bridgesRef.current, new Set());
      const plates = new Map<string, CellPlate>();
      let eatenNow: ReadonlySet<string> = new Set();
      let eatenCount = 0;
      let mapTime = 0;
      let applied = new Set(bridgesRef.current);

      const bakePlate = (key: string, layers: PaintedLayer[], eaten: ReadonlySet<string>) => {
        const flowerSrc = objectiveSrc.get(key);
        const tile = Math.max(1, Math.round(metrics.tileWidth));
        let minY = 0;
        let maxY = tile;
        const visible: { image: CanvasImageSource; y: number }[] = [];
        for (const layer of layers) {
          if (flowerSrc && layer.src === flowerSrc && eaten.has(key)) {
            continue;
          }
          if (layer.water) {
            continue;
          }
          const image = bySrc.get(layer.src);
          if (!image) {
            continue;
          }
          const sprite = layer.tint ? tintedSprite(image, layer.src, layer.tint) : image;
          const y = -layer.lift * scale;
          visible.push({ image: sprite, y });
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y + tile);
        }
        if (visible.length === 0) {
          return;
        }
        const height = Math.max(1, Math.ceil(maxY - minY));
        const plate = document.createElement("canvas");
        plate.width = tile;
        plate.height = height;
        const baked = plate.getContext("2d");
        if (!baked) {
          return;
        }
        baked.imageSmoothingEnabled = false;
        for (const layer of visible) {
          baked.drawImage(layer.image, 0, layer.y - minY, tile, tile);
        }
        plates.set(key, { canvas: plate, offsetY: minY });
      };

      const isWater = (cell: Placement) => cell.layers.some((layer) => layer.water);

      const drawCell = (context: CanvasRenderingContext2D, cell: Placement, time: number) => {
        const origin = isoSpriteOrigin(cell.row, cell.col, metrics);
        if (!isWater(cell)) {
          const plate = plates.get(cell.key);
          if (!plate) {
            return;
          }
          const destH = plate.canvas.height * (metrics.tileWidth / plate.canvas.width);
          context.drawImage(
            plate.canvas,
            origin.x,
            origin.y + plate.offsetY,
            metrics.tileWidth,
            destH,
          );
          return;
        }
        const flowerSrc = objectiveSrc.get(cell.key);
        for (const layer of cell.layers) {
          if (flowerSrc && layer.src === flowerSrc && eatenNow.has(cell.key)) {
            continue;
          }
          const image = bySrc.get(layer.src);
          if (!image) {
            continue;
          }
          const tint = layer.water
            ? waterSurfaceTint(
                layer.water.kind,
                animatedWaterDepth(waves, layer.water.depth, cell.row, cell.col, time),
                layer.water.warmth,
              )
            : layer.tint;
          const sprite = tint ? tintedSprite(image, layer.src, tint) : image;
          context.drawImage(
            sprite,
            origin.x,
            origin.y - layer.lift * scale,
            metrics.tileWidth,
            metrics.tileWidth,
          );
        }
      };

      const paintAll = (time: number) => {
        mapTime = time;
        ctx.imageSmoothingEnabled = false;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, metrics.width, metrics.height);
        for (const cell of placements) {
          drawCell(ctx, cell, time);
        }
      };

      const coverPlacement = (ids: Uint16Array, cell: Placement, clip?: DeviceRect) => {
        const origin = isoSpriteOrigin(cell.row, cell.col, metrics);
        const flowerSrc = objectiveSrc.get(cell.key);
        for (const layer of cell.layers) {
          if (flowerSrc && layer.src === flowerSrc && eatenNow.has(cell.key)) {
            continue;
          }
          const image = bySrc.get(layer.src);
          if (!image) {
            continue;
          }
          coverLayer(
            ids,
            bitmapW,
            bitmapH,
            cell.index,
            image,
            origin.x,
            origin.y - layer.lift * scale,
            metrics.tileWidth,
            dpr,
            clip,
          );
        }
      };

      const buildMask = (): BoardMask => {
        const ids = new Uint16Array(bitmapW * bitmapH);
        const cells = new Map<string, MaskCell>();
        for (const cell of placements) {
          coverPlacement(ids, cell);
          const bounds = deviceRect(cell.box, dpr, bitmapW, bitmapH);
          if (bounds.w > 0 && bounds.h > 0) {
            cells.set(cell.key, { index: cell.index, ...bounds });
          }
        }
        return { width: bitmapW, height: bitmapH, ids, cells };
      };

      const patchCells = (keys: string[]) => {
        let dirty: CssBox | null = null;
        for (const key of keys) {
          const cell = byKey.get(key);
          if (!cell) {
            continue;
          }
          dirty = dirty ? unionBox(dirty, cell.box) : cell.box;
          cell.layers = layersForCell(
            view,
            applied,
            objectiveSrc,
            whirlpools,
            cell.row,
            cell.col,
            cell.pad,
            depthAt,
            warmthAt,
            mudKeys,
          );
          cell.box = spriteBox(cell.row, cell.col, cell.layers, eatenNow);
          dirty = unionBox(dirty, cell.box);
          if (isWater(cell)) {
            plates.delete(cell.key);
          } else {
            bakePlate(cell.key, cell.layers, eatenNow);
          }
        }
        if (!dirty) {
          return;
        }
        const mask = maskRef.current;
        if (mask) {
          const rect = deviceRect(dirty, dpr, bitmapW, bitmapH);
          clearIds(mask, rect);
          for (const cell of placements) {
            if (!intersects(cell.box, dirty)) {
              continue;
            }
            coverPlacement(mask.ids, cell, rect);
            const bounds = deviceRect(cell.box, dpr, bitmapW, bitmapH);
            mask.cells.set(cell.key, { index: cell.index, ...bounds });
          }
        }
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.beginPath();
        ctx.rect(dirty.left, dirty.top, dirty.width, dirty.height);
        ctx.clip();
        ctx.clearRect(dirty.left, dirty.top, dirty.width, dirty.height);
        for (const cell of placements) {
          if (intersects(cell.box, dirty)) {
            drawCell(ctx, cell, mapTime);
          }
        }
        ctx.restore();
        paintMarksRef.current();
      };

      const patchBridges = (next: Set<string>) => {
        const changed: string[] = [];
        for (const key of next) {
          if (!applied.has(key)) {
            changed.push(key);
          }
        }
        for (const key of applied) {
          if (!next.has(key)) {
            changed.push(key);
          }
        }
        if (changed.length === 0) {
          return;
        }
        applied = new Set(next);
        patchCells(changed);
      };

      const paintBoar = (now: number) => {
        const boarCanvas = boarLayerRef.current;
        if (!boarCanvas) {
          return;
        }
        fitBitmap(boarCanvas, bitmapW, bitmapH);
        const boarCtx = boarCanvas.getContext("2d");
        if (!boarCtx) {
          return;
        }
        boarCtx.imageSmoothingEnabled = false;
        boarCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        boarCtx.clearRect(0, 0, metrics.width, metrics.height);
        const plan = boarRef?.current;
        const pose = plan ? boarPose(plan, now, reduceMotion) : null;
        if (!pose || !plan) {
          setWalker(walkId, false);
          return;
        }
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
        const boarImage = bySrc.get(boarFrameSrc(pose.facing, pose.anim, pose.frame));
        const place = boarPlace(pose, metrics);
        if (!boarImage) {
          return pose.eaten;
        }
        const foot = BOAR_FOOT[pose.facing];
        const sink = boarSink(metrics.halfH * 2);
        boarCtx.drawImage(
          boarImage,
          place.x - foot.x * scale,
          place.y - foot.y * scale + sink,
          BOAR_FRAME_W * scale,
          BOAR_FRAME_H * scale,
        );
        return pose.eaten;
      };

      for (const cell of placements) {
        if (!isWater(cell)) {
          bakePlate(cell.key, cell.layers, eatenNow);
        }
      }
      maskRef.current = buildMask();
      fitBitmap(canvas, bitmapW, bitmapH);
      paintAll(0);
      paintBoar(performance.now());
      paintMarksRef.current();
      startFlashRef.current();
      patchBridgesRef.current = patchBridges;
      onStillRef.current?.();
      if (reduceMotion) {
        return;
      }

      let lastMap = performance.now();
      const tick = (now: number) => {
        if (cancelled) {
          return;
        }
        frame = requestAnimationFrame(tick);
        if (document.hidden) {
          return;
        }
        const eaten = paintBoar(now) ?? eatenNow;
        if (eaten.size !== eatenCount) {
          const fresh = [...eaten].filter((key) => !eatenNow.has(key));
          eatenNow = eaten;
          eatenCount = eaten.size;
          patchCells(fresh);
        }
        if (now - lastMap >= WATER_TICK_MS) {
          lastMap = now;
          paintAll(now / 1000);
        }
      };
      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      patchBridgesRef.current = () => {};
      setWalker(walkId, false);
    };
  }, [view, depthIso, metrics, objectives, whirlpools, boarRef, alwaysAnimate, walkId]);

  useEffect(() => {
    patchBridgesRef.current(bridges);
  }, [bridges]);

  useEffect(() => {
    const paint = () => {
      const canvas = markLayerRef.current;
      const mask = maskRef.current;
      if (!canvas || !mask) {
        return;
      }
      fitBitmap(canvas, mask.width, mask.height);
      const markCtx = canvas.getContext("2d", { willReadFrequently: true });
      if (!markCtx) {
        return;
      }
      markCtx.setTransform(1, 0, 0, 1, 0, 0);
      markCtx.clearRect(0, 0, mask.width, mask.height);
      const hints = hintRef?.current;
      if (hints) {
        for (const key of hints) {
          tintCell(markCtx, mask, key, "#fbbf24", HINT_ALPHA);
        }
      }
      if (hoverKey) {
        tintCell(markCtx, mask, hoverKey, "#ffffff", HOVER_ALPHA);
      }
    };
    paintMarksRef.current = paint;
    paint();
  }, [hoverKey, hintMark, hintRef]);

  useEffect(() => {
    let frame = 0;
    let stopped = false;
    const start = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stopped = false;
      const canvas = flashLayerRef.current;
      const mask = maskRef.current;
      if (!canvas || !mask) {
        return;
      }
      fitBitmap(canvas, mask.width, mask.height);
      const flashCtx = canvas.getContext("2d", { willReadFrequently: true });
      if (!flashCtx) {
        return;
      }
      flashCtx.setTransform(1, 0, 0, 1, 0, 0);
      flashCtx.clearRect(0, 0, mask.width, mask.height);
      canvas.style.opacity = "1";
      const flash = flashRef?.current;
      if (!flash) {
        return;
      }
      const seen = new Set<string>();
      const tick = (now: number) => {
        if (stopped) {
          return;
        }
        frame = requestAnimationFrame(tick);
        const age = now - flash.beganAt;
        if (age >= flashLifetime(flash)) {
          flashCtx.clearRect(0, 0, mask.width, mask.height);
          canvas.style.opacity = "1";
          stopped = true;
          cancelAnimationFrame(frame);
          return;
        }
        canvas.style.opacity = String(flashFade(flash, age));
        if (flashFade(flash, age) < 1) {
          return;
        }
        for (const cell of flash.cells) {
          if (seen.has(cell.key) || age < cell.dist * flash.stepMs) {
            continue;
          }
          seen.add(cell.key);
          tintCell(flashCtx, mask, cell.key, cell.red ? "#ef4444" : "#fbbf24", FLASH_ALPHA);
        }
      };
      tick(performance.now());
    };
    startFlashRef.current = start;
    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      startFlashRef.current = () => {};
    };
  }, [flashMark, flashRef]);

  return (
    <>
      <canvas ref={mapRef} aria-hidden className={LAYER_CLASS} style={layerStyle} />
      <canvas ref={flashLayerRef} aria-hidden className={LAYER_CLASS} style={layerStyle} />
      <canvas ref={markLayerRef} aria-hidden className={LAYER_CLASS} style={layerStyle} />
      <canvas ref={boarLayerRef} aria-hidden className={LAYER_CLASS} style={layerStyle} />
    </>
  );
}

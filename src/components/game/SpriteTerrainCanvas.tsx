"use client";

import { useEffect, useRef } from "react";

import { cellKey } from "@/lib/game/coords";
import { isoLatticeCells } from "@/lib/game/isoBoard";
import { latticeWaterDepth } from "@/lib/game/terrain";
import {
  isoSpriteOrigin,
  SPRITE_NATIVE,
  type IsoMetrics,
} from "@/lib/rendering/isoTiles";
import {
  BRIDGE_MARSH,
  BRIDGE_WOOD,
  CLIFF_STONE_LIFT,
  oceanSprite,
  terrainLayers,
  waterSurfaceTint,
  type SpriteLayer,
} from "@/lib/rendering/tileCatalog";
import type { TerrainView } from "@/lib/rendering/terrainView";
import { terrainKindAt } from "@/lib/rendering/terrainView";

type ObjectiveMarker = {
  row: number;
  col: number;
  src: string;
};

type SpriteTerrainCanvasProps = {
  view: TerrainView;
  metrics: IsoMetrics;
  bridges: Set<string>;
  objectives: ObjectiveMarker[];
  whirlpools: Set<string>;
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
): SpriteLayer[] {
  const key = cellKey(row, col);
  const whirlpool = whirlpools.has(key);

  if (padding) {
    return [
      {
        src: oceanSprite(view, row, col, false),
        lift: 0,
        tint: waterSurfaceTint("ocean", depthAt(row, col)),
      },
    ];
  }

  const layers: SpriteLayer[] = [];

  if (bridges.has(key)) {
    const kind = terrainKindAt(view, row, col);
    layers.push({
      src: kind === "marsh" ? BRIDGE_MARSH : BRIDGE_WOOD,
      lift: 0,
    });
  } else {
    const kind = terrainKindAt(view, row, col);
    if (kind) {
      const painted = terrainLayers(kind, view, row, col, whirlpool);
      if ((kind === "ocean" || kind === "marsh") && !whirlpool) {
        const tint = waterSurfaceTint(kind, depthAt(row, col));
        layers.push(...painted.map((layer) => ({ ...layer, tint })));
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
  metrics,
  bridges,
  objectives,
  whirlpools,
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
    const depthAt = latticeWaterDepth(view);
    const placements: { row: number; col: number; layers: SpriteLayer[] }[] = [];
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
      );
      if (layers.length > 0) {
        placements.push({ row: cell.row, col: cell.col, layers });
      }
    }
    const sources = [
      ...new Set(placements.flatMap((cell) => cell.layers.map((layer) => layer.src))),
    ];

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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, metrics.width, metrics.height);

      const scale = metrics.tileWidth / SPRITE_NATIVE;
      for (const cell of placements) {
        const origin = isoSpriteOrigin(cell.row, cell.col, metrics);
        for (const layer of cell.layers) {
          const image = bySrc.get(layer.src);
          if (!image) {
            continue;
          }
          const sprite = layer.tint
            ? tintedSprite(image, layer.src, layer.tint)
            : image;
          ctx.drawImage(
            sprite,
            origin.x,
            origin.y - layer.lift * scale,
            metrics.tileWidth,
            metrics.tileWidth,
          );
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [view, metrics, bridges, objectives, whirlpools]);

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

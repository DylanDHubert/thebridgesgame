"use client";

import { useEffect, useRef } from "react";

import { cellKey } from "@/lib/game/coords";
import {
  isoSpriteOrigin,
  SPRITE_NATIVE,
  type IsoMetrics,
} from "@/lib/rendering/isoTiles";
import {
  BRIDGE_VARIANTS,
  CLIFF_STONE_LIFT,
  pickVariant,
  terrainLayers,
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
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();

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

/** BRIDGE REPLACES THE CELL. X / Y / Z ARE A FLOWER ON THAT CELL. */
function layersForCell(
  view: TerrainView,
  bridges: Set<string>,
  objectiveSrc: Map<string, string>,
  row: number,
  col: number,
): SpriteLayer[] {
  const key = cellKey(row, col);
  const layers: SpriteLayer[] = [];

  if (bridges.has(key)) {
    layers.push({
      src: pickVariant(BRIDGE_VARIANTS, view.seed, row, col, "bridge"),
      lift: 0,
    });
  } else {
    const kind = terrainKindAt(view, row, col);
    if (kind) {
      layers.push(...terrainLayers(kind, view.seed, row, col));
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
    const placements: { row: number; col: number; layers: SpriteLayer[] }[] = [];
    for (let row = 0; row < view.rows; row += 1) {
      for (let col = 0; col < view.cols; col += 1) {
        const layers = layersForCell(view, bridges, objectiveSrc, row, col);
        if (layers.length > 0) {
          placements.push({ row, col, layers });
        }
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
          ctx.drawImage(
            image,
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
  }, [view, metrics, bridges, objectives]);

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

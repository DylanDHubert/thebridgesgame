"use client";

import { useCallback, useRef, useState } from "react";

import type { CellCoord } from "@/lib/game/types";
import {
  cellAtIsoPoint,
  isoCellCenter,
  type IsoMetrics,
} from "@/lib/rendering/isoTiles";

export type MapLabel = {
  id: string;
  label: string;
  at: CellCoord;
  color: string;
};

type MapLabelOverlayProps = {
  labels: MapLabel[];
  metrics: IsoMetrics;
  /** WHEN TRUE — DRAG LABELS TO NEW LAND CELLS */
  draggable?: boolean;
  onMoveLabel?: (id: string, row: number, col: number) => void;
  /** CLICK A LABEL. THE HOME MAP USES THIS TO ASK FOR A BRIDGE. */
  onSelect?: (id: string) => void;
};

function pointerToIso(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement,
  width: number,
  height: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * width,
    y: ((clientY - rect.top) / rect.height) * height,
  };
}

/** PIXEL LABELS ON ISO CELLS — OPTIONAL DRAG TO REPOSITION */
export function MapLabelOverlay({
  labels,
  metrics,
  draggable = false,
  onMoveLabel,
  onSelect,
}: MapLabelOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const fontSize = Math.max(8, Math.min(14, metrics.halfH * 0.85));
  const hitPad = Math.max(14, metrics.halfH);

  const endDrag = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!draggingId || !svgRef.current || !onMoveLabel) {
        setDraggingId(null);
        setDragPoint(null);
        return;
      }
      const point = pointerToIso(
        event.clientX,
        event.clientY,
        svgRef.current,
        metrics.width,
        metrics.height,
      );
      const cell = cellAtIsoPoint(point.x, point.y, metrics);
      if (cell) {
        onMoveLabel(draggingId, cell.row, cell.col);
      }
      setDraggingId(null);
      setDragPoint(null);
    },
    [draggingId, onMoveLabel, metrics],
  );

  return (
    <svg
      ref={svgRef}
      className={[
        "absolute left-0 top-0",
        draggable
          ? "pointer-events-auto z-[1000]"
          : onSelect
            ? "pointer-events-none z-[400]"
            : "pointer-events-none",
      ].join(" ")}
      width={metrics.width}
      height={metrics.height}
      viewBox={`0 0 ${metrics.width} ${metrics.height}`}
      onPointerMove={(event) => {
        if (!draggingId || !svgRef.current) {
          return;
        }
        setDragPoint(
          pointerToIso(
            event.clientX,
            event.clientY,
            svgRef.current,
            metrics.width,
            metrics.height,
          ),
        );
      }}
      onPointerUp={endDrag}
      onPointerCancel={() => {
        setDraggingId(null);
        setDragPoint(null);
      }}
    >
      {labels.map((marker) => {
        const anchored = isoCellCenter(marker.at.row, marker.at.col, metrics);
        const isDrag = draggingId === marker.id && dragPoint;
        const x = isDrag ? dragPoint.x : anchored.x;
        const y = isDrag ? dragPoint.y : anchored.y;

        const selectable = !draggable && !!onSelect;
        const hitWidth = marker.label.length * fontSize;
        const hitHeight = fontSize * 1.6;
        return (
          <g
            key={marker.id}
            style={{
              cursor: draggable ? "grab" : selectable ? "pointer" : undefined,
              pointerEvents: selectable ? "auto" : undefined,
            }}
            onClick={(event) => {
              if (draggable || !onSelect) {
                return;
              }
              event.stopPropagation();
              onSelect(marker.id);
            }}
            onPointerDown={(event) => {
              if (!draggable) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              (event.currentTarget as SVGGElement).setPointerCapture?.(event.pointerId);
              svgRef.current?.setPointerCapture(event.pointerId);
              setDraggingId(marker.id);
              setDragPoint({ x: anchored.x, y: anchored.y });
            }}
          >
            {/* HIT TARGET. THE WORD IS WIDER THAN THE TILE, SO THE RECT COVERS THE LETTERS. */}
            {selectable ? (
              <rect
                x={x - hitWidth / 2}
                y={y - hitHeight / 2}
                width={hitWidth}
                height={hitHeight}
                fill="transparent"
              />
            ) : null}
            <circle
              cx={x}
              cy={y}
              r={hitPad}
              fill="rgb(0 0 0 / 0.01)"
              stroke={marker.color}
              strokeWidth={draggable ? 2 : 0}
              opacity={draggable ? 0.85 : 0}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={marker.color}
              stroke="rgb(12 48 92)"
              strokeWidth={2}
              paintOrder="stroke"
              fontSize={fontSize}
              fontFamily="var(--font-silkscreen), sans-serif"
              fontWeight={700}
              style={{ pointerEvents: "none" }}
            >
              {marker.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

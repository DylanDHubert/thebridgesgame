"use client";

import type { ReactNode } from "react";

import { TileSwatch } from "@/components/create/TileSwatch";
import { TERRAIN_DEFINITIONS } from "@/lib/game/objects/registry";
import type { TileKind } from "@/lib/game/types";

// EDITOR TOOL — MIRRORS THE THREE AUTHORED LAYERS PLUS AN ERASER
export type EditorTool =
  | { type: "terrain"; kind: TileKind }
  | { type: "object"; defId: string }
  | { type: "route"; defId: string }
  | { type: "erase" }
  | null;

const SWATCH_SIZE = 22;

/** SQUARE STAMP. THE MARK IS A 5×5 GRID WITH THAT MANY BOXES FILLED. */
export const BRUSH_SIZES = [1, 2, 3, 5] as const;
export type BrushSize = (typeof BRUSH_SIZES)[number];

const BRUSH_GRID = 5;

// TERRAIN ORDER FOR THE BOTTOM BAR
const TERRAIN_ORDER: TileKind[] = ["ocean", "marsh", "grass", "cliff"];

type EditorPaletteProps = {
  tool: EditorTool;
  onSelect: (tool: EditorTool) => void;
  brush: BrushSize;
  onBrush: (size: BrushSize) => void;
};

/** WHERE THE FILLED BOXES START INSIDE THE 5×5 MARK. */
function brushOrigin(size: BrushSize): number {
  return Math.floor((BRUSH_GRID - size) / 2);
}

/** CELL OFFSET FROM THE CLICK. MATCHES THE MARK, WHOSE CENTER IS THE CLICK. */
export function brushOffset(size: BrushSize): number {
  return brushOrigin(size) - Math.floor(BRUSH_GRID / 2);
}

function sameTool(a: EditorTool, b: EditorTool): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === "terrain" && b.type === "terrain") {
    return a.kind === b.kind;
  }
  if (a.type === "object" && b.type === "object") {
    return a.defId === b.defId;
  }
  if (a.type === "route" && b.type === "route") {
    return a.defId === b.defId;
  }
  return a.type === b.type;
}

function SwatchButton({
  selected,
  label,
  title,
  onClick,
  children,
}: {
  selected: boolean;
  label: string;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={title}
      className={[
        "inline-flex items-center gap-1.5 border border-black px-1.5 py-1 text-[10px] uppercase tracking-[0.16em]",
        selected ? "bg-black text-white" : "bg-white text-black",
      ].join(" ")}
    >
      <span className="block bg-transparent">{children}</span>
      {label}
    </button>
  );
}

function BrushMark({ size, selected }: { size: BrushSize; selected: boolean }) {
  const origin = brushOrigin(size);
  return (
    <span className="grid h-[22px] w-[22px] grid-cols-5 gap-px" aria-hidden>
      {Array.from({ length: BRUSH_GRID * BRUSH_GRID }, (_, index) => {
        const row = Math.floor(index / BRUSH_GRID);
        const col = index % BRUSH_GRID;
        const filled =
          row >= origin &&
          row < origin + size &&
          col >= origin &&
          col < origin + size;
        return (
          <span
            key={index}
            className={filled ? (selected ? "bg-white" : "bg-black") : "bg-transparent"}
          />
        );
      })}
    </span>
  );
}

export function EditorPalette({ tool, onSelect, brush, onBrush }: EditorPaletteProps) {
  const pick = (next: NonNullable<EditorTool>) => {
    onSelect(sameTool(tool, next) ? null : next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {TERRAIN_ORDER.map((kind) => {
        const definition = TERRAIN_DEFINITIONS[kind as keyof typeof TERRAIN_DEFINITIONS];
        const next: EditorTool = { type: "terrain", kind };
        return (
          <SwatchButton
            key={kind}
            selected={sameTool(tool, next)}
            label={definition?.label ?? kind}
            title={definition?.label ?? kind}
            onClick={() => pick(next)}
          >
            <TileSwatch kind={kind} size={SWATCH_SIZE} />
          </SwatchButton>
        );
      })}
      <span className="mx-0.5 h-6 w-px bg-black" aria-hidden />
      {BRUSH_SIZES.map((size) => {
        const selected = brush === size;
        return (
          <button
            key={size}
            type="button"
            aria-pressed={selected}
            title={`${size}×${size}`}
            onClick={() => onBrush(size)}
            className={[
              "inline-flex h-[30px] w-[30px] items-center justify-center border border-black",
              selected ? "bg-black" : "bg-white",
            ].join(" ")}
          >
            <BrushMark size={size} selected={selected} />
          </button>
        );
      })}
    </div>
  );
}

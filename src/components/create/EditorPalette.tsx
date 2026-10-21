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

// TERRAIN ORDER FOR THE BOTTOM BAR
const TERRAIN_ORDER: TileKind[] = ["ocean", "marsh", "grass", "cliff"];

type EditorPaletteProps = {
  tool: EditorTool;
  onSelect: (tool: EditorTool) => void;
};

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

export function EditorPalette({ tool, onSelect }: EditorPaletteProps) {
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
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

import { ObjectSwatch } from "@/components/create/ObjectSwatch";
import { TileSwatch } from "@/components/create/TileSwatch";
import { WoodButton, WoodPlaque } from "@/components/ui/woodPlaque";
import {
  OBJECT_DEFINITION_LIST,
  ROUTE_DEFINITION_LIST,
  TERRAIN_DEFINITIONS,
} from "@/lib/game/objects/registry";
import type { TileKind } from "@/lib/game/types";

// EDITOR TOOL — MIRRORS THE THREE AUTHORED LAYERS PLUS AN ERASER
export type EditorTool =
  | { type: "terrain"; kind: TileKind }
  | { type: "object"; defId: string }
  | { type: "route"; defId: string }
  | { type: "erase" }
  | null;

const SWATCH_SIZE = 40;

// TERRAIN ORDER FOR THE PALETTE (WHIRLPOOL IS A BUILDING NOW)
const TERRAIN_ORDER: TileKind[] = ["ocean", "marsh", "beach", "grass", "cliff"];

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[rgb(72_176_210)]">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
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
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        title={title}
        className={[
          "relative block transition hover:brightness-110 active:translate-y-px",
          selected ? "brightness-110" : "",
        ].join(" ")}
      >
        <WoodPlaque compact className="p-[2px]">
          <div
            className={[
              "overflow-hidden",
              selected ? "outline outline-1 outline-[rgb(251_191_36)]" : "",
            ].join(" ")}
          >
            {children}
          </div>
        </WoodPlaque>
      </button>
      <span className="text-[10px] font-medium tracking-wide text-[rgb(210_196_138)]">
        {label}
      </span>
    </div>
  );
}

export function EditorPalette({ tool, onSelect }: EditorPaletteProps) {
  const pick = (next: NonNullable<EditorTool>) => {
    onSelect(sameTool(tool, next) ? null : next);
  };

  return (
    <div className="flex flex-col gap-6">
      <Section title="Terrain">
        <div className="grid grid-cols-3 justify-items-center gap-x-3 gap-y-4">
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
      </Section>

      <Section title="Buildings">
        <div className="grid grid-cols-3 justify-items-center gap-x-3 gap-y-4">
          {OBJECT_DEFINITION_LIST.map((definition) => {
            const next: EditorTool = { type: "object", defId: definition.id };
            return (
              <SwatchButton
                key={definition.id}
                selected={sameTool(tool, next)}
                label={definition.label}
                title={definition.label}
                onClick={() => pick(next)}
              >
                <ObjectSwatch defId={definition.id} size={SWATCH_SIZE} />
              </SwatchButton>
            );
          })}
        </div>
      </Section>

      <Section title="Routes">
        <div className="flex flex-col gap-3">
          {ROUTE_DEFINITION_LIST.map((definition) => {
            const next: EditorTool = { type: "route", defId: definition.id };
            const selected = sameTool(tool, next);
            return (
              <WoodButton
                key={definition.id}
                type="button"
                onClick={() => pick(next)}
                pressed={selected}
                className="w-full"
              >
                {definition.label}
                {definition.closedByDefault ? " · loop" : " · lane"}
              </WoodButton>
            );
          })}
        </div>
      </Section>

      <WoodButton
        type="button"
        onClick={() => pick({ type: "erase" })}
        pressed={tool?.type === "erase"}
        className="w-full"
      >
        Erase building
      </WoodButton>
    </div>
  );
}

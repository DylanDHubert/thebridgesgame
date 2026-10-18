"use client";

import { useEffect, useMemo, useState } from "react";

import { EditorPalette, type EditorTool } from "@/components/create/EditorPalette";
import { GameBoard } from "@/components/game/GameBoard";
import type { DraftRoute } from "@/components/game/RouteCanvasOverlay";
import { WoodButton, WoodControlRow } from "@/components/ui/woodPlaque";
import { saveLevelAction } from "@/app/actions/saveLevel";
import { homeMapFromLevel } from "@/lib/game/homeMap";
import { serializeLevel } from "@/lib/game/level/serialize";
import type { Level } from "@/lib/game/level/types";
import {
  objectDefinition,
  routeDefinition,
} from "@/lib/game/objects/registry";
import {
  canPlaceObjectAt,
  canRouteEnter,
  isLandKind,
  terrainKindAt,
} from "@/lib/game/rules";
import type { Mission, TileKind } from "@/lib/game/types";
import {
  DEFAULT_DISPLAY_PREFS,
  loadDisplayPrefs,
  normalizeDisplayPrefs,
  saveDisplayPrefs,
} from "@/lib/rendering/displayPrefs";

type DraftPuzzleViewProps = {
  level: Level;
  /** WHEN TRUE — EDITING THE TITLE MAP (X=HOME Y=PLAY Z=CREATE) */
  homeMap?: boolean;
};

const PANEL_FRAME =
  "overflow-hidden border border-[rgb(95_84_74)] bg-[rgb(12_48_92)]";

function toolHint(tool: EditorTool, homeMap: boolean): string {
  if (homeMap && !tool) {
    return "Drag HOME / PLAY / CREATE onto land. Select a tool to paint.";
  }
  if (!tool) {
    return "Select a tool to start editing.";
  }
  switch (tool.type) {
    case "terrain":
      return "Click the map to paint terrain.";
    case "object":
      return "Click a valid tile to place the building.";
    case "route":
      return "Click adjacent water tiles to draw the route.";
    case "erase":
      return "Click a building to remove it.";
  }
}

function newRouteId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `route-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function DraftPuzzleView({
  level: initialLevel,
  homeMap = false,
}: DraftPuzzleViewProps) {
  const [level, setLevel] = useState<Level>(initialLevel);
  const [tool, setTool] = useState<EditorTool>(null);
  const [draftRoute, setDraftRoute] = useState<DraftRoute | null>(null);
  const [name, setName] = useState(() => initialLevel.name);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cellGridOpacity, setCellGridOpacity] = useState(
    DEFAULT_DISPLAY_PREFS.cellGridOpacity,
  );
  const [waterDepthInterpolation, setWaterDepthInterpolation] = useState(
    DEFAULT_DISPLAY_PREFS.waterDepthInterpolation,
  );

  useEffect(() => {
    const prefs = loadDisplayPrefs();
    setCellGridOpacity(prefs.cellGridOpacity);
    setWaterDepthInterpolation(prefs.waterDepthInterpolation);
  }, []);

  const emptyBridges = useMemo(() => new Set<string>(), []);
  const emptyPath = useMemo(() => new Set<string>(), []);
  const homeLabels = useMemo(
    () => (homeMap ? homeMapFromLevel(level).labels : undefined),
    [homeMap, level],
  );

  const handleCellGridOpacity = (value: number) => {
    const next = normalizeDisplayPrefs({
      cellGridOpacity: value,
      waterDepthInterpolation,
    }).cellGridOpacity;
    setCellGridOpacity(next);
    saveDisplayPrefs({ cellGridOpacity: next });
  };

  const handleWaterDepthInterpolation = (value: number) => {
    const next = normalizeDisplayPrefs({
      cellGridOpacity,
      waterDepthInterpolation: value,
    }).waterDepthInterpolation;
    setWaterDepthInterpolation(next);
    saveDisplayPrefs({ waterDepthInterpolation: next });
  };

  // SELECTING A ROUTE TOOL STARTS/KEEPS A DRAFT ROUTE; OTHER TOOLS CLEAR IT
  const handleSelectTool = (next: EditorTool) => {
    setTool(next);
    if (next?.type === "route") {
      setDraftRoute((current) =>
        current && current.defId === next.defId
          ? current
          : {
              defId: next.defId,
              path: [],
              closed: routeDefinition(next.defId)?.closedByDefault ?? false,
            },
      );
    } else {
      setDraftRoute(null);
    }
  };

  const paintTerrain = (row: number, col: number, kind: TileKind) => {
    setLevel((prev) => {
      const index = row * prev.cols + col;
      if (prev.terrain[index] === kind) {
        return prev;
      }
      const terrain = prev.terrain.slice();
      terrain[index] = kind;
      const next: Level = { ...prev, terrain };
      // PRUNE BUILDINGS THAT NO LONGER SATISFY THEIR PLACEMENT RULES
      const objects = next.objects.filter((object) => {
        const definition = objectDefinition(object.defId);
        return definition
          ? canPlaceObjectAt(next, definition, object.at.row, object.at.col)
          : false;
      });
      return { ...next, objects };
    });
  };

  const placeObject = (row: number, col: number, defId: string) => {
    const definition = objectDefinition(defId);
    if (!definition) {
      return;
    }
    if (!canPlaceObjectAt(level, definition, row, col)) {
      setStatus(`${definition.label} can't be placed there.`);
      return;
    }
    setStatus(null);
    setLevel((prev) => {
      const objects = prev.objects.filter(
        (object) => !(object.at.row === row && object.at.col === col),
      );
      objects.push({ defId, at: { row, col } });
      return { ...prev, objects };
    });
  };

  const eraseObject = (row: number, col: number) => {
    setLevel((prev) => {
      const objects = prev.objects.filter(
        (object) => !(object.at.row === row && object.at.col === col),
      );
      return objects.length === prev.objects.length ? prev : { ...prev, objects };
    });
  };

  const addRoutePoint = (row: number, col: number) => {
    if (!draftRoute) {
      return;
    }
    const definition = routeDefinition(draftRoute.defId);
    const allowed = definition?.allowedTerrain ?? [];
    if (!canRouteEnter(level, allowed, { row, col })) {
      setStatus("Routes can only cross water.");
      return;
    }
    const last = draftRoute.path[draftRoute.path.length - 1];
    if (last && last.row === row && last.col === col) {
      return;
    }
    if (last && Math.abs(last.row - row) + Math.abs(last.col - col) !== 1) {
      setStatus("Add the next step to an adjacent water tile.");
      return;
    }
    setStatus(null);
    setDraftRoute({ ...draftRoute, path: [...draftRoute.path, { row, col }] });
  };

  const handleHomeLabelMove = (id: string, row: number, col: number) => {
    const kind = terrainKindAt(level, row, col);
    if (!kind || !isLandKind(kind)) {
      setStatus("Drop HOME / PLAY / CREATE on land.");
      return;
    }
    const missionKey =
      id === "home" ? "x" : id === "play" ? "y" : id === "create" ? "z" : null;
    if (!missionKey) {
      return;
    }
    setStatus(null);
    setLevel((prev) => ({
      ...prev,
      mission: {
        ...prev.mission,
        [missionKey]: { row, col },
      } satisfies Mission,
    }));
  };

  const handleCellClick = (row: number, col: number) => {
    if (!tool) {
      return;
    }
    switch (tool.type) {
      case "terrain":
        paintTerrain(row, col, tool.kind);
        break;
      case "object":
        placeObject(row, col, tool.defId);
        break;
      case "erase":
        eraseObject(row, col);
        break;
      case "route":
        addRoutePoint(row, col);
        break;
    }
  };

  const finishRoute = () => {
    if (!draftRoute || draftRoute.path.length < 2) {
      setStatus("Draw at least two points before finishing.");
      return;
    }
    setLevel((prev) => ({
      ...prev,
      routes: [
        ...prev.routes,
        {
          id: newRouteId(),
          defId: draftRoute.defId,
          closed: draftRoute.closed,
          path: draftRoute.path,
        },
      ],
    }));
    const definition = routeDefinition(draftRoute.defId);
    setDraftRoute({
      defId: draftRoute.defId,
      path: [],
      closed: definition?.closedByDefault ?? false,
    });
    setStatus("Route added.");
  };

  const undoRoutePoint = () => {
    setDraftRoute((current) =>
      current ? { ...current, path: current.path.slice(0, -1) } : current,
    );
  };

  const toggleRouteClosed = () => {
    setDraftRoute((current) =>
      current ? { ...current, closed: !current.closed } : current,
    );
  };

  const clearDraftRoute = () => {
    setDraftRoute((current) => (current ? { ...current, path: [] } : current));
  };

  const deleteRoute = (id: string) => {
    setLevel((prev) => ({
      ...prev,
      routes: prev.routes.filter((route) => route.id !== id),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    const toSave: Level = {
      ...level,
      // HOME MAP ALWAYS SAVES AS id=home
      id: homeMap ? "home" : level.id,
      name: homeMap ? "the bridges game" : name.trim() || level.id,
    };
    try {
      const result = await saveLevelAction(serializeLevel(toSave));
      setStatus(result.ok ? `Saved to ${result.path}` : `Save failed: ${result.error}`);
    } catch (error) {
      setStatus(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isRouteTool = tool?.type === "route";

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden font-mono">
      <section className="flex min-h-0 min-w-0 flex-[3] flex-col gap-2 p-3">
        <div className={`flex min-h-0 flex-1 p-2 ${PANEL_FRAME}`}>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <GameBoard
              level={level}
              bridges={emptyBridges}
              pathKeys={emptyPath}
              interactive={false}
              editable={tool !== null}
              onCellClick={handleCellClick}
              draftRoute={draftRoute}
              sizing="contain"
              showMission={!homeMap}
              mapLabels={homeLabels}
              mapLabelsDraggable={homeMap && tool === null}
              onMapLabelMove={homeMap ? handleHomeLabelMove : undefined}
              cellGridOpacity={cellGridOpacity}
              waterDepthInterpolation={waterDepthInterpolation}
            />
          </div>
        </div>

        <div className={`flex shrink-0 flex-col gap-2 px-3 py-2 ${PANEL_FRAME}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-[rgb(210_196_138)]">
              {toolHint(tool, homeMap)}
            </p>
            {status ? (
              <p className="truncate text-[11px] text-[rgb(251_191_36)]">{status}</p>
            ) : null}
          </div>

          {isRouteTool && draftRoute ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-[rgb(36_148_132)]">
                {draftRoute.path.length} point{draftRoute.path.length === 1 ? "" : "s"}
              </span>
              <WoodControlRow className="justify-start">
                <WoodButton type="button" onClick={toggleRouteClosed}>
                  {draftRoute.closed ? "Loop: on" : "Loop: off"}
                </WoodButton>
                <WoodButton type="button" onClick={undoRoutePoint}>
                  Undo point
                </WoodButton>
                <WoodButton type="button" onClick={clearDraftRoute}>
                  Clear
                </WoodButton>
                <WoodButton type="button" onClick={finishRoute}>
                  Finish route
                </WoodButton>
              </WoodControlRow>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            {homeMap ? (
              <p className="min-w-0 flex-1 text-[11px] text-[rgb(36_148_132)]">
                Saving updates the title screen map
              </p>
            ) : (
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Level name"
                className="min-w-0 flex-1 border border-[rgb(95_84_74)] bg-[rgb(42_112_151)] px-2 py-1.5 text-xs text-[rgb(210_196_138)] placeholder:text-[rgb(36_148_132)] focus:border-[rgb(210_196_138)] focus:outline-none"
              />
            )}
            <WoodButton type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : homeMap ? "Save home map" : "Save level"}
            </WoodButton>
          </div>
        </div>
      </section>

      <aside className="flex min-h-0 w-48 shrink-0 flex-col gap-3 overflow-y-auto border-l border-[rgb(95_84_74)] p-3 sm:w-56">
        <EditorPalette tool={tool} onSelect={handleSelectTool} />

        {process.env.NODE_ENV === "development" ? (
          <details className="border border-[rgb(95_84_74)] bg-[rgb(42_112_151)] open:pb-2">
            <summary className="cursor-pointer select-none px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[rgb(251_191_36)] hover:text-[rgb(210_196_138)]">
              Dev
            </summary>
            <div className="space-y-3 border-t border-[rgb(95_84_74)] px-2 pt-2">
              <label className="flex flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2 text-[11px] text-[rgb(210_196_138)]">
                  <span>Cell outline</span>
                  <span className="font-mono text-[rgb(72_176_210)]">
                    {cellGridOpacity === 0
                      ? "off"
                      : cellGridOpacity.toFixed(2).replace(/\.?0+$/, "")}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={cellGridOpacity}
                  onChange={(event) =>
                    handleCellGridOpacity(Number(event.target.value))
                  }
                  className="wood-slider"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2 text-[11px] text-[rgb(210_196_138)]">
                  <span>Water depth blend</span>
                  <span className="font-mono text-[rgb(72_176_210)]">
                    {waterDepthInterpolation.toFixed(2).replace(/\.?0+$/, "")}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={waterDepthInterpolation}
                  onChange={(event) =>
                    handleWaterDepthInterpolation(Number(event.target.value))
                  }
                  className="wood-slider"
                />
                <span className="text-[10px] text-[rgb(36_148_132)]">
                  0 = per-cell depth · 1 = full neighbor blend
                </span>
              </label>
            </div>
          </details>
        ) : null}

        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[rgb(72_176_210)]">
            Placed routes
          </p>
          {level.routes.length === 0 ? (
            <p className="mt-2 text-[11px] text-[rgb(36_148_132)]">No routes yet.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {level.routes.map((route) => {
                const definition = routeDefinition(route.defId);
                return (
                  <li
                    key={route.id}
                    className="flex items-center gap-2 border border-[rgb(95_84_74)] bg-[rgb(42_112_151)] px-2 py-1.5 text-[11px] text-[rgb(210_196_138)]"
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-4"
                      style={{ backgroundColor: definition?.color ?? "white" }}
                    />
                    <span className="flex-1 truncate">
                      {definition?.label ?? route.defId}
                      <span className="text-[rgb(36_148_132)]">
                        {" "}
                        · {route.path.length} pts{route.closed ? " · loop" : ""}
                      </span>
                    </span>
                    <WoodButton type="button" onClick={() => deleteRoute(route.id)}>
                      Delete
                    </WoodButton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

import { EditorPalette, type EditorTool } from "@/components/create/EditorPalette";
import { GameBoard } from "@/components/game/GameBoard";
import { GameStage } from "@/components/game/GameStage";
import type { DraftRoute } from "@/components/game/RouteCanvasOverlay";
import { HairlineButton, HairlineRow } from "@/components/ui/hairline";
import { saveLevelAction } from "@/app/actions/saveLevel";
import { homeMapFromLevel } from "@/lib/game/homeMap";
import { loadingLabels } from "@/lib/game/loadingRing";
import { tutorialLabels } from "@/lib/game/tutorialMap";
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
  isPlayableCell,
  terrainKindAt,
} from "@/lib/game/rules";
import type { Mission, TileKind } from "@/lib/game/types";

type DraftPuzzleViewProps = {
  level: Level;
  /** WHEN TRUE — EDITING THE TITLE MAP (X=HOME Y=PLAY Z=CREATE) */
  homeMap?: boolean;
  /** WHEN TRUE — EDITING THE LESSON (BOAR + FLOWERS 1 2 3) */
  tutorialMap?: boolean;
  /** WHEN TRUE — EDITING THE LOADING SQUARE (BOAR + THE TRACK HE RUNS) */
  loadingMap?: boolean;
};

function toolHint(
  tool: EditorTool,
  homeMap: boolean,
  tutorialMap: boolean,
  loadingMap: boolean,
): string {
  if (homeMap && !tool) {
    return "Drag HOME / PLAY / CREATE onto land. Select a tool to paint.";
  }
  if (tutorialMap && !tool) {
    return "Drag the boar and the flowers onto land. Select a tool to paint.";
  }
  if (loadingMap && !tool) {
    return "Drag the boar onto land. He runs the edge. Select a tool to paint.";
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
  tutorialMap = false,
  loadingMap = false,
}: DraftPuzzleViewProps) {
  const [level, setLevel] = useState<Level>(initialLevel);
  const [tool, setTool] = useState<EditorTool>(null);
  const [draftRoute, setDraftRoute] = useState<DraftRoute | null>(null);
  const [name, setName] = useState(() => initialLevel.name);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const emptyBridges = useMemo(() => new Set<string>(), []);
  const emptyPath = useMemo(() => new Set<string>(), []);
  const homeLabels = useMemo(
    () => (homeMap ? homeMapFromLevel(level).labels : undefined),
    [homeMap, level],
  );
  const lessonLabels = useMemo(
    () => (tutorialMap ? tutorialLabels(level) : undefined),
    [tutorialMap, level],
  );
  const squareLabels = useMemo(
    () => (loadingMap ? loadingLabels(level) : undefined),
    [loadingMap, level],
  );

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
      if (!isPlayableCell(prev, row, col)) {
        return prev;
      }
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

  const handleLoadingLabelMove = (id: string, row: number, col: number) => {
    if (id !== "boar") {
      return;
    }
    const kind = terrainKindAt(level, row, col);
    if (!kind || !isLandKind(kind)) {
      setStatus("Drop the boar on land.");
      return;
    }
    setStatus(null);
    setLevel((prev) => ({ ...prev, start: { row, col } }));
  };

  const handleTutorialLabelMove = (id: string, row: number, col: number) => {
    const kind = terrainKindAt(level, row, col);
    if (!kind || !isLandKind(kind)) {
      setStatus("Drop the boar and the flowers on land.");
      return;
    }
    setStatus(null);
    if (id === "boar") {
      setLevel((prev) => ({ ...prev, start: { row, col } }));
      return;
    }
    if (id !== "x" && id !== "y" && id !== "z") {
      return;
    }
    setLevel((prev) => ({
      ...prev,
      mission: {
        ...prev.mission,
        [id]: { row, col },
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

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    const toSave: Level = {
      ...level,
      // HOME AND THE TUTORIAL KEEP THEIR IDS
      id: homeMap ? "home" : tutorialMap ? "how" : loadingMap ? "loading" : level.id,
      name: homeMap
        ? "The Bridges Game"
        : tutorialMap
          ? "A small lunch"
          : loadingMap
            ? "The square"
            : name.trim() || level.id,
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <section className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="relative min-h-0 min-w-0 flex-1">
          <GameStage>
            <GameBoard
              level={level}
              bridges={emptyBridges}
              pathKeys={emptyPath}
              interactive={false}
              editable={tool !== null}
              onCellClick={handleCellClick}
              draftRoute={draftRoute}
              sizing="contain"
              bleed
              showMission={!homeMap && !loadingMap}
              showBoar={loadingMap}
              boarClick={!tutorialMap && !loadingMap}
              mapLabels={homeLabels ?? lessonLabels ?? squareLabels}
              mapLabelsDraggable={(homeMap || tutorialMap || loadingMap) && tool === null}
              onMapLabelMove={
                homeMap
                  ? handleHomeLabelMove
                  : tutorialMap
                    ? handleTutorialLabelMove
                    : loadingMap
                      ? handleLoadingLabelMove
                      : undefined
              }
            />
          </GameStage>
        </div>

        <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border border-black px-3 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <EditorPalette tool={tool} onSelect={handleSelectTool} />
            <p className="text-[10px] uppercase tracking-[0.14em]">
              {status ?? toolHint(tool, homeMap, tutorialMap, loadingMap)}
            </p>
          </div>
          <HairlineRow className="justify-end">
            {homeMap || tutorialMap || loadingMap ? null : (
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Level name"
                aria-label="Level name"
                className="w-40 border border-black bg-white px-2 py-1.5 text-[10px] uppercase tracking-[0.12em] text-black placeholder:text-black/40 focus:outline-none"
              />
            )}
            <HairlineButton type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving
                ? "Saving…"
                : homeMap
                  ? "Save home map"
                  : tutorialMap
                    ? "Save tutorial"
                    : loadingMap
                      ? "Save loading"
                      : "Save level"}
            </HairlineButton>
          </HairlineRow>
        </div>
      </section>
    </div>
  );
}

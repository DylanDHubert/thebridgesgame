"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { storeLevelThumb } from "@/app/actions/levelThumb";
import {
  EditorPalette,
  brushOffset,
  type BrushSize,
  type EditorTool,
} from "@/components/create/EditorPalette";
import { BoardColumn } from "@/components/game/BoardColumn";
import { BoardZoom, useBoardZoom } from "@/components/game/BoardZoom";
import { GameBoard, type StillGrab } from "@/components/game/GameBoard";
import type { DraftRoute } from "@/components/game/RouteCanvasOverlay";
import { HairlineButton, HairlineHeader, HairlineRow } from "@/components/ui/hairline";
import { useAuth } from "@/components/auth/AuthProvider";
import { cellKey } from "@/lib/game/coords";
import { perfectBridgeCost } from "@/lib/game/perfectScore";
import { stillPngBase64 } from "@/lib/rendering/stillPng";
import { savePlayerLevel } from "@/lib/supabase/scores";
import { homeEditorLabels } from "@/lib/game/homeMap";
import { tutorialLabels } from "@/lib/game/tutorialMap";
import type { Level } from "@/lib/game/level/types";
import {
  objectDefinition,
  routeDefinition,
} from "@/lib/game/objects/registry";
import {
  canPlaceBridgeAt,
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
  /** AFTER A PLAYER LEVEL IS STORED, PAINTING STOPS. */
  locked?: boolean;
  onPlayerSaved?: (levelId: string) => void;
};

function toolHint(tool: EditorTool, homeMap: boolean, tutorialMap: boolean): string {
  if (homeMap && !tool) {
    return "Drag each name onto its island. Clicks mark the bridges.";
  }
  if (tutorialMap && !tool) {
    return "Drag the boar and the flowers onto land. Select a tool to paint.";
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
    case "clicks":
      return "Click water to mark a required bridge. Click it again to clear the mark.";
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
  locked = false,
  onPlayerSaved,
}: DraftPuzzleViewProps) {
  const boardZoom = useBoardZoom();
  const [level, setLevel] = useState<Level>(initialLevel);
  const [tool, setTool] = useState<EditorTool>(null);
  const [brush, setBrush] = useState<BrushSize>(1);
  const [draftRoute, setDraftRoute] = useState<DraftRoute | null>(null);
  const [name, setName] = useState(() => initialLevel.name);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const stillRef = useRef<StillGrab | null>(null);

  const emptyBridges = useMemo(() => new Set<string>(), []);
  const emptyPath = useMemo(() => new Set<string>(), []);
  const homeLabels = useMemo(
    () => (homeMap ? homeEditorLabels(level) : undefined),
    [homeMap, level],
  );
  const lessonLabels = useMemo(
    () => (tutorialMap ? tutorialLabels(level) : undefined),
    [tutorialMap, level],
  );
  // SELECTING A ROUTE TOOL STARTS/KEEPS A DRAFT ROUTE; OTHER TOOLS CLEAR IT
  const handleSelectTool = (next: EditorTool) => {
    if (locked) {
      return;
    }
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

  const paintTerrain = (row: number, col: number, kind: TileKind, size: BrushSize) => {
    const origin = brushOffset(size);
    setLevel((prev) => {
      const terrain = prev.terrain.slice();
      let changed = false;
      for (let dr = 0; dr < size; dr += 1) {
        for (let dc = 0; dc < size; dc += 1) {
          const nextRow = row + origin + dr;
          const nextCol = col + origin + dc;
          if (!isPlayableCell(prev, nextRow, nextCol)) {
            continue;
          }
          const index = nextRow * prev.cols + nextCol;
          if (terrain[index] === kind) {
            continue;
          }
          terrain[index] = kind;
          changed = true;
        }
      }
      if (!changed) {
        return prev;
      }
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
      setStatus("Drop a name on land.");
      return;
    }
    if (id === "daily") {
      setStatus(null);
      setLevel((prev) => ({ ...prev, daily: { row, col } }));
      return;
    }
    if (id === "calendar" || id === "creatures" || id === "how") {
      setStatus(null);
      setLevel((prev) => ({
        ...prev,
        spots: { ...prev.spots, [id]: { row, col } },
      }));
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

  const toggleClick = (row: number, col: number) => {
    if (!isPlayableCell(level, row, col) || !canPlaceBridgeAt(level, row, col)) {
      setStatus(homeMap ? "Home clicks go on water." : "Lesson clicks go on water.");
      return;
    }
    setStatus(null);
    setLevel((prev) => {
      const clicks = prev.clicks ?? [];
      const marked = clicks.some((cell) => cell.row === row && cell.col === col);
      const next = marked
        ? clicks.filter((cell) => cell.row !== row || cell.col !== col)
        : [...clicks, { row, col }];
      return { ...prev, clicks: next.length > 0 ? next : undefined };
    });
  };

  const handleCellClick = (row: number, col: number) => {
    if (locked || !tool) {
      return;
    }
    switch (tool.type) {
      case "terrain":
        paintTerrain(row, col, tool.kind, brush);
        break;
      case "object":
        placeObject(row, col, tool.defId);
        break;
      case "erase":
        eraseObject(row, col);
        break;
      case "clicks":
        toggleClick(row, col);
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
      id: homeMap ? "home" : level.id,
      name: homeMap ? "The Bridges Game" : tutorialMap ? level.name : name.trim() || level.id,
    };
    try {
      const solver = homeMap || tutorialMap ? null : perfectBridgeCost(toSave);
      const result = await savePlayerLevel(
        toSave,
        auth.userId,
        auth.accessToken,
        solver,
        homeMap ? "home" : tutorialMap ? "how" : "player",
      );
      setStatus(result.ok ? "Saved" : `Save failed: ${result.error ?? "unknown"}`);
      if (result.ok) {
        const still = await stillRef.current?.();
        if (still) {
          await storeLevelThumb(toSave.id, await stillPngBase64(still));
        }
        router.refresh();
        if (!homeMap && !tutorialMap) {
          onPlayerSaved?.(toSave.id);
        }
      }
    } catch (error) {
      setStatus(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const clickKeys = useMemo(() => {
    if ((!tutorialMap && !homeMap) || !level.clicks || level.clicks.length === 0) {
      return undefined;
    }
    return new Set(level.clicks.map((cell) => cellKey(cell.row, cell.col)));
  }, [level.clicks, tutorialMap, homeMap]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <BoardColumn
        board={
          <GameBoard
            level={level}
            bridges={emptyBridges}
            pathKeys={emptyPath}
            interactive={false}
            editable={tool !== null && !locked}
            onCellClick={handleCellClick}
            draftRoute={draftRoute}
            sizing="contain"
            bleed
            stillRef={stillRef}
            showMission={!homeMap}
            creatures={false}
            boarClick={!tutorialMap}
            hintKeys={clickKeys}
            hintLocks={false}
            mapLabels={homeLabels ?? lessonLabels}
            mapLabelsDraggable={(homeMap || tutorialMap) && tool === null}
            zoom={boardZoom.zoom}
            onMapLabelMove={
              homeMap
                ? handleHomeLabelMove
                : tutorialMap
                  ? handleTutorialLabelMove
                  : undefined
            }
          />
        }
        bar={
        <div className="flex w-full flex-wrap items-center justify-between gap-3 border border-black px-3 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <EditorPalette
              tool={tool}
              onSelect={handleSelectTool}
              brush={brush}
              onBrush={setBrush}
              marks={tutorialMap || homeMap}
            />
            <p className="text-[10px] uppercase tracking-[0.14em]">
              {status ?? toolHint(tool, homeMap, tutorialMap)}
            </p>
          </div>
          <HairlineRow className="justify-end">
            <BoardZoom
              onZoomIn={boardZoom.zoomIn}
              onZoomOut={boardZoom.zoomOut}
              atMin={boardZoom.atMin}
              atMax={boardZoom.atMax}
            />
            {homeMap || tutorialMap ? null : (
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={locked}
                placeholder="Level name"
                aria-label="Level name"
                className="w-40 border border-black bg-white px-2 py-1.5 text-[10px] uppercase tracking-[0.12em] text-black placeholder:text-black/40 focus:outline-none"
              />
            )}
            <HairlineButton type="button" onClick={handleSave} disabled={isSaving || locked}>
              {isSaving
                ? "Saving…"
                : homeMap
                  ? "Save home map"
                : tutorialMap
                  ? "Save tutorial"
                  : "Save level"}
            </HairlineButton>
          </HairlineRow>
        </div>
        }
      />
    </div>
  );
}

/** CREATE PAGE SHELL. A SAVED PLAYER LEVEL LOCKS THE BOARD AND OPENS THE MENU. */
export function CreateEditor({
  level,
  homeMap = false,
  tutorialMap = false,
  subtitle,
}: {
  level: Level;
  homeMap?: boolean;
  tutorialMap?: boolean;
  subtitle: string;
}) {
  const [playHref, setPlayHref] = useState<string | null>(null);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <HairlineHeader
        title="Create"
        subtitle={subtitle}
        nav="create"
        playHref={playHref}
        menuOpen={playHref != null}
        menuLocked={playHref != null}
      />
      <div className="min-h-0 flex-1">
        <DraftPuzzleView
          level={level}
          homeMap={homeMap}
          tutorialMap={tutorialMap}
          locked={playHref != null}
          onPlayerSaved={(id) => {
            setPlayHref(`/play?level=${encodeURIComponent(id)}`);
          }}
        />
      </div>
    </div>
  );
}

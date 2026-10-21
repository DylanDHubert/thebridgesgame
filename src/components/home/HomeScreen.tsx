"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BoardColumn } from "@/components/game/BoardColumn";
import { GameBoard } from "@/components/game/GameBoard";
import { useBoarPassage } from "@/components/loading/BoarPassage";
import type { MapLabel } from "@/components/game/MapLabelOverlay";
import { VolumeControls } from "@/components/sound/VolumeControls";
import { HairlineHeader } from "@/components/ui/hairline";
import { cellKey } from "@/lib/game/coords";
import {
  homeMapFromLevel,
  resolveHomeDestination,
  type HomeDestination,
} from "@/lib/game/homeMap";
import type { Level } from "@/lib/game/level/types";
import { terrainKindAt } from "@/lib/game/rules";
import { canPlaceBridgeAt, shortestPath } from "@/lib/game/simulateLevel";
import type { CellCoord } from "@/lib/game/types";
import { CREATE_OPEN } from "@/lib/devMode";
import { boarTravelMs } from "@/lib/rendering/boar";
import { playBridgeToggle } from "@/lib/sound/bed";

type HomeScreenProps = {
  level: Level;
};

function emptyBridges(): Set<string> {
  return new Set();
}

function destinationHref(destination: HomeDestination): string {
  if (destination === "play") {
    return "/play";
  }
  if (destination === "create") {
    return "/create";
  }
  return "/how";
}

/** TITLE MAP — BOAR RUNS TO PLAY, CREATE, OR HOW BEFORE THE PAGE OPENS */
export function HomeScreen({ level }: HomeScreenProps) {
  const depart = useBoarPassage();
  const map = useMemo(() => homeMapFromLevel(level), [level]);
  const [bridges, setBridges] = useState<Set<string>>(emptyBridges);
  const [runPath, setRunPath] = useState<CellCoord[]>([]);
  const emptyPath = useMemo(() => new Set<string>(), []);
  const navigatedRef = useRef(false);
  const boardLevel = useMemo(
    () => ({ ...map.level, start: map.homeOrigin }),
    [map.level, map.homeOrigin],
  );
  const labels = useMemo(() => {
    const shown: MapLabel[] = map.labels
      .filter((label) => label.id !== "home")
      .map((label) =>
        label.id === "create" && !CREATE_OPEN
          ? { ...label, label: "COMING SOON", color: "#ef4444" }
          : label,
      );
    if (map.howAt) {
      shown.push({
        id: "how",
        label: "HOW",
        at: map.howAt,
        color: "#fbbf24",
      });
    }
    return shown;
  }, [map.howAt, map.labels]);

  const toggleBridge = (row: number, col: number) => {
    if (navigatedRef.current || !canPlaceBridgeAt(map.level, row, col)) {
      return;
    }
    const key = cellKey(row, col);
    playBridgeToggle(terrainKindAt(map.level, row, col), bridges.has(key));
    setBridges((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  useEffect(() => {
    if (navigatedRef.current) {
      return;
    }
    const destination = resolveHomeDestination(
      map.level,
      bridges,
      map.homeOrigin,
      map.playCells,
      map.createCells,
      map.howCells,
      CREATE_OPEN,
    );
    if (!destination) {
      return;
    }
    const target =
      destination === "play"
        ? map.level.mission.y
        : destination === "create"
          ? map.level.mission.z
          : map.howAt;
    const path = target
      ? shortestPath(map.level, bridges, map.homeOrigin, target)
      : [];
    navigatedRef.current = true;
    setRunPath(path);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = reduced ? 0 : boarTravelMs(path);
    console.log("[journeyman:home] bridged to", destination, { steps: path.length, wait });
    window.setTimeout(() => {
      depart(destinationHref(destination));
    }, wait);
  }, [bridges, map, depart]);

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden">
      <HairlineHeader title="Home" subtitle="The Bridges Game" nav="home" />
      <BoardColumn
        board={
          <GameBoard
            level={boardLevel}
            bridges={bridges}
            pathKeys={emptyPath}
            runPath={runPath}
            showMission={false}
            showBoar
            interactive
            sizing="contain"
            bleed
            mapLabels={labels}
            onToggleBridge={toggleBridge}
          />
        }
        bar={
          <div className="flex w-full items-center justify-end border border-black px-3 py-2.5">
            <VolumeControls />
          </div>
        }
      />
    </main>
  );
}

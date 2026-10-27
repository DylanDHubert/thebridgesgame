"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BoardColumn } from "@/components/game/BoardColumn";
import { GameBoard } from "@/components/game/GameBoard";
import { useBoarPassage } from "@/components/loading/BoarPassage";
import { GearButton } from "@/components/settings/GearButton";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { HairlineHeader } from "@/components/ui/hairline";
import { cellKey } from "@/lib/game/coords";
import {
  HOME_LINKS,
  homeDestinationAt,
  homeMapFromLevel,
  homePathClicks,
  resolveHomeDestination,
  type HomeDestination,
} from "@/lib/game/homeMap";
import type { Level } from "@/lib/game/level/types";
import { terrainKindAt } from "@/lib/game/rules";
import { canPlaceBridgeAt, shortestPath } from "@/lib/game/simulateLevel";
import type { CellCoord } from "@/lib/game/types";
import { boarTravelMs } from "@/lib/rendering/boar";
import { playBridgeToggle } from "@/lib/sound/bed";

type HomeScreenProps = {
  level: Level;
};

function emptyBridges(): Set<string> {
  return new Set();
}

const HOME_ASKS = [
  "i can't swim! bridge me over.",
  "yellow planks. i refuse the water.",
  "build that and i will walk.",
  "you do the wood.",
  "see the yellow? that is the way.",
  "i would go if the bridge were there.",
] as const;

function destinationHref(destination: HomeDestination): string {
  return HOME_LINKS.find((link) => link.id === destination)?.href ?? "/";
}

/** TITLE MAP. THE BOAR RUNS TO A MENU ISLAND, THEN THAT PAGE OPENS. */
export function HomeScreen({ level }: HomeScreenProps) {
  const depart = useBoarPassage();
  const map = useMemo(() => homeMapFromLevel(level), [level]);
  const [bridges, setBridges] = useState<Set<string>>(emptyBridges);
  const [settings, setSettings] = useState(false);
  const [runPath, setRunPath] = useState<CellCoord[]>([]);
  const [asked, setAsked] = useState<HomeDestination | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const emptyPath = useMemo(() => new Set<string>(), []);
  const navigatedRef = useRef(false);
  const askIndex = useRef(0);
  const boardLevel = useMemo(
    () => ({ ...map.level, start: map.homeOrigin }),
    [map.level, map.homeOrigin],
  );
  const labels = useMemo(
    () => map.labels.filter((label) => label.id !== "home"),
    [map.labels],
  );
  const pressKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const link of HOME_LINKS) {
      for (const key of map.islands[link.id]) {
        keys.add(key);
      }
    }
    return keys;
  }, [map]);
  const hintKeys = useMemo(() => {
    if (!asked) {
      return undefined;
    }
    const left = homePathClicks(map, asked)
      .map((cell) => cellKey(cell.row, cell.col))
      .filter((key) => !bridges.has(key));
    return left.length > 0 ? new Set(left) : undefined;
  }, [asked, map, bridges]);

  const askForBridge = (destination: HomeDestination) => {
    if (navigatedRef.current) {
      return;
    }
    const next = HOME_ASKS[askIndex.current % HOME_ASKS.length]!;
    askIndex.current += 1;
    setLine(next);
    setAsked(destination);
    console.log("[journeyman:home] ask", {
      destination,
      line: next,
      clicks: homePathClicks(map, destination).length,
    });
  };

  const toggleBridge = (row: number, col: number) => {
    if (navigatedRef.current) {
      return;
    }
    const destination = homeDestinationAt(map, row, col);
    if (destination) {
      askForBridge(destination);
      return;
    }
    if (!canPlaceBridgeAt(map.level, row, col)) {
      return;
    }
    const key = cellKey(row, col);
    playBridgeToggle(terrainKindAt(map.level, row, col), bridges.has(key));
    const next = new Set(bridges);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setBridges(next);
  };

  useEffect(() => {
    if (navigatedRef.current) {
      return;
    }
    const destination = resolveHomeDestination(map, bridges);
    if (!destination) {
      return;
    }
    const target = map.anchors[destination];
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
            creatures={false}
            showBoar
            interactive
            sizing="contain"
            bleed
            mapLabels={labels}
            onMapLabelSelect={(id) => {
              const link = HOME_LINKS.find((item) => item.id === id);
              if (link) {
                askForBridge(link.id);
              }
            }}
            hintKeys={hintKeys}
            pressKeys={pressKeys}
            hintLocks={false}
            boarLine={line ?? undefined}
            onToggleBridge={toggleBridge}
          />
        }
        bar={
          <>
            <div className="flex w-full items-center justify-end border border-black px-3 py-2.5">
              <GearButton onClick={() => setSettings(true)} />
            </div>
            {settings ? <SettingsDialog onClose={() => setSettings(false)} /> : null}
          </>
        }
      />
    </main>
  );
}

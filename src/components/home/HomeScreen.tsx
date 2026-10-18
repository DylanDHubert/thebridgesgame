"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { GameBoard } from "@/components/game/GameBoard";
import { WoodenHeader } from "@/components/home/WoodenHeader";
import { cellKey } from "@/lib/game/coords";
import {
  homeMapFromLevel,
  resolveHomeDestination,
} from "@/lib/game/homeMap";
import type { Level } from "@/lib/game/level/types";
import { canPlaceBridgeAt } from "@/lib/game/simulateLevel";

type HomeScreenProps = {
  level: Level;
};

function emptyBridges(): Set<string> {
  return new Set();
}

/** TITLE MAP — BRIDGE FROM HOME ISLAND TO PLAY OR CREATE */
export function HomeScreen({ level }: HomeScreenProps) {
  const router = useRouter();
  const map = useMemo(() => homeMapFromLevel(level), [level]);
  const [bridges, setBridges] = useState<Set<string>>(emptyBridges);
  const emptyPath = useMemo(() => new Set<string>(), []);
  const navigatedRef = useRef(false);

  const toggleBridge = (row: number, col: number) => {
    if (!canPlaceBridgeAt(map.level, row, col)) {
      return;
    }
    const key = cellKey(row, col);
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
    );
    if (!destination) {
      return;
    }
    navigatedRef.current = true;
    console.log("[journeyman:home] bridged to", destination);
    router.push(destination === "play" ? "/play" : "/create");
  }, [bridges, map, router]);

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden">
      <WoodenHeader
        title="the bridges game"
        subtitle="bridge!"
      />
      <div className="flex min-h-0 w-full flex-1 p-3 sm:p-4">
        <GameBoard
          level={map.level}
          bridges={bridges}
          pathKeys={emptyPath}
          showMission={false}
          interactive
          sizing="contain"
          framed
          mapLabels={map.labels}
          onToggleBridge={toggleBridge}
        />
      </div>
    </main>
  );
}

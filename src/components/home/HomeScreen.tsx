"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { GameBoard } from "@/components/game/GameBoard";
import { GameStage } from "@/components/game/GameStage";
import { HairlineHeader } from "@/components/ui/hairline";
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
    <main className="flex h-dvh w-full flex-col overflow-hidden">
      <HairlineHeader title="Home" subtitle="The Bridges Game" nav="home" />
      <section className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="relative min-h-0 min-w-0 flex-1">
          <GameStage>
            <GameBoard
              level={map.level}
              bridges={bridges}
              pathKeys={emptyPath}
              showMission={false}
              interactive
              sizing="contain"
              bleed
              mapLabels={map.labels}
              onToggleBridge={toggleBridge}
            />
          </GameStage>
        </div>
        <div className="flex w-full shrink-0 items-center justify-between gap-3 border border-black px-3 py-2.5">
          <p className="inline-flex items-center border border-transparent py-1.5 text-[10px] uppercase tracking-[0.14em]">
            Bridge from home to play or create
          </p>
        </div>
      </section>
    </main>
  );
}

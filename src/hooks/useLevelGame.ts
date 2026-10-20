"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { cellKey } from "@/lib/game/coords";
import type { Level } from "@/lib/game/level/types";
import { terrainKindAt } from "@/lib/game/rules";
import { canPlaceBridgeAt, simulateLevel } from "@/lib/game/simulateLevel";
import type { GamePhase, SimulationResult } from "@/lib/game/types";
import { playBridgeToggle } from "@/lib/sound/bed";

type UseLevelGameResult = {
  bridges: Set<string>;
  phase: GamePhase;
  result: SimulationResult | null;
  pathKeys: Set<string>;
  bridgeCost: number;
  toggleBridge: (row: number, col: number) => void;
  clearBridges: () => void;
  checkSolution: () => void;
};

function emptyBridges(): Set<string> {
  return new Set();
}

/**
 * PLAY SESSION — BRIDGES EDIT FREELY; CHECK RUNS simulateLevel TO CONFIRM.
 */
export function useLevelGame(level: Level): UseLevelGameResult {
  const [bridges, setBridges] = useState<Set<string>>(emptyBridges);
  const bridgesRef = useRef(bridges);
  bridgesRef.current = bridges;
  const [phase, setPhase] = useState<GamePhase>("editing");
  const [result, setResult] = useState<SimulationResult | null>(null);

  const bridgeCost = useMemo(
    () => simulateLevel(level, bridges).bridgeCost,
    [level, bridges],
  );

  const pathKeys = useMemo(() => {
    if (phase !== "success" || !result?.connected) {
      return new Set<string>();
    }
    return new Set(result.path.map((cell) => cellKey(cell.row, cell.col)));
  }, [phase, result]);

  const toggleBridge = useCallback(
    (row: number, col: number) => {
      if (!canPlaceBridgeAt(level, row, col)) {
        return;
      }
      const key = cellKey(row, col);
      playBridgeToggle(
        terrainKindAt(level, row, col),
        bridgesRef.current.has(key),
      );
      setBridges((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
      setPhase("editing");
      setResult(null);
    },
    [level],
  );

  const clearBridges = useCallback(() => {
    setBridges(emptyBridges());
    setPhase("editing");
    setResult(null);
  }, []);

  const checkSolution = useCallback(() => {
    const next = simulateLevel(level, bridges);
    setResult(next);
    setPhase(next.connected ? "success" : "disconnected");
    console.log("[journeyman:play] check solution", {
      levelId: level.id,
      connected: next.connected,
      bridgeCost: next.bridgeCost,
      bridgeCount: next.bridgeCount,
    });
  }, [level, bridges]);

  return {
    bridges,
    phase,
    result,
    pathKeys,
    bridgeCost,
    toggleBridge,
    clearBridges,
    checkSolution,
  };
}

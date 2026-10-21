"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { cellKey } from "@/lib/game/coords";
import { isoLatticeCells } from "@/lib/game/isoBoard";
import type { Level } from "@/lib/game/level/types";
import { isLandKind, terrainKindAt } from "@/lib/game/rules";
import { canPlaceBridgeAt, simulateLevel } from "@/lib/game/simulateLevel";
import type { GamePhase, SimulationResult } from "@/lib/game/types";
import { playBridgeToggle } from "@/lib/sound/bed";

type UseLevelGameResult = {
  bridges: Set<string>;
  phase: GamePhase;
  result: SimulationResult | null;
  pathKeys: Set<string>;
  bridgeCost: number;
  /** PLAYABLE CELLS OUTSIDE HIS REACH AFTER A FAILED CHECK. */
  miss: { id: number; keys: string[] } | null;
  toggleBridge: (row: number, col: number) => void;
  clearBridges: () => void;
  checkSolution: () => void;
};

function emptyBridges(): Set<string> {
  return new Set();
}

/** LAND AND BRIDGES HE CANNOT REACH. OPEN WATER STAYS UNLIT. */
function unreachablePlayKeys(
  level: Level,
  bridges: Set<string>,
  reachable: Set<string>,
): string[] {
  const keys: string[] = [];
  for (const cell of isoLatticeCells(level.iso)) {
    if (cell.role !== "play") {
      continue;
    }
    const key = cellKey(cell.row, cell.col);
    if (reachable.has(key)) {
      continue;
    }
    const kind = terrainKindAt(level, cell.row, cell.col);
    if ((kind && isLandKind(kind)) || bridges.has(key)) {
      keys.push(key);
    }
  }
  return keys;
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
  const [miss, setMiss] = useState<{ id: number; keys: string[] } | null>(null);
  const missSerial = useRef(0);

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
      setMiss(null);
    },
    [level],
  );

  const clearBridges = useCallback(() => {
    setBridges(emptyBridges());
    setPhase("editing");
    setResult(null);
    setMiss(null);
  }, []);

  const checkSolution = useCallback(() => {
    const next = simulateLevel(level, bridges);
    setResult(next);
    if (next.connected) {
      setMiss(null);
      setPhase("success");
    } else {
      missSerial.current += 1;
      setMiss({
        id: missSerial.current,
        keys: unreachablePlayKeys(level, bridges, next.reachable),
      });
      setPhase("disconnected");
    }
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
    miss,
    toggleBridge,
    clearBridges,
    checkSolution,
  };
}

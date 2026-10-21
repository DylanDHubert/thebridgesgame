"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { cellKey } from "@/lib/game/coords";
import { isoLatticeCells } from "@/lib/game/isoBoard";
import type { Level } from "@/lib/game/level/types";
import { isLandKind, terrainKindAt } from "@/lib/game/rules";
import { canPlaceBridgeAt, simulateLevel } from "@/lib/game/simulateLevel";
import type { CellCoord, GamePhase, SimulationResult } from "@/lib/game/types";
import { playBridgeToggle } from "@/lib/sound/bed";

type UseLevelGameResult = {
  bridges: Set<string>;
  phase: GamePhase;
  result: SimulationResult | null;
  pathKeys: Set<string>;
  bridgeCost: number;
  /** GOLD IS REACHABLE. RED IS LAND HE CANNOT REACH. A NEW ID RESTARTS THE FLOOD. */
  reach: BoardReach | null;
  toggleBridge: (row: number, col: number) => void;
  clearBridges: () => void;
  checkSolution: () => void;
  submitSolution: () => void;
};

function emptyBridges(): Set<string> {
  return new Set();
}

export type BoardReach = {
  id: number;
  gold: string[];
  red: string[];
  origin: CellCoord;
};

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

/** THE PLAY CHECK FLOOD. A NEW ID RESTARTS THE WASH. */
export function boardReach(
  level: Level,
  bridges: Set<string>,
  id: number,
  origin: CellCoord,
): BoardReach {
  const next = simulateLevel(level, bridges);
  return {
    id,
    gold: [...next.reachable],
    red: unreachablePlayKeys(level, bridges, next.reachable),
    origin,
  };
}

/**
 * PLAY SESSION — BRIDGES EDIT FREELY; CHECK RUNS simulateLevel TO CONFIRM.
 */
export function useLevelGame(
  level: Level,
  options?: { holdForSubmit?: boolean },
): UseLevelGameResult {
  const [bridges, setBridges] = useState<Set<string>>(emptyBridges);
  const bridgesRef = useRef(bridges);
  bridgesRef.current = bridges;
  const [phase, setPhase] = useState<GamePhase>("editing");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [reach, setReach] = useState<UseLevelGameResult["reach"]>(null);
  const reachSerial = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const holdForSubmit = options?.holdForSubmit ?? false;

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
      setReach(null);
    },
    [level],
  );

  const clearBridges = useCallback(() => {
    setBridges(emptyBridges());
    setPhase("editing");
    setResult(null);
    setReach(null);
  }, []);

  const checkSolution = useCallback(() => {
    if (phaseRef.current === "success") {
      return;
    }
    const next = simulateLevel(level, bridges);
    setResult(next);
    reachSerial.current += 1;
    setReach(
      boardReach(
        level,
        bridges,
        reachSerial.current,
        level.start ?? level.mission.x,
      ),
    );
    if (next.connected) {
      setPhase(holdForSubmit ? "valid" : "success");
    } else {
      setPhase("disconnected");
    }
    console.log("[journeyman:play] check solution", {
      levelId: level.id,
      connected: next.connected,
      bridgeCost: next.bridgeCost,
      bridgeCount: next.bridgeCount,
    });
  }, [level, bridges, holdForSubmit]);

  const submitSolution = useCallback(() => {
    if (phaseRef.current !== "valid") {
      return;
    }
    setPhase("success");
    console.log("[journeyman:play] submit", { levelId: level.id });
  }, [level.id]);

  return {
    bridges,
    phase,
    result,
    pathKeys,
    bridgeCost,
    reach,
    toggleBridge,
    clearBridges,
    checkSolution,
    submitSolution,
  };
}

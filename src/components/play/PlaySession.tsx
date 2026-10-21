"use client";

import { useEffect, useState } from "react";

import { BoardColumn } from "@/components/game/BoardColumn";
import { GameBoard } from "@/components/game/GameBoard";
import { ScoreHome } from "@/components/play/ScoreHome";
import { HairlineButton, HairlineHeader, HairlineRow } from "@/components/ui/hairline";
import { useLevelGame } from "@/hooks/useLevelGame";
import { markOptimal, rememberBestScore } from "@/lib/game/bestScore";
import type { Level } from "@/lib/game/level/types";
import { perfectBridgeCost } from "@/lib/game/perfectScore";
import { boarHomeMs } from "@/lib/rendering/boar";

type PlaySessionProps = {
  level: Level;
};

function statusLabel(
  phase: "editing" | "success" | "disconnected",
  cost: number,
): string {
  switch (phase) {
    case "success":
      return `Valid route · cost ${cost}`;
    case "disconnected":
      return "Not connected — keep bridging";
    default:
      return `Place bridges · cost ${cost}`;
  }
}

/** PLAY SESSION — BOARD + STATUS BAR */
export function PlaySession({ level }: PlaySessionProps) {
  const {
    bridges,
    phase,
    result,
    pathKeys,
    bridgeCost,
    miss,
    toggleBridge,
    clearBridges,
    checkSolution,
  } = useLevelGame(level);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [priorBest, setPriorBest] = useState<number | null>(null);
  const [optimal, setOptimal] = useState(false);

  const success = phase === "success";
  const confirmedCost = result?.bridgeCost ?? bridgeCost;

  useEffect(() => {
    if (!success || !result?.connected || !level.start) {
      setScoreOpen(false);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = reduced
      ? 0
      : boarHomeMs({
          start: level.start,
          path: result.path,
          flowers: [level.mission.x, level.mission.y, level.mission.z],
          beganAt: 0,
          level,
          bridges,
        });
    const timer = window.setTimeout(() => {
      const best = rememberBestScore(level.id, result.bridgeCost);
      const target = perfectBridgeCost(level);
      const achieved = target != null && result.bridgeCost <= target;
      if (achieved) {
        markOptimal(level.id);
      }
      setPriorBest(best);
      setOptimal(achieved);
      setScoreOpen(true);
      console.log("[journeyman:play] home", {
        levelId: level.id,
        score: result.bridgeCost,
        best,
        achieved,
      });
    }, wait);
    return () => window.clearTimeout(timer);
  }, [success, result, level, bridges]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <HairlineHeader title="Play" subtitle={level.name} nav="play" />
      <BoardColumn
        board={
          <GameBoard
            level={level}
            bridges={bridges}
            pathKeys={pathKeys}
            runPath={success ? (result?.path ?? []) : []}
            interactive
            sizing="contain"
            bleed
            onToggleBridge={toggleBridge}
            missId={miss?.id ?? 0}
            missKeys={miss?.keys}
          />
        }
        bar={
          <div className="flex w-full items-center justify-between gap-3 border border-black px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em]">
              {statusLabel(phase, confirmedCost)}
            </p>
            <HairlineRow className="justify-end">
              <HairlineButton onClick={checkSolution}>Check</HairlineButton>
              <HairlineButton onClick={clearBridges}>Clear</HairlineButton>
            </HairlineRow>
          </div>
        }
      />
      {scoreOpen ? (
        <ScoreHome score={confirmedCost} best={priorBest} optimal={optimal} />
      ) : null}
    </div>
  );
}

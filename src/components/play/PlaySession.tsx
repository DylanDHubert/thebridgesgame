"use client";

import { GameBoard } from "@/components/game/GameBoard";
import { GameStage } from "@/components/game/GameStage";
import {
  HairlineButton,
  HairlineHeader,
  HairlineLink,
  HairlineRow,
} from "@/components/ui/hairline";
import { useLevelGame } from "@/hooks/useLevelGame";
import type { Level } from "@/lib/game/level/types";

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
    toggleBridge,
    clearBridges,
    checkSolution,
  } = useLevelGame(level);

  const success = phase === "success";
  const confirmedCost = result?.bridgeCost ?? bridgeCost;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <HairlineHeader title="Play" subtitle={level.name} nav="play" />
      <section className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="relative min-h-0 min-w-0 flex-1">
          <GameStage>
            <GameBoard
              level={level}
              bridges={bridges}
              pathKeys={pathKeys}
              runPath={success ? (result?.path ?? []) : []}
              interactive
              sizing="contain"
              bleed
              onToggleBridge={toggleBridge}
            />
          </GameStage>
        </div>

        <div className="flex w-full shrink-0 items-center justify-between gap-3 border border-black px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.14em]">
            {statusLabel(phase, confirmedCost)}
          </p>
          <HairlineRow className="justify-end">
            <HairlineButton onClick={checkSolution}>Check</HairlineButton>
            <HairlineButton onClick={clearBridges}>Clear</HairlineButton>
            <HairlineLink href="/play">Levels</HairlineLink>
          </HairlineRow>
        </div>
      </section>
    </div>
  );
}

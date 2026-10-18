"use client";

import { GameBoard } from "@/components/game/GameBoard";
import { WoodenHeader } from "@/components/home/WoodenHeader";
import {
  WoodButton,
  WoodControlRow,
  WoodFrame,
  WoodLink,
} from "@/components/ui/woodPlaque";
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
      <WoodenHeader title="Play" subtitle={level.name} nav="play" />
      <section className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="min-h-0 flex-1">
          <GameBoard
            level={level}
            bridges={bridges}
            pathKeys={pathKeys}
            runPath={success ? (result?.path ?? []) : []}
            interactive
            sizing="contain"
            framed
            onToggleBridge={toggleBridge}
          />
        </div>

        <WoodFrame className="flex w-full shrink-0">
          <div className="flex w-full items-center justify-between gap-3 px-3 py-2.5">
            <p
              className={
                phase === "disconnected"
                  ? "text-[11px] text-[rgb(248_113_113)]"
                  : phase === "success"
                    ? "text-[11px] text-[rgb(78_145_66)]"
                    : "text-[11px] text-[rgb(210_196_138)]"
              }
            >
              {statusLabel(phase, confirmedCost)}
            </p>
            <WoodControlRow className="justify-end">
              <WoodButton onClick={checkSolution}>Check</WoodButton>
              <WoodButton onClick={clearBridges}>Clear</WoodButton>
              <WoodLink href="/play">Levels</WoodLink>
            </WoodControlRow>
          </div>
        </WoodFrame>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";

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
import { tutorialNarration } from "@/lib/game/tutorialMap";

type HowLessonProps = {
  level: Level;
};

/** A TINY MAP. HE TALKS, YOU BRIDGE, HE EATS. */
export function HowLesson({ level }: HowLessonProps) {
  const {
    bridges,
    phase,
    result,
    pathKeys,
    toggleBridge,
    clearBridges,
    checkSolution,
  } = useLevelGame(level);
  const [met, setMet] = useState(false);
  const success = phase === "success";
  const line = tutorialNarration(level, bridges, met, phase);

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden">
      <HairlineHeader nav="how" />
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
              onBoarClick={() => setMet(true)}
              boarLine={line}
            />
          </GameStage>
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-3 border border-black px-3 py-2.5">
          <HairlineRow className="justify-end">
            {success ? (
              <HairlineLink href="/play">Bigger lunch</HairlineLink>
            ) : (
              <HairlineButton onClick={checkSolution}>Check</HairlineButton>
            )}
            <HairlineButton onClick={clearBridges}>Clear</HairlineButton>
          </HairlineRow>
        </div>
      </section>
    </main>
  );
}

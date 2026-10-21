"use client";

import { useMemo, useState } from "react";

import { BoardColumn } from "@/components/game/BoardColumn";
import { GameBoard } from "@/components/game/GameBoard";
import {
  HairlineButton,
  HairlineHeader,
  HairlineLink,
  HairlineRow,
} from "@/components/ui/hairline";
import { useLevelGame } from "@/hooks/useLevelGame";
import type { Level } from "@/lib/game/level/types";
import { tutorialCue } from "@/lib/game/tutorialMap";

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
    miss,
    toggleBridge,
    clearBridges,
    checkSolution,
  } = useLevelGame(level);
  const [met, setMet] = useState(false);
  const success = phase === "success";
  const step = tutorialCue(level, bridges, met, phase);
  const hintCells = step.cells.join("|");
  const hintKeys = useMemo(
    () => new Set(hintCells ? hintCells.split("|") : []),
    [hintCells],
  );

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden">
      <HairlineHeader nav="how" />
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
            onBoarClick={() => setMet(true)}
            boarLine={step.line}
            hintKeys={hintKeys}
            missId={miss?.id ?? 0}
            missKeys={miss?.keys}
          />
        }
        bar={
          <div className="flex w-full items-center justify-end gap-3 border border-black px-3 py-2.5">
            <HairlineRow className="justify-end">
              {success ? (
                <HairlineLink href="/play">Bigger lunch</HairlineLink>
              ) : (
                <HairlineButton
                  onClick={checkSolution}
                  disabled={!step.allowCheck}
                  style={step.allowCheck ? { background: "#fbbf24" } : undefined}
                >
                  Check
                </HairlineButton>
              )}
              <HairlineButton
                onClick={() => {
                  clearBridges();
                  setMet(false);
                }}
              >
                Clear
              </HairlineButton>
            </HairlineRow>
          </div>
        }
      />
    </main>
  );
}

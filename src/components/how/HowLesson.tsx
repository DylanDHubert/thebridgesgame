"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { TileSwatch } from "@/components/create/TileSwatch";
import { BoardColumn } from "@/components/game/BoardColumn";
import { GameBoard } from "@/components/game/GameBoard";
import { HairlineButton, HairlineHeader } from "@/components/ui/hairline";
import { useLevelGame } from "@/hooks/useLevelGame";
import { cellKey } from "@/lib/game/coords";
import type { Level } from "@/lib/game/level/types";
import type { TileKind } from "@/lib/game/types";
import { boarHomeMs, HOME_STAND_MS } from "@/lib/rendering/boar";
import { BRIDGE_MARSH, BRIDGE_WOOD } from "@/lib/rendering/tileCatalog";
import { TUTORIAL_STEPS, type TutorialStep } from "@/lib/game/tutorialSteps";

type HowLessonProps = {
  levels: Level[];
};

const SQUARE = { width: 32, height: 32, padding: 0 };
const READY_GREEN = "#4ade80";
const REACH_YELLOW = "#fbbf24";

/** PLAY LAYOUT. HIS LINE IS ON THE BOARD. THE BAR IS THE INSTRUCTION. */
export function HowLesson({ levels }: HowLessonProps) {
  const [index, setIndex] = useState(0);
  const step = TUTORIAL_STEPS[index] ?? TUTORIAL_STEPS[0]!;
  const level = levels[index] ?? step.level;

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden">
      <HairlineHeader nav="tutorial" />
      <Lesson
        key={step.id}
        level={level}
        step={step}
        index={index}
        onPrev={() => setIndex((current) => Math.max(0, current - 1))}
        onNext={() => setIndex((current) => Math.min(TUTORIAL_STEPS.length - 1, current + 1))}
      />
    </main>
  );
}

function Mark({ children }: { children: ReactNode }) {
  return <span className="mx-0.5 inline-flex translate-y-[-1px] align-middle">{children}</span>;
}

function TileMark({ kind }: { kind: TileKind }) {
  return (
    <Mark>
      <TileSwatch kind={kind} size={16} />
    </Mark>
  );
}

function BridgeMark({ src = BRIDGE_WOOD }: { src?: string }) {
  return (
    <Mark>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={16} height={16} style={{ imageRendering: "pixelated" }} />
    </Mark>
  );
}

function ColorMark({ color }: { color: string }) {
  return (
    <Mark>
      <span className="inline-block size-3 border border-black" style={{ background: color }} />
    </Mark>
  );
}

function LessonLine({
  step,
  ready,
  done,
  onCheck,
  onSubmit,
}: {
  step: TutorialStep;
  ready: boolean;
  done: boolean;
  onCheck: () => void;
  onSubmit: () => void;
}) {
  if (step.number === 1) {
    return (
      <div>
        Click on the Water <TileMark kind="ocean" /> to build a Bridge <BridgeMark />, and help our
        friend to the other side.
      </div>
    );
  }
  if (step.number === 2) {
    return (
      <div>
        Bridge <BridgeMark src={BRIDGE_MARSH} /> built on Marsh <TileMark kind="marsh" /> cost
        double.
      </div>
    );
  }
  if (step.number === 3) {
    return (
      <div>
        The boar cannot move from a Bridge <BridgeMark /> onto a Cliff <TileMark kind="cliff" />.
      </div>
    );
  }
  if (step.number === 4) {
    return (
      <div>
        With that said, our friend can walk from Grass <TileMark kind="grass" /> onto a Cliff{" "}
        <TileMark kind="cliff" />.
      </div>
    );
  }
  return (
    <div>
      Click{" "}
      <HairlineButton onClick={onCheck} disabled={done}>
        Check
      </HairlineButton>{" "}
      or on the Boar to see where you can go. When complete the traversable area will be
      highlighted Green <ColorMark color={READY_GREEN} />, otherwise Yellow{" "}
      <ColorMark color={REACH_YELLOW} />. Click{" "}
      <HairlineButton
        onClick={onSubmit}
        disabled={!ready}
        className={ready ? "submit-ready" : ""}
        style={ready ? undefined : { backgroundColor: "#d4d4d4", opacity: 1 }}
      >
        Submit
      </HairlineButton>{" "}
      to submit.
    </div>
  );
}

function Lesson({
  level,
  step,
  index,
  onPrev,
  onNext,
}: {
  level: Level;
  step: TutorialStep;
  index: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const router = useRouter();
  const [boarCue, setBoarCue] = useState(0);
  const last = index === TUTORIAL_STEPS.length - 1;
  const finishing = step.mode === "finish";
  const required = useMemo(
    () => (finishing ? [] : (level.clicks ?? []).map((cell) => cellKey(cell.row, cell.col))),
    [finishing, level],
  );
  const [homeSettled, setHomeSettled] = useState(false);
  const {
    bridges,
    phase,
    result,
    pathKeys,
    reach,
    toggleBridge,
    checkSolution,
    submitSolution,
  } = useLevelGame(level, { holdForSubmit: finishing });
  const bridgesReady = required.length > 0 && required.every((key) => bridges.has(key));
  const success = phase === "success";
  const ready = phase === "valid";
  const canAdvance = finishing ? homeSettled : bridgesReady;
  const hintKeys = useMemo(() => {
    if (finishing || canAdvance) {
      return undefined;
    }
    const left = required.filter((key) => !bridges.has(key));
    if (left.length === 0) {
      return undefined;
    }
    return new Set(left);
  }, [finishing, canAdvance, required, bridges]);

  useEffect(() => {
    if (!finishing || !success || !result?.connected) {
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = reduced
      ? HOME_STAND_MS
      : boarHomeMs({
          start: level.start ?? level.mission.x,
          path: result.path,
          flowers: [level.mission.x, level.mission.y, level.mission.z],
          beganAt: 0,
          level,
          bridges,
        });
    const timer = window.setTimeout(() => setHomeSettled(true), wait);
    return () => window.clearTimeout(timer);
  }, [finishing, success, result, level, bridges]);

  const check = () => {
    if (success) {
      return;
    }
    checkSolution();
  };

  return (
    <BoardColumn
      board={
        <GameBoard
          level={level}
          bridges={bridges}
          pathKeys={pathKeys}
          runPath={success ? (result?.path ?? []) : []}
          interactive={!success}
          sizing="contain"
          bleed
          onToggleBridge={success ? undefined : toggleBridge}
          onBoarClick={finishing ? check : undefined}
          pokeChecks={finishing}
          boarCue={boarCue}
          boarLine={step.boar}
          reach={reach}
          hintKeys={hintKeys}
        />
      }
      bar={
        <div className="flex w-full items-center justify-between gap-3 border border-black px-3 py-2.5">
          <div className="min-w-0 flex-1 text-[11px] leading-5">
            <LessonLine
              step={step}
              ready={ready}
              done={success}
              onCheck={() => {
                setBoarCue((cue) => cue + 1);
                check();
              }}
              onSubmit={() => {
                if (!ready) {
                  return;
                }
                submitSolution();
              }}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <HairlineButton
              aria-label="Previous lesson"
              disabled={index === 0}
              style={SQUARE}
              onClick={onPrev}
            >
              ←
            </HairlineButton>
            <HairlineButton
              aria-label={last ? "Play" : "Next lesson"}
              disabled={!canAdvance}
              className={canAdvance ? "submit-ready" : ""}
              style={SQUARE}
              onClick={last ? () => router.push("/play") : onNext}
            >
              →
            </HairlineButton>
          </div>
        </div>
      }
    />
  );
}

"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { BoardColumn } from "@/components/game/BoardColumn";
import { GameBoard } from "@/components/game/GameBoard";
import { ScoreHome } from "@/components/play/ScoreHome";
import { HairlineButton, HairlineHeader, HairlineRow } from "@/components/ui/hairline";
import { useLevelGame } from "@/hooks/useLevelGame";
import { rememberBestScore } from "@/lib/game/bestScore";
import {
  lockFirstScore,
  readLockedScore,
  readUsername,
  saveUsername,
} from "@/lib/game/lockScore";
import type { Level } from "@/lib/game/level/types";
import { perfectBridgeCost } from "@/lib/game/perfectScore";
import { boarHomeMs } from "@/lib/rendering/boar";
import { FAST_RUN_RATE, getRunRate, runNow, setRunRate, subscribeRunRate } from "@/lib/rendering/runClock";
import { playSfx, setAudioRate } from "@/lib/sound/bed";

type PlaySessionProps = {
  level: Level;
  /** SOLVER COST STORED ON THE LEVEL. OMITTED ONLY WHEN THE ROW HAS NONE. */
  solver?: number | null;
  daily?: boolean;
};

function statusLabel(
  phase: "editing" | "valid" | "success" | "disconnected",
  cost: number,
): string {
  switch (phase) {
    case "valid":
      return `Valid route · cost ${cost}`;
    case "success":
      return `Valid route · cost ${cost}`;
    case "disconnected":
      return "Not connected — keep bridging";
    default:
      return `Place bridges · cost ${cost}`;
  }
}

/** PLAY SESSION — BOARD + STATUS BAR */
export function PlaySession({ level, solver, daily = false }: PlaySessionProps) {
  const {
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
  } = useLevelGame(level, { holdForSubmit: true });
  const [scoreOpen, setScoreOpen] = useState(false);
  const [priorBest, setPriorBest] = useState<number | null>(null);
  const [firstScore, setFirstScore] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [boarCue, setBoarCue] = useState(0);
  const [fast, setFast] = useState(false);
  const auth = useAuth();
  const submitName = auth.username || username.trim();

  useEffect(() => {
    setFirstScore(readLockedScore(level.id));
    setUsername(readUsername());
  }, [level.id]);

  const success = phase === "success";
  const confirmedCost = result?.bridgeCost ?? bridgeCost;
  const runningHome = success && !scoreOpen;
  const solverCost = solver === undefined ? perfectBridgeCost(level) : solver;

  useEffect(() => {
    if (!runningHome) {
      setFast(false);
    }
  }, [runningHome]);

  useEffect(() => {
    if (!success || !result?.connected || !level.start) {
      setScoreOpen(false);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced
      ? 0
      : boarHomeMs({
          start: level.start,
          path: result.path,
          flowers: [level.mission.x, level.mission.y, level.mission.z],
          beganAt: 0,
          level,
          bridges,
        });
    const deadline = runNow() + duration;
    let opened = false;
    let timer = 0;
    const open = () => {
      if (opened) {
        return;
      }
      opened = true;
      window.clearTimeout(timer);
      setRunRate(1);
      setAudioRate(1);
      const best = rememberBestScore(level.id, result.bridgeCost);
      setPriorBest(best);
      setScoreOpen(true);
      console.log("[journeyman:play] home", {
        levelId: level.id,
        score: result.bridgeCost,
        best,
        solver: solverCost,
      });
    };
    const arm = () => {
      if (opened) {
        return;
      }
      window.clearTimeout(timer);
      const left = deadline - runNow();
      const real = left <= 0 ? 0 : left / getRunRate();
      timer = window.setTimeout(open, real);
    };
    arm();
    const unsubscribe = subscribeRunRate(arm);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      setRunRate(1);
      setAudioRate(1);
    };
  }, [success, result, level, bridges, solverCost]);

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
            interactive={!runningHome}
            sizing="contain"
            bleed
            onToggleBridge={runningHome ? undefined : toggleBridge}
            onBoarClick={checkSolution}
            pokeChecks
            boarCue={boarCue}
            reach={reach}
          />
        }
        bar={
          <div className="flex w-full items-center justify-between gap-3 border border-black px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em]">
              {statusLabel(phase, confirmedCost)}
            </p>
            <HairlineRow className="justify-end">
              {phase === "valid" && !auth.username ? (
                <input
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    saveUsername(event.target.value);
                  }}
                  placeholder="Name"
                  aria-label="Name"
                  className="w-28 border border-black bg-white px-2 py-1.5 text-[10px] uppercase tracking-[0.12em] text-black placeholder:text-black/40 focus:outline-none"
                />
              ) : null}
              {phase === "valid" ? (
                <HairlineButton
                  onClick={() => {
                    if (!submitName || !result) {
                      return;
                    }
                    saveUsername(submitName);
                    void auth.saveUsername(submitName);
                    const locked = lockFirstScore(
                      level.id,
                      result.bridgeCost,
                      [...bridges],
                      submitName,
                      { id: auth.userId, token: auth.accessToken },
                    );
                    setFirstScore(locked);
                    submitSolution();
                  }}
                  disabled={!submitName}
                >
                  Submit
                </HairlineButton>
              ) : (
                <HairlineButton
                  onClick={() => {
                    setBoarCue((cue) => cue + 1);
                    checkSolution();
                  }}
                  disabled={runningHome}
                >
                  Check
                </HairlineButton>
              )}
              {runningHome ? (
                <HairlineButton
                  pressed={fast}
                  onClick={() => {
                    const next = !fast;
                    const rate = next ? FAST_RUN_RATE : 1;
                    setFast(next);
                    setRunRate(rate);
                    setAudioRate(rate);
                    if (next) {
                      playSfx("fastForward");
                    }
                  }}
                >
                  Fast
                </HairlineButton>
              ) : null}
              <HairlineButton onClick={clearBridges} disabled={runningHome}>
                Clear
              </HairlineButton>
            </HairlineRow>
          </div>
        }
      />
      {scoreOpen ? (
        <ScoreHome
          score={confirmedCost}
          best={priorBest}
          solver={solverCost}
          firstScore={firstScore}
          daily={daily}
          levelId={level.id}
          playerName={submitName.trim() || "boar"}
          onRetry={() => {
            clearBridges();
            setScoreOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

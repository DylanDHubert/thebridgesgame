"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { BoardColumn } from "@/components/game/BoardColumn";
import { BoardZoom, useBoardZoom } from "@/components/game/BoardZoom";
import { GameBoard } from "@/components/game/GameBoard";
import { CreatureCard } from "@/components/creatures/CreatureBook";
import { ScoreHome } from "@/components/play/ScoreHome";
import { HairlineButton, HairlineHeader, HairlineRow } from "@/components/ui/hairline";
import { useLevelGame } from "@/hooks/useLevelGame";
import { rememberBestScore } from "@/lib/game/bestScore";
import { claimCreature, claimShownCreature, type CreatureClaim } from "@/lib/game/creatureFinds";
import type { Creature } from "@/lib/game/creatures";
import {
  lockFirstScore,
  readLockedScore,
  readUsername,
  saveUsername,
} from "@/lib/game/lockScore";
import type { Level } from "@/lib/game/level/types";
import { perfectBridgeCost } from "@/lib/game/perfectScore";
import { boarHomeMs, HOME_STAND_MS } from "@/lib/rendering/boar";
import { FAST_RUN_RATE, getRunRate, runNow, setRunRate, subscribeRunRate } from "@/lib/rendering/runClock";
import { setAudioRate, setFastForward } from "@/lib/sound/bed";

type PlaySessionProps = {
  level: Level;
  /** SOLVER COST STORED ON THE LEVEL. OMITTED ONLY WHEN THE ROW HAS NONE. */
  solver?: number | null;
};

const HOME_LINES = ["yum", "oink!", "oink oink.", "mmm.", "sniff.", "tasty.", "ah."] as const;

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
export function PlaySession({ level, solver }: PlaySessionProps) {
  const boardZoom = useBoardZoom();
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
  const [firstScore, setFirstScore] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [boarCue, setBoarCue] = useState(0);
  const [homeLine, setHomeLine] = useState<string | null>(null);
  const [fast, setFast] = useState(false);
  const [found, setFound] = useState<CreatureClaim | null>(null);
  const [spotOpen, setSpotOpen] = useState(false);
  const auth = useAuth();
  const submitName = auth.username || username.trim();

  useEffect(() => {
    setFirstScore(readLockedScore(level.id));
    setUsername(readUsername());
    setFound(null);
    setSpotOpen(false);
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
      ? HOME_STAND_MS
      : boarHomeMs({
          start: level.start,
          path: result.path,
          flowers: [level.mission.x, level.mission.y, level.mission.z],
          beganAt: 0,
          level,
          bridges,
        });
    const started = runNow();
    const speakAt = started + Math.max(0, duration - HOME_STAND_MS);
    const deadline = started + duration;
    let opened = false;
    let spoke = false;
    let timer = 0;
    let speakTimer = 0;
    const open = () => {
      if (opened) {
        return;
      }
      opened = true;
      window.clearTimeout(timer);
      window.clearTimeout(speakTimer);
      setHomeLine(null);
      setRunRate(1);
      setAudioRate(1);
      setFastForward(false);
      const best = rememberBestScore(level.id, result.bridgeCost);
      setScoreOpen(true);
      console.log("[journeyman:play] home", {
        levelId: level.id,
        score: result.bridgeCost,
        best,
        solver: solverCost,
      });
    };
    const speak = () => {
      if (spoke) {
        return;
      }
      spoke = true;
      const line = HOME_LINES[Math.floor(Math.random() * HOME_LINES.length)]!;
      setHomeLine(line);
      console.log("[journeyman:play] home line", { levelId: level.id, line });
    };
    const arm = () => {
      if (opened) {
        return;
      }
      window.clearTimeout(timer);
      window.clearTimeout(speakTimer);
      const rate = getRunRate();
      const untilSpeak = speakAt - runNow();
      const untilScore = deadline - runNow();
      if (!spoke) {
        speakTimer = window.setTimeout(speak, untilSpeak <= 0 ? 0 : untilSpeak / rate);
      }
      timer = window.setTimeout(open, untilScore <= 0 ? 0 : untilScore / rate);
    };
    arm();
    const unsubscribe = subscribeRunRate(arm);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(speakTimer);
      unsubscribe();
      setHomeLine(null);
      setRunRate(1);
      setAudioRate(1);
      setFastForward(false);
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
            boarLine={homeLine ?? undefined}
            reach={reach}
            zoom={boardZoom.zoom}
            onCreatureClaim={(creature: Creature) => {
              setFound(claimShownCreature(level, creature));
            }}
            onCreatureFound={() => {
              setSpotOpen(true);
            }}
          />
        }
        bar={
          <div className="flex w-full items-center justify-between gap-3 border border-black px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em]">
              {statusLabel(phase, confirmedCost)}
            </p>
            <HairlineRow className="justify-end">
              <BoardZoom
                onZoomIn={boardZoom.zoomIn}
                onZoomOut={boardZoom.zoomOut}
                atMin={boardZoom.atMin}
                atMax={boardZoom.atMax}
              />
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
                  className={submitName ? "submit-ready" : ""}
                  onClick={() => {
                    if (!submitName || !result) {
                      return;
                    }
                    saveUsername(submitName);
                    void auth.saveUsername(submitName);
                    setSpotOpen(false);
                    setFound((current) => current ?? claimCreature(level, bridges));
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
              ) : phase === "success" ? null : (
                <HairlineButton
                  onClick={() => {
                    setBoarCue((cue) => cue + 1);
                    checkSolution();
                  }}
                >
                  Check
                </HairlineButton>
              )}
              {runningHome ? (
                <HairlineButton
                  pressed={fast}
                  aria-label={fast ? "Normal speed" : "Fast forward"}
                  onClick={() => {
                    const next = !fast;
                    const rate = next ? FAST_RUN_RATE : 1;
                    setFast(next);
                    setRunRate(rate);
                    setAudioRate(rate);
                    setFastForward(next);
                  }}
                >
                  {fast ? "<<" : ">>"}
                </HairlineButton>
              ) : null}
              <HairlineButton onClick={clearBridges} disabled={runningHome}>
                Clear
              </HairlineButton>
            </HairlineRow>
          </div>
        }
      />
      {spotOpen && found && !scoreOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-white/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={found.creature.name}
          onClick={() => setSpotOpen(false)}
        >
          <div className="flex w-full max-w-md flex-col gap-2">
            <p className="text-center text-[10px] uppercase tracking-[0.16em]">Found</p>
            <CreatureCard creature={found.creature} blank={false} />
          </div>
        </div>
      ) : null}
      {scoreOpen ? (
        <ScoreHome
          score={confirmedCost}
          solver={solverCost}
          firstScore={firstScore}
          levelId={level.id}
          playerName={submitName.trim() || "boar"}
          found={found}
          onRetry={() => {
            clearBridges();
            setScoreOpen(false);
            setSpotOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

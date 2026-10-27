import type { ReactNode } from "react";

import { ScoreHeat } from "@/components/play/IslandCard";
import { easedPar } from "@/lib/game/par";
import { shareStory } from "@/lib/game/shareCopy";

const WORDMARK = {
  textShadow:
    "1px 0 0 rgb(12 48 92), -1px 0 0 rgb(12 48 92), 0 1px 0 rgb(12 48 92), 0 -1px 0 rgb(12 48 92)",
};

type RoundCardProps = {
  levelName: string;
  playerName: string;
  score: number | null;
  solver: number | null;
  costs: number[];
  thumbUrl: string | null;
  actions: ReactNode;
};

/** ONE ROUND, PLAYING-CARD SHAPE. THE STILL, THE BAND, THE STRIP, THE NAME. */
const BADGE = "border border-black px-2 py-1 text-[10px] uppercase tracking-[0.12em]";

export function RoundCard({
  levelName,
  playerName,
  score,
  solver,
  costs,
  thumbUrl,
  actions,
}: RoundCardProps) {
  const story = score == null ? null : shareStory(score, solver, costs);
  const par = solver == null ? null : easedPar(solver);
  return (
    <article className="mx-auto flex w-full max-w-md flex-col border border-black bg-white">
      <header className="border-b border-black px-3 py-2 text-center text-[11px] uppercase tracking-[0.14em]">
        {levelName}
      </header>
      {thumbUrl ? (
        <div className="px-3 pt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbUrl}
            alt=""
            className="h-auto w-full border border-black"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-2 px-3 py-3">
        <h1
          className="silkscreen-bold text-center text-[16px] leading-none text-[#fbbf24]"
          style={WORDMARK}
        >
          {story?.title ?? "No round"}
        </h1>
        {score != null ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className={BADGE}>Score {score}</span>
            {par != null ? <span className={BADGE}>Par {par}</span> : null}
          </div>
        ) : null}
        <div className="w-full">
          <ScoreHeat costs={costs} solver={solver} score={score} />
        </div>
        <p className="text-center text-[10px] uppercase tracking-[0.12em]">{playerName}</p>
        {actions}
      </div>
    </article>
  );
}

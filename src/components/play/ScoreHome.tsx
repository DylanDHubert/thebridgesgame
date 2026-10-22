"use client";

import { useEffect, useState } from "react";

import { BoarRun } from "@/components/loading/LoadingScreen";
import { HairlineButton, HairlineLink, HairlineRow } from "@/components/ui/hairline";
import { easedPar, SCORE_BANDS, scoreBand, scoreTitle, type ScoreBand } from "@/lib/game/par";
import { listScoreRows, type ScoreRow } from "@/lib/supabase/scores";

type ScoreHomeProps = {
  score: number;
  best: number | null;
  solver: number | null;
  firstScore: number | null;
  daily: boolean;
  levelId: string;
  playerName: string;
  onRetry: () => void;
};

type BandBar = {
  band: ScoreBand;
  count: number;
  holdsScore: boolean;
};

function bandBars(costs: number[], score: number, solver: number): BandBar[] {
  const counts = new Map<ScoreBand, number>();
  for (const band of SCORE_BANDS) {
    counts.set(band, 0);
  }
  for (const cost of costs) {
    const band = scoreBand(cost, solver);
    counts.set(band, (counts.get(band) ?? 0) + 1);
  }
  const yours = scoreBand(score, solver);
  return SCORE_BANDS.map((band) => ({
    band,
    count: counts.get(band) ?? 0,
    holdsScore: band === yours,
  }));
}

/** AFTER HE GETS HOME. SCORE, WHETHER IT WAS OPTIMAL, AND THE WAY BACK. */
export function ScoreHome({
  score,
  best,
  solver,
  firstScore,
  daily,
  levelId,
  playerName,
  onRetry,
}: ScoreHomeProps) {
  const [rows, setRows] = useState<ScoreRow[]>([]);

  useEffect(() => {
    void listScoreRows(levelId).then(setRows);
  }, [levelId]);

  const costs = rows.map((row) => row.cost);
  if (!costs.includes(score)) {
    costs.push(score);
  }
  const bars = solver == null ? [] : bandBars(costs, score, solver);
  const tallest = bars.reduce((max, bar) => Math.max(max, bar.count), 1);
  const board = rows.slice(0, 8);
  const title = solver == null ? null : scoreTitle(score, solver);
  const sharedScore = firstScore ?? score;
  const shareHref = `/share/${encodeURIComponent(levelId)}?name=${encodeURIComponent(playerName)}&score=${sharedScore}`;
  const bestText = solver == null ? (best != null ? String(best) : null) : String(easedPar(solver));
  return (
    <div
      className="fixed inset-0 z-[80] flex min-h-dvh w-full flex-col items-center justify-center gap-5 bg-white text-black"
      role="dialog"
      aria-modal="true"
      aria-label="Score"
    >
      <BoarRun />
      <p className="text-[11px] uppercase tracking-[0.16em]">
        Score {score}
        {bestText != null ? (solver != null ? ` · Par ${bestText}` : ` · Best ${bestText}`) : ""}
        {firstScore != null && firstScore !== score ? ` · First ${firstScore}` : ""}
      </p>
      {title != null ? (
        <p
          className={`text-[11px] uppercase tracking-[0.16em]${
            daily ? " border border-black px-3 py-1" : ""
          }`}
        >
          {title}
        </p>
      ) : null}
      {bars.length > 0 ? (
        <div className="w-full max-w-md px-4" role="img" aria-label="Score histogram">
          <div className="flex h-4 items-end gap-1">
            {bars.map((bar) => (
              <span key={bar.band} className="min-w-0 flex-1 text-center text-[8px] leading-none">
                {bar.count > 0 ? bar.count : ""}
              </span>
            ))}
          </div>
          <div className="flex h-14 items-end gap-1 border-b border-black">
            {bars.map((bar) => (
              <div key={bar.band} className="flex h-full min-w-0 flex-1 items-end">
                <div
                  className={`w-full ${bar.holdsScore ? "bg-black" : "bg-[#2ec4b6]"}`}
                  style={{ height: bar.count === 0 ? 0 : `${(bar.count / tallest) * 100}%` }}
                  title={`${bar.count} ${bar.band}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1">
            {bars.map((bar) => (
              <span
                key={bar.band}
                className="h-6 min-w-0 flex-1 overflow-hidden text-center text-[7px] uppercase leading-[1.1] tracking-tight [overflow-wrap:anywhere]"
              >
                {bar.band}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {board.length > 0 ? (
        <ol className="w-72 border border-black text-[10px] uppercase tracking-[0.14em]">
          {board.map((row, index) => (
            <li
              key={`${row.username}-${row.cost}-${index}`}
              className="flex items-center gap-3 border-b border-black px-2 py-1 last:border-b-0"
            >
              <span className="w-4 text-black/45">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate">{row.username}</span>
              <span>{row.cost}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <HairlineRow>
        <p className="text-[10px] uppercase tracking-[0.14em]">Back to the levels</p>
        <HairlineButton onClick={onRetry}>Retry</HairlineButton>
        <HairlineLink href={shareHref}>Share</HairlineLink>
        <HairlineLink href="/play">Levels</HairlineLink>
      </HairlineRow>
    </div>
  );
}

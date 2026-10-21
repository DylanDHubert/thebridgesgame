"use client";

import { useEffect, useState } from "react";

import { BoarRun } from "@/components/loading/LoadingScreen";
import { HairlineButton, HairlineLink, HairlineRow } from "@/components/ui/hairline";
import { listScoreRows, type ScoreRow } from "@/lib/supabase/scores";

type ScoreHomeProps = {
  score: number;
  best: number | null;
  firstScore: number | null;
  optimal: boolean;
  levelId: string;
  onRetry: () => void;
};

/** AFTER HE GETS HOME. SCORE, WHETHER IT WAS OPTIMAL, AND THE WAY BACK. */
export function ScoreHome({
  score,
  best,
  firstScore,
  optimal,
  levelId,
  onRetry,
}: ScoreHomeProps) {
  const [rows, setRows] = useState<ScoreRow[]>([]);

  useEffect(() => {
    void listScoreRows(levelId).then(setRows);
  }, [levelId]);

  const counts = new Map<number, number>();
  for (const row of rows) {
    counts.set(row.cost, (counts.get(row.cost) ?? 0) + 1);
  }
  const spread = [...counts.entries()].sort((a, b) => a[0] - b[0]);
  const tallest = spread.reduce((max, [, count]) => Math.max(max, count), 1);
  const board = rows.slice(0, 8);
  return (
    <div
      className="fixed inset-0 z-[80] flex min-h-dvh w-full flex-col items-center justify-center gap-5 bg-white text-black"
      role="dialog"
      aria-modal="true"
      aria-label="Score"
    >
      <BoarRun />
      <p className="text-[11px] uppercase tracking-[0.16em]">Score {score}</p>
      {best != null ? (
        <p className="text-[10px] uppercase tracking-[0.14em]">Best {best}</p>
      ) : null}
      {firstScore != null && firstScore !== score ? (
        <p className="text-[10px] uppercase tracking-[0.14em]">First {firstScore}</p>
      ) : null}
      <p
        className={`text-[10px] uppercase tracking-[0.14em]${
          optimal ? " text-[#fbbf24]" : ""
        }`}
      >
        {optimal ? "Optimal achieved" : "Not optimal "}
      </p>
      {spread.length > 0 ? (
        <div className="flex w-64 flex-col gap-1">
          {spread.map(([cost, count]) => (
            <div key={cost} className="flex items-center gap-2 text-[10px] uppercase">
              <span className="w-6 text-right">{cost}</span>
              <span
                className="h-2 bg-[#2ec4b6]"
                style={{ width: `${Math.max(8, (count / tallest) * 140)}px` }}
              />
              <span>{count}</span>
            </div>
          ))}
        </div>
      ) : null}
      {board.length > 0 ? (
        <ol className="flex flex-col gap-1 text-center text-[10px] uppercase tracking-[0.14em]">
          {board.map((row, index) => (
            <li key={`${row.username}-${row.cost}-${index}`}>
              {index + 1}. {row.username} · {row.cost}
            </li>
          ))}
        </ol>
      ) : null}
      <HairlineRow>
        <p className="text-[10px] uppercase tracking-[0.14em]">Back to the levels</p>
        <HairlineButton onClick={onRetry}>Retry</HairlineButton>
        <HairlineLink href="/play">Levels</HairlineLink>
      </HairlineRow>
    </div>
  );
}

"use client";

import { BoarRun } from "@/components/loading/LoadingScreen";
import { HairlineLink } from "@/components/ui/hairline";

type ScoreHomeProps = {
  score: number;
  best: number | null;
  optimal: boolean;
};

/** AFTER HE GETS HOME. SCORE, WHETHER IT WAS OPTIMAL, AND THE WAY BACK. */
export function ScoreHome({ score, best, optimal }: ScoreHomeProps) {
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
      <p
        className={`text-[10px] uppercase tracking-[0.14em]${
          optimal ? " text-[#fbbf24]" : ""
        }`}
      >
        {optimal ? "Optimal achieved" : "Not achieved"}
      </p>
      <p className="text-[10px] uppercase tracking-[0.14em]">Back to the levels</p>
      <HairlineLink href="/play">Levels</HairlineLink>
    </div>
  );
}

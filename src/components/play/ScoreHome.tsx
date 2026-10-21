"use client";

import { BoarRun } from "@/components/loading/LoadingScreen";
import { HairlineButton, HairlineLink, HairlineRow } from "@/components/ui/hairline";

type ScoreHomeProps = {
  score: number;
  best: number | null;
  optimal: boolean;
  onRetry: () => void;
};

/** AFTER HE GETS HOME. SCORE, WHETHER IT WAS OPTIMAL, AND THE WAY BACK. */
export function ScoreHome({ score, best, optimal, onRetry }: ScoreHomeProps) {
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
        {optimal ? "Optimal achieved" : "Not optimal "}
      </p>
      <HairlineRow>
        <p className="text-[10px] uppercase tracking-[0.14em]">Back to the levels</p>
        <HairlineButton onClick={onRetry}>Retry</HairlineButton>
        <HairlineLink href="/play">Levels</HairlineLink>
      </HairlineRow>
    </div>
  );
}

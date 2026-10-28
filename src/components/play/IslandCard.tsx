"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { GAME_STAGE_ASPECT } from "@/components/game/GameStage";
import { SCORE_BANDS, scoreBand, scoreTitle } from "@/lib/game/par";
import { useButtonSfx } from "@/lib/sound/buttonSfx";

/** SEVEN TO A ROW. THE CALENDAR AND THE LEVEL LIST SHARE THIS SHELF. */
export const ISLAND_ROW = "grid w-full grid-cols-7 gap-2";

/** EMPTY TO FULL. THE SHARE OF SCORES PICKS THE STEP. */
const HEAT = ["#e7e5e4", "#99f6e4", "#5eead4", "#2ec4b6", "#14b8a6", "#0f766e", "#115e59"];

function heatColor(share: number): string {
  if (share <= 0) {
    return HEAT[0]!;
  }
  const index = Math.min(HEAT.length - 1, Math.ceil(share * (HEAT.length - 1)));
  return HEAT[index]!;
}

/** EIGHT EQUAL BANDS. SHADE IS THE SHARE OF SCORES IN THAT BAND. */
export function ScoreHeat({
  costs,
  solver,
  score = null,
}: {
  costs: number[];
  solver: number | null;
  score?: number | null;
}) {
  const field = score != null && !costs.includes(score) ? [...costs, score] : costs;
  if (solver == null || field.length === 0) {
    return <div className="mt-1 h-[5px] w-full bg-[#e7e5e4]" />;
  }
  const counts = SCORE_BANDS.map(
    (band) => field.filter((cost) => scoreBand(cost, solver) === band).length,
  );
  const total = counts.reduce((sum, count) => sum + count, 0);
  const yours = score == null ? -1 : SCORE_BANDS.indexOf(scoreBand(score, solver));
  return (
    <div className="relative mt-1 h-[5px] w-full" title={counts.join(" ")}>
      <div className="flex h-full w-full gap-px">
        {counts.map((count, index) => (
          <span
            key={SCORE_BANDS[index]}
            className="h-full min-w-0 flex-1"
            style={{ background: heatColor(total === 0 ? 0 : count / total) }}
          />
        ))}
      </div>
      {yours >= 0 ? (
        <span
          className="pointer-events-none absolute top-1/2 z-[1] h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 border border-black bg-[#fbbf24]"
          style={{ left: `${((yours + 0.5) / SCORE_BANDS.length) * 100}%` }}
        />
      ) : null}
    </div>
  );
}

type IslandCardProps = {
  href?: string;
  title: ReactNode;
  image?: ReactNode;
  solver: number | null;
  costs: number[];
  score: number | null;
  showScore?: boolean;
  titleClassName?: string;
};

/** THE LEVEL CARD. IMAGE, NAME, A PIXEL OF THE FIELD, THEN THE RESULT. */
export function IslandCard({
  href,
  title,
  image,
  solver,
  costs,
  score,
  showScore = true,
  titleClassName = "",
}: IslandCardProps) {
  const label =
    score == null ? "No score" : solver == null ? String(score) : scoreTitle(score, solver);
  const shell = [
    "block min-w-0 border border-black",
    href ? "group transition hover:bg-black hover:text-white" : "opacity-45",
  ].join(" ");
  const body = (
    <>
      <div
        data-shot
        className="relative overflow-hidden border-b border-black bg-[rgb(12_48_92)]"
        style={{ aspectRatio: GAME_STAGE_ASPECT }}
      >
        {image}
      </div>
      <div className="px-2 py-2 text-center">
        <h2
          className={`truncate text-[9px] uppercase tracking-[0.14em] group-hover:text-white ${titleClassName}`}
        >
          {title}
        </h2>
        <ScoreHeat costs={costs} solver={solver} score={score} />
        <p className="mt-1 h-3 text-[8px] uppercase tracking-[0.12em]">
          {showScore ? label : ""}
        </p>
      </div>
    </>
  );
  if (!href) {
    return <div className={shell}>{body}</div>;
  }
  return (
    <IslandLink href={href} className={shell}>
      {body}
    </IslandLink>
  );
}

function IslandLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const press = useButtonSfx<HTMLAnchorElement>("link");
  return (
    <Link href={href} className={className} {...press()}>
      {children}
    </Link>
  );
}

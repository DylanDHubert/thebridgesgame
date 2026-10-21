import Link from "next/link";
import type { ReactNode } from "react";

import { GAME_STAGE_ASPECT } from "@/components/game/GameStage";
import { SCORE_BANDS, scoreBand, scoreTitle } from "@/lib/game/par";

const HEAT = [
  "#115e59",
  "#0f766e",
  "#14b8a6",
  "#2ec4b6",
  "#5eead4",
  "#99f6e4",
  "#d6d3d1",
  "#a8a29e",
];

/** A GAME PIXEL OF THE FIELD. EACH BAND TAKES A SHARE OF THE WIDTH. */
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
    return <div className="mt-1 h-[5px] w-full bg-black/20" />;
  }
  const counts = SCORE_BANDS.map(
    (band) => field.filter((cost) => scoreBand(cost, solver) === band).length,
  );
  const total = counts.reduce((sum, count) => sum + count, 0);
  const yours = score == null ? -1 : SCORE_BANDS.indexOf(scoreBand(score, solver));
  let cursor = 0;
  let mark = -1;
  counts.forEach((count, index) => {
    const share = (count / total) * 100;
    if (index === yours && count > 0) {
      mark = cursor + share / 2;
    }
    cursor += share;
  });
  return (
    <div className="relative mt-1 h-[5px] w-full" title={counts.join(" ")}>
      <div className="flex h-full w-full">
        {counts.map((count, index) =>
          count > 0 ? (
            <span
              key={SCORE_BANDS[index]}
              className="h-full"
              style={{ width: `${(count / total) * 100}%`, background: HEAT[index] }}
            />
          ) : null,
        )}
      </div>
      {mark >= 0 ? (
        <span
          className="pointer-events-none absolute top-1/2 z-[1] h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 border border-black bg-[#fbbf24]"
          style={{ left: `${mark}%` }}
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
  dense?: boolean;
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
  dense = false,
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
        className="relative overflow-hidden border-b border-black bg-[rgb(12_48_92)]"
        style={{ aspectRatio: GAME_STAGE_ASPECT }}
      >
        {image}
      </div>
      <div className={dense ? "px-1 py-1 text-center" : "px-2 py-2 text-center"}>
        <h2
          className={`truncate uppercase tracking-[0.14em] group-hover:text-white ${
            dense ? "text-[8px]" : "text-[9px]"
          } ${titleClassName}`}
        >
          {title}
        </h2>
        <ScoreHeat costs={costs} solver={solver} score={score} />
        <p
          className={`uppercase tracking-[0.12em] ${
            dense ? "mt-1 h-3 text-[7px]" : "mt-1 h-3 text-[8px]"
          }`}
        >
          {showScore ? label : ""}
        </p>
      </div>
    </>
  );
  if (!href) {
    return <div className={shell}>{body}</div>;
  }
  return (
    <Link href={href} className={shell}>
      {body}
    </Link>
  );
}

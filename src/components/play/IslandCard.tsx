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

/** ONE PIXEL. EACH BAND TAKES A SHARE OF THE WIDTH. */
export function ScoreHeat({ costs, solver }: { costs: number[]; solver: number | null }) {
  if (solver == null || costs.length === 0) {
    return <div className="mt-1 h-px w-full bg-black/20" />;
  }
  const counts = SCORE_BANDS.map(
    (band) => costs.filter((cost) => scoreBand(cost, solver) === band).length,
  );
  const total = counts.reduce((sum, count) => sum + count, 0);
  return (
    <div className="mt-1 flex h-px w-full" title={counts.join(" ")}>
      {counts.map((count, index) =>
        count > 0 ? (
          <span
            key={SCORE_BANDS[index]}
            className="h-px"
            style={{ width: `${(count / total) * 100}%`, background: HEAT[index] }}
          />
        ) : null,
      )}
    </div>
  );
}

type IslandCardProps = {
  href?: string;
  title: string;
  image?: ReactNode;
  solver: number | null;
  costs: number[];
  score: number | null;
  dense?: boolean;
  showScore?: boolean;
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
}: IslandCardProps) {
  const label =
    score == null ? "No score" : solver == null ? String(score) : scoreTitle(score, solver);
  const shell = [
    "block min-w-0 border border-black",
    href ? "transition hover:bg-black hover:text-white" : "opacity-45",
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
          className={`truncate uppercase tracking-[0.14em] ${dense ? "text-[7px]" : "text-[9px]"}`}
        >
          {title}
        </h2>
        <ScoreHeat costs={costs} solver={solver} />
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

import { ShareActions } from "@/components/play/ShareActions";
import { easedPar, SCORE_BANDS, scoreBand, type ScoreBand } from "@/lib/game/par";
import { shareStory } from "@/lib/game/shareCopy";

const WORDMARK = {
  textShadow:
    "1px 0 0 rgb(12 48 92), -1px 0 0 rgb(12 48 92), 0 1px 0 rgb(12 48 92), 0 -1px 0 rgb(12 48 92)",
};

type BandBar = {
  band: ScoreBand;
  count: number;
  holdsScore: boolean;
};

function barsFor(costs: number[], score: number | null, solver: number): BandBar[] {
  const yours = score == null ? null : scoreBand(score, solver);
  return SCORE_BANDS.map((band) => ({
    band,
    count: costs.filter((cost) => scoreBand(cost, solver) === band).length,
    holdsScore: band === yours,
  }));
}

/** THE ROUND AS A CARD. THE YELLOW SQUARE IS THIS PLAYER. */
export function SharePoster({
  levelName,
  playerName,
  score,
  solver,
  costs,
  thumbUrl,
  playHref,
}: {
  levelName: string;
  playerName: string;
  score: number | null;
  solver: number | null;
  costs: number[];
  thumbUrl: string | null;
  playHref: string;
}) {
  const story = score == null ? null : shareStory(score, solver, costs);
  const bars = solver == null || costs.length === 0 ? [] : barsFor(costs, score, solver);
  const tallest = bars.reduce((max, bar) => Math.max(max, bar.count), 1);
  const par = solver == null ? null : easedPar(solver);
  const sendText = story
    ? `${playerName} scored ${story.title} on ${levelName}. ${story.quip} ${story.place}`
    : `${levelName} on The Bridges Game`;

  const detail = story
    ? `${story.quip} ${story.place} ${story.rank} of ${story.total}`
    : "That round is not on the board.";

  return (
    <article className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col items-center gap-2 overflow-hidden px-4 py-3">
      {thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl}
          alt=""
          className="h-auto w-full shrink-0 border border-black"
          style={{ imageRendering: "pixelated" }}
        />
      ) : null}
      <h1
        className="shrink-0 text-center text-[13px] uppercase tracking-[0.08em] text-[#fbbf24]"
        style={WORDMARK}
      >
        {story?.title ?? "No round"}
      </h1>
      <p className="shrink-0 text-center text-[10px] uppercase tracking-[0.12em]">
        {playerName} · {levelName}
      </p>
      {score != null ? (
        <p className="shrink-0 text-center text-[10px] uppercase tracking-[0.12em]">
          Score {score}
          {par != null ? ` · Par ${par}` : ""}
        </p>
      ) : null}
      <p className="line-clamp-2 shrink-0 text-center text-[9px] uppercase leading-relaxed tracking-[0.1em]">
        {detail}
      </p>
      {bars.length > 0 ? (
        <div className="w-full shrink-0" role="img" aria-label="Score distribution">
          <div className="flex h-4 items-end gap-1">
            {bars.map((bar) => (
              <span
                key={bar.band}
                className="flex min-w-0 flex-1 items-end justify-center gap-1 text-[8px] leading-none"
              >
                {bar.holdsScore ? (
                  <span className="h-[9px] w-[9px] shrink-0 border border-black bg-[#fbbf24]" />
                ) : null}
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
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1">
            {bars.map((bar) => (
              <span
                key={bar.band}
                className={`h-6 min-w-0 flex-1 overflow-hidden text-center text-[7px] uppercase leading-[1.1] tracking-tight [overflow-wrap:anywhere] ${
                  bar.holdsScore ? "text-black" : "text-black/55"
                }`}
              >
                {bar.band}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <ShareActions
        title={`${playerName} · ${story?.title ?? levelName}`}
        text={sendText}
        playHref={playHref}
      />
    </article>
  );
}

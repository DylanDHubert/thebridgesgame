import { RoundCard } from "@/components/play/RoundCard";
import { ShareActions } from "@/components/play/ShareActions";
import { shareGlyph, shareStory } from "@/lib/game/shareCopy";

/** THE PUBLIC CARD. COPY, SEND, OR PLAY THIS ISLAND. */
export function SharePoster({
  levelName,
  playerName,
  score,
  solver,
  costs,
  thumbUrl,
  playHref,
  first = false,
  day = null,
}: {
  levelName: string;
  playerName: string;
  score: number | null;
  solver: number | null;
  costs: number[];
  thumbUrl: string | null;
  playHref: string;
  /** THIS ROUND IS THE PLAYER'S FIRST SUBMIT. */
  first?: boolean;
  /** PACIFIC DAY WHEN THIS CARD IS A DAILY. OMITTED FOR OTHER ISLANDS. */
  day?: string | null;
}) {
  const story = score == null ? null : shareStory(score, solver, costs);
  const glyph = score == null ? null : shareGlyph(score, solver, day);
  const sentence = story
    ? `${playerName} scored ${story.title} on ${levelName}.`
    : `${levelName} on The Bridges Game`;
  const sendText = glyph ? `${glyph}\n${sentence}` : sentence;
  return (
    <RoundCard
      levelName={levelName}
      playerName={playerName}
      score={score}
      solver={solver}
      costs={costs}
      thumbUrl={thumbUrl}
      figures={false}
      mark={glyph}
      first={first}
      actions={
        <ShareActions
          title={`${playerName} · ${story?.title ?? levelName}`}
          text={sendText}
          copyText={glyph}
          playHref={playHref}
        />
      }
    />
  );
}

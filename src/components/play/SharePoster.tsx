import { RoundCard } from "@/components/play/RoundCard";
import { ShareActions } from "@/components/play/ShareActions";
import { shareStory } from "@/lib/game/shareCopy";

/** THE PUBLIC CARD. COPY, SEND, OR PLAY THIS ISLAND. */
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
  const sendText = story
    ? `${playerName} scored ${story.title} on ${levelName}.`
    : `${levelName} on The Bridges Game`;
  return (
    <RoundCard
      levelName={levelName}
      playerName={playerName}
      score={score}
      solver={solver}
      costs={costs}
      thumbUrl={thumbUrl}
      actions={
        <ShareActions
          title={`${playerName} · ${story?.title ?? levelName}`}
          text={sendText}
          playHref={playHref}
        />
      }
    />
  );
}

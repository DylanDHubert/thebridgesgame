"use client";

import { useEffect, useState } from "react";

import { CreatureCard } from "@/components/creatures/CreatureBook";
import { FieldCard, fieldRows } from "@/components/play/FieldCard";
import { RoundCard } from "@/components/play/RoundCard";
import { HairlineButton, HairlineLink, HairlineRow } from "@/components/ui/hairline";
import type { CreatureClaim } from "@/lib/game/creatureFinds";
import { levelThumbSrc, listScoreRows, loadShareLevel, type ScoreRow } from "@/lib/supabase/scores";

type ScoreHomeProps = {
  score: number;
  firstScore: number | null;
  solver: number | null;
  levelId: string;
  playerName: string;
  found: CreatureClaim | null;
  onRetry: () => void;
};

/** THE SAME CARD AS THE SHARE PAGE, WITH THE WAY BACK. */
export function ScoreHome({
  score,
  firstScore,
  solver,
  levelId,
  playerName,
  found,
  onRetry,
}: ScoreHomeProps) {
  const [costs, setCosts] = useState<number[]>([score]);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [levelName, setLevelName] = useState("");
  const sharedScore = firstScore ?? score;
  const field = fieldRows(rows, { username: playerName, cost: sharedScore });
  const shareHref = `/share/${encodeURIComponent(levelId)}?name=${encodeURIComponent(playerName)}&score=${sharedScore}`;

  useEffect(() => {
    let cancel = false;
    void Promise.all([listScoreRows(levelId), loadShareLevel(levelId)]).then(([loaded, level]) => {
      if (cancel) {
        return;
      }
      const next = loaded.map((row) => row.cost);
      if (!next.includes(score)) {
        next.push(score);
      }
      setRows(loaded);
      setCosts(next);
      setLevelName(level?.name ?? "");
      setThumbUrl(level?.thumb ? levelThumbSrc(level.id, level.thumb) : null);
    });
    return () => {
      cancel = true;
    };
  }, [levelId, score]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-white/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Score"
    >
      <div className="m-auto flex w-full max-w-[72rem] flex-wrap items-start justify-center gap-3">
        {found ? (
          <div className="flex w-full max-w-md flex-col gap-2">
            <p className="text-center text-[10px] uppercase tracking-[0.16em]">
              {found.source === "wild" ? "Found" : "A gift"}
            </p>
            <CreatureCard creature={found.creature} blank={false} />
          </div>
        ) : null}
        <div className="w-full max-w-md">
        <RoundCard
          levelName={levelName}
          playerName={playerName}
          score={score}
          solver={solver}
          costs={costs}
          thumbUrl={thumbUrl}
          actions={
            <HairlineRow>
              <HairlineButton onClick={onRetry}>Retry</HairlineButton>
              <HairlineLink href={shareHref}>Share</HairlineLink>
              <HairlineLink href="/play">Levels</HairlineLink>
              <HairlineLink href="/creatures">Creatures</HairlineLink>
            </HairlineRow>
          }
        />
        </div>
        <div className="w-full max-w-md">
          <FieldCard rows={field} youName={playerName} />
        </div>
      </div>
    </div>
  );
}

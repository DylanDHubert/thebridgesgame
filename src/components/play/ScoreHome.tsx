"use client";

import { useEffect, useState } from "react";

import { RoundCard } from "@/components/play/RoundCard";
import { HairlineButton, HairlineLink, HairlineRow } from "@/components/ui/hairline";
import { levelThumbSrc, listScoreRows, loadShareLevel } from "@/lib/supabase/scores";

type ScoreHomeProps = {
  score: number;
  firstScore: number | null;
  solver: number | null;
  levelId: string;
  playerName: string;
  onRetry: () => void;
};

/** THE SAME CARD AS THE SHARE PAGE, WITH THE WAY BACK. */
export function ScoreHome({
  score,
  firstScore,
  solver,
  levelId,
  playerName,
  onRetry,
}: ScoreHomeProps) {
  const [costs, setCosts] = useState<number[]>([score]);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [levelName, setLevelName] = useState("");
  const sharedScore = firstScore ?? score;
  const shareHref = `/share/${encodeURIComponent(levelId)}?name=${encodeURIComponent(playerName)}&score=${sharedScore}`;

  useEffect(() => {
    let cancel = false;
    void Promise.all([listScoreRows(levelId), loadShareLevel(levelId)]).then(([rows, level]) => {
      if (cancel) {
        return;
      }
      const next = rows.map((row) => row.cost);
      if (!next.includes(score)) {
        next.push(score);
      }
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-white/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Score"
    >
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
            </HairlineRow>
          }
        />
      </div>
    </div>
  );
}

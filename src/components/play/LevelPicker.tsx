"use client";

import { useEffect, useRef, useState } from "react";

import { loadPlayerScores } from "@/app/actions/playerScores";
import { useAuth } from "@/components/auth/AuthProvider";
import { MapPreview } from "@/components/game/MapPreview";
import { ISLAND_ROW, IslandCard } from "@/components/play/IslandCard";
import { HairlineLink } from "@/components/ui/hairline";
import { readBestScores } from "@/lib/game/bestScore";
import { readLockedScores } from "@/lib/game/lockScore";
import type { Level } from "@/lib/game/level/types";
import { levelThumbSrc, listSubmissionCosts, loadRemoteLevel, type LevelCard } from "@/lib/supabase/scores";

type LevelPickerProps = {
  cards: LevelCard[];
};

/** THE SAVED STILL, OR ONE PAINT THAT STORES IT. */
function CardShot({ id, thumb }: { id: string; thumb: string | null }) {
  const [revision, setRevision] = useState(thumb);
  if (revision) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={levelThumbSrc(id, revision)}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ imageRendering: "pixelated" }}
      />
    );
  }
  return <LazyMap id={id} onPublished={setRevision} />;
}

/** THE MAP DRAWS WHEN THE CARD NEARS THE SCREEN AND NO STILL EXISTS YET. */
function LazyMap({ id, onPublished }: { id: string; onPublished: (revision: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState<Level | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    let cancel = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }
        observer.disconnect();
        void loadRemoteLevel(id).then((next) => {
          if (!cancel) {
            setLevel(next);
          }
        });
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => {
      cancel = true;
      observer.disconnect();
    };
  }, [id]);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0" aria-hidden>
      {level ? (
        <MapPreview
          level={level}
          borderless
          cells={false}
          boarClick={false}
          publish
          onPublished={onPublished}
        />
      ) : null}
    </div>
  );
}

/** LEVEL SELECT — HAIRLINE CARDS */
export function LevelPicker({ cards }: LevelPickerProps) {
  const auth = useAuth();
  const [bests, setBests] = useState<Record<string, number>>({});
  const [costs, setCosts] = useState<Record<string, number[]>>({});

  useEffect(() => {
    const local = { ...readLockedScores(), ...readBestScores() };
    setBests(local);
    let cancel = false;
    void listSubmissionCosts().then((next) => {
      if (!cancel) {
        setCosts(next);
      }
    });
    if (!auth.userId) {
      return () => {
        cancel = true;
      };
    }
    void loadPlayerScores(auth.userId).then((remote) => {
      if (!cancel) {
        setBests({ ...local, ...remote });
      }
    });
    return () => {
      cancel = true;
    };
  }, [cards, auth.userId]);

  if (cards.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em]">No levels yet</p>
        <HairlineLink href="/create">Create one</HairlineLink>
      </div>
    );
  }

  return (
    <ul className={ISLAND_ROW}>
      {cards.map((card) => (
        <li key={card.id} className="min-w-0">
          <IslandCard
            href={`/play?level=${encodeURIComponent(card.id)}`}
            title={card.name}
            image={<CardShot id={card.id} thumb={card.thumb} />}
            solver={card.solver}
            costs={costs[card.id] ?? []}
            score={bests[card.id] ?? null}
          />
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { MapPreview } from "@/components/game/MapPreview";
import { GAME_STAGE_ASPECT } from "@/components/game/GameStage";
import { HairlineLink } from "@/components/ui/hairline";
import { readBestScores, readOptimalLevels } from "@/lib/game/bestScore";
import type { Level } from "@/lib/game/level/types";
import { loadRemoteLevel, type LevelCard } from "@/lib/supabase/scores";

type LevelPickerProps = {
  cards: LevelCard[];
};

/** THE MAP DRAWS WHEN THE CARD NEARS THE SCREEN. */
function LazyMap({ id }: { id: string }) {
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
      {level ? <MapPreview level={level} borderless cells={false} boarClick={false} /> : null}
    </div>
  );
}

/** LEVEL SELECT — HAIRLINE CARDS */
export function LevelPicker({ cards }: LevelPickerProps) {
  const [bests, setBests] = useState<Record<string, number>>({});
  const [optimal, setOptimal] = useState<Set<string>>(new Set());

  useEffect(() => {
    setBests(readBestScores());
    setOptimal(readOptimalLevels());
  }, [cards]);

  if (cards.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em]">No levels yet</p>
        <HairlineLink href="/create">Create one</HairlineLink>
      </div>
    );
  }

  return (
    <ul className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => (
        <li key={card.id} className="min-w-0">
          <Link
            href={`/play?level=${encodeURIComponent(card.id)}`}
            className="block border border-black transition hover:bg-black hover:text-white"
          >
            <div
              className="relative overflow-hidden border-b border-black bg-[rgb(12_48_92)]"
              style={{ aspectRatio: GAME_STAGE_ASPECT }}
            >
              <LazyMap id={card.id} />
            </div>
            <div className="px-2 py-2 text-center">
              <h2 className="truncate text-[9px] uppercase tracking-[0.14em]">{card.name}</h2>
              <p
                className={`mt-1 text-[8px] uppercase tracking-[0.16em]${
                  optimal.has(card.id) ? " text-[#fbbf24]" : ""
                }`}
              >
                {bests[card.id] != null ? `Best ${bests[card.id]}` : "Best ?"}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

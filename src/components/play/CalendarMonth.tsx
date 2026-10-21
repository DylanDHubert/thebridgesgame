"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { IslandCard } from "@/components/play/IslandCard";
import {
  levelThumbSrc,
  listDailyCards,
  listPlayerScores,
  listSubmissionCosts,
  type DailyCard,
} from "@/lib/supabase/scores";

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month, day));
  return date.toISOString().slice(0, 10);
}

/** THIS MONTH IN UTC. EACH DAY IS A SMALL LEVEL CARD. */
export function CalendarMonth() {
  const auth = useAuth();
  const [dailies, setDailies] = useState<Record<string, DailyCard>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [costs, setCosts] = useState<Record<string, number[]>>({});
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const today = now.toISOString().slice(0, 10);
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const label = new Date(Date.UTC(year, month, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: count }, (_, index) => index + 1),
  ];

  useEffect(() => {
    let cancel = false;
    void Promise.all([listDailyCards(), listSubmissionCosts()]).then(([cards, field]) => {
      if (cancel) {
        return;
      }
      const byDay: Record<string, DailyCard> = {};
      for (const card of cards) {
        byDay[card.day] = card;
      }
      setDailies(byDay);
      setCosts(field);
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!auth.userId) {
      return;
    }
    let cancel = false;
    void listPlayerScores(auth.userId).then((next) => {
      if (!cancel) {
        setScores(next);
      }
    });
    return () => {
      cancel = true;
    };
  }, [auth.userId]);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-3 py-4">
      <h2 className="text-center text-[11px] uppercase tracking-[0.16em]">{label}</h2>
      <div className="grid grid-cols-7 gap-1 text-center text-[8px] uppercase tracking-[0.12em]">
        {WEEK.map((name) => (
          <div key={name}>{name}</div>
        ))}
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} />;
          }
          const key = dayKey(year, month, day);
          const future = key > today;
          const card = dailies[key];
          const thumb = card?.thumb ? levelThumbSrc(card.id, card.thumb) : "";
          return (
            <IslandCard
              key={key}
              dense
              href={future ? undefined : `/play?daily=${key}`}
              title={card?.name || String(day)}
              solver={card?.solver ?? null}
              costs={card ? (costs[card.id] ?? []) : []}
              score={card ? (scores[card.id] ?? null) : null}
              showScore={!future}
              image={
                <>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ imageRendering: "pixelated" }}
                    />
                  ) : null}
                  {card?.name ? (
                    <span className="absolute bottom-0.5 left-0.5 text-[8px] text-white [text-shadow:1px_0_0_rgb(12_48_92),-1px_0_0_rgb(12_48_92),0_1px_0_rgb(12_48_92),0_-1px_0_rgb(12_48_92)]">
                      {day}
                    </span>
                  ) : null}
                </>
              }
            />
          );
        })}
      </div>
    </div>
  );
}

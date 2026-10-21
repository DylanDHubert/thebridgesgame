"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ensureDailyDay } from "@/app/actions/dailyLevel";
import { useAuth } from "@/components/auth/AuthProvider";
import { MapPreview } from "@/components/game/MapPreview";
import { IslandCard } from "@/components/play/IslandCard";
import { dailyPresetFor, type DailyPresetId } from "@/lib/game/daily";
import type { Level } from "@/lib/game/level/types";
import {
  levelThumbSrc,
  listDailyCards,
  listPlayerScores,
  listSubmissionCosts,
  loadRemoteLevel,
  type DailyCard,
} from "@/lib/supabase/scores";

const PRESET_MARK: Record<DailyPresetId, { word: string; className: string }> = {
  A: { word: "Easy", className: "text-[#16a34a]" },
  B: { word: "Med", className: "text-[#eab308]" },
  C: { word: "Hard", className: "text-[#dc2626]" },
};

// ONE SOLVER AT A TIME. THE MONTH IS ALL ON SCREEN AT ONCE.
let ensureChain: Promise<unknown> = Promise.resolve();

function queueEnsure(day: string): Promise<DailyCard | null> {
  const run = ensureChain.then(() => ensureDailyDay(day), () => ensureDailyDay(day));
  ensureChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month, day));
  return date.toISOString().slice(0, 10);
}

function dayDate(day: string): Date {
  return new Date(`${day}T12:00:00.000Z`);
}

/** THE SAVED STILL, OR ONE PAINT THAT STORES THE DAY AND THE PICTURE. */
function DailyShot({
  day,
  id,
  thumb,
  onStored,
}: {
  day: string;
  id: string | null;
  thumb: string | null;
  onStored: (card: DailyCard) => void;
}) {
  const [revision, setRevision] = useState(thumb);
  const [shotId, setShotId] = useState<string | null>(id);
  const ref = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState<Level | null>(null);

  useEffect(() => {
    if (id) {
      setShotId(id);
    }
  }, [id]);

  useEffect(() => {
    if (thumb) {
      setRevision(thumb);
    }
  }, [thumb]);

  useEffect(() => {
    if (revision) {
      return;
    }
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
        void (async () => {
          const card = await queueEnsure(day);
          if (cancel || !card) {
            return;
          }
          setShotId(card.id);
          onStored(card);
          if (card.thumb) {
            setRevision(card.thumb);
            return;
          }
          const remote = await loadRemoteLevel(card.id);
          if (cancel || !remote) {
            return;
          }
          setLevel(remote);
        })();
      },
      { rootMargin: "160px" },
    );
    observer.observe(node);
    return () => {
      cancel = true;
      observer.disconnect();
    };
  }, [day, onStored, revision]);

  if (revision) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={levelThumbSrc(shotId ?? `daily-${day}`, revision)}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ imageRendering: "pixelated" }}
      />
    );
  }
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0" aria-hidden>
      {level ? (
        <MapPreview
          level={level}
          borderless
          cells={false}
          boarClick={false}
          publish
          onPublished={setRevision}
        />
      ) : null}
    </div>
  );
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
      setDailies((prev) => {
        const byDay = { ...prev };
        for (const card of cards) {
          byDay[card.day] = card;
        }
        return byDay;
      });
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

  const remember = useCallback((card: DailyCard) => {
    setDailies((prev) => {
      const current = prev[card.day];
      if (
        current &&
        current.id === card.id &&
        current.solver === card.solver &&
        current.thumb === card.thumb
      ) {
        return prev;
      }
      return { ...prev, [card.day]: card };
    });
  }, []);

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
          const mark = PRESET_MARK[dailyPresetFor(dayDate(key)).id];
          return (
            <IslandCard
              key={key}
              dense
              href={future ? undefined : `/play?daily=${key}`}
              title={
                <>
                  <span className="text-black group-hover:text-white">{day}</span>{" "}
                  <span className={`${mark.className} group-hover:text-white`}>{mark.word}</span>
                </>
              }
              solver={card?.solver ?? null}
              costs={card ? (costs[card.id] ?? []) : []}
              score={card ? (scores[card.id] ?? null) : null}
              showScore={!future}
              image={
                future ? null : (
                  <DailyShot
                    day={key}
                    id={card?.id ?? null}
                    thumb={card?.thumb ?? null}
                    onStored={remember}
                  />
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}

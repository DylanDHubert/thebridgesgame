"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { ensureDailyDay } from "@/app/actions/dailyLevel";
import { useAuth } from "@/components/auth/AuthProvider";
import { useButtonSfx } from "@/lib/sound/buttonSfx";
import { MapPreview } from "@/components/game/MapPreview";
import { ISLAND_ROW, IslandCard } from "@/components/play/IslandCard";
import { LevelHistory } from "@/components/play/LevelHistory";
import { dailyPresetFor, type DailyPresetId } from "@/lib/game/daily";
import { pacificDateKey, pacificParts } from "@/lib/game/pacificDay";
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
/** OCTOBER 2026 IS THE FIRST DAILY MONTH. */
const FIRST_YEAR = 2026;
const FIRST_MONTH = 9;

const MONTH_STEP = [
  "silkscreen-bold inline-flex h-8 w-8 items-center justify-center border border-black bg-white text-[20px] leading-none text-black",
  "hover:bg-[#fbbf24]",
  "disabled:pointer-events-none disabled:opacity-40",
].join(" ");

function MonthStep({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  const press = useButtonSfx<HTMLButtonElement>("button");
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={MONTH_STEP}
      {...press()}
    >
      {children}
    </button>
  );
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

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

/** WIDEST MONTH THAT STILL FITS THE FRAME. THE SHOTS KEEP THE PLAY SHAPE. */
function useMonthWidth(weeks: number) {
  const frameRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const grid = gridRef.current;
    if (!frame || !grid) {
      return;
    }
    const fit = () => {
      const availW = frame.clientWidth;
      const availH = frame.clientHeight;
      if (availW <= 0 || availH <= 0) {
        return;
      }
      grid.style.width = `${availW}px`;
      const fullH = grid.scrollHeight;
      const shot = grid.querySelector("[data-shot]");
      const shotH = shot instanceof HTMLElement ? shot.offsetHeight : 0;
      const variable = shotH * weeks;
      const chrome = Math.max(0, fullH - variable);
      let next = availW;
      if (fullH > availH && variable > 0) {
        const budget = Math.max(1, availH - chrome);
        next = Math.max(160, Math.floor(availW * (budget / variable)));
        grid.style.width = `${next}px`;
        if (grid.scrollHeight > availH) {
          const over = grid.scrollHeight - availH;
          const perPx = variable / availW;
          next = Math.max(160, Math.floor(next - over / Math.max(perPx, 0.01) - 1));
          grid.style.width = `${next}px`;
        }
      }
      setWidth((prev) => (prev === next ? prev : next));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [weeks]);

  return { frameRef, gridRef, width };
}

/** THIS MONTH IN PACIFIC TIME. EACH DAY IS A LEVEL CARD, SEVEN TO A ROW. */
export function CalendarMonth() {
  const auth = useAuth();
  const [dailies, setDailies] = useState<Record<string, DailyCard>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [costs, setCosts] = useState<Record<string, number[]>>({});
  const [open, setOpen] = useState<{
    id: string;
    name: string;
    solver: number | null;
    playHref: string;
  } | null>(null);
  const now = new Date();
  const live = pacificParts(now);
  const [cursor, setCursor] = useState(() => ({ year: live.year, month: live.month }));
  const { year, month } = cursor;
  const today = pacificDateKey(now);
  const atFirst = year < FIRST_YEAR || (year === FIRST_YEAR && month <= FIRST_MONTH);
  const atNow = year > live.year || (year === live.year && month >= live.month);
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
  const weeks = Math.ceil(cells.length / 7);
  const { frameRef, gridRef, width } = useMonthWidth(weeks);

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

  const openDay = useCallback(
    (day: string) => {
      const known = dailies[day];
      const playHref = `/play?daily=${day}`;
      if (known) {
        setOpen({ id: known.id, name: known.name, solver: known.solver, playHref });
        return;
      }
      void queueEnsure(day).then((card) => {
        if (card) {
          remember(card);
          setOpen({ id: card.id, name: card.name, solver: card.solver, playHref });
          return;
        }
        setOpen({ id: "", name: day, solver: null, playHref });
      });
    },
    [dailies, remember],
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden px-3 py-4">
      <div className="flex shrink-0 items-center justify-center gap-3">
        <MonthStep
          label="Previous month"
          disabled={atFirst}
          onClick={() => setCursor((current) => shiftMonth(current.year, current.month, -1))}
        >
          {"<"}
        </MonthStep>
        <h2 className="min-w-32 text-center text-[11px] uppercase tracking-[0.16em]">{label}</h2>
        <MonthStep
          label="Next month"
          disabled={atNow}
          onClick={() => setCursor((current) => shiftMonth(current.year, current.month, 1))}
        >
          {">"}
        </MonthStep>
      </div>
      <div ref={frameRef} className="flex min-h-0 flex-1 items-center justify-center">
        <div
          ref={gridRef}
          className={`${ISLAND_ROW} text-center text-[8px] uppercase tracking-[0.12em]`}
          style={{ width: width == null ? "100%" : `${width}px` }}
        >
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
              onOpen={future ? undefined : () => openDay(key)}
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
      {open ? (
        <LevelHistory
          levelId={open.id}
          name={open.name}
          solver={open.solver}
          playHref={open.playHref}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}

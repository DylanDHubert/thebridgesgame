import Link from "next/link";

import { HairlineHeader } from "@/components/ui/hairline";
import { TILE_SPRITES } from "@/lib/rendering/isoTiles";

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const INK =
  "1px 0 0 rgb(12 48 92), -1px 0 0 rgb(12 48 92), 0 1px 0 rgb(12 48 92), 0 -1px 0 rgb(12 48 92)";

function dayKey(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month, day));
  return date.toISOString().slice(0, 10);
}

/** THE FULL TILE SPRITE FOR ONE UTC DAY. */
function DayTile({
  day,
  kind,
  href,
  tone,
}: {
  day: number;
  kind: "grass" | "ocean";
  href?: string;
  tone: string;
}) {
  const face = (
    <span
      className="flex aspect-square items-center justify-center text-[10px]"
      style={{
        backgroundImage: `url(${TILE_SPRITES[kind]})`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        imageRendering: "pixelated",
        color: tone,
        textShadow: INK,
      }}
    >
      {day}
    </span>
  );
  if (!href) {
    return <div className="opacity-45">{face}</div>;
  }
  return (
    <Link href={href} className="block transition hover:brightness-110">
      {face}
    </Link>
  );
}

/** THIS MONTH IN UTC. A DAY OPENS THAT DAILY, INCLUDING ONES NOT BUILT YET. */
export default function CalendarPage() {
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

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <HairlineHeader title="Play" subtitle="Calendar" nav="calendar" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
        <h2 className="text-center text-[11px] uppercase tracking-[0.16em]">{label}</h2>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.12em]">
          {WEEK.map((name) => (
            <div key={name}>{name}</div>
          ))}
          {cells.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} />;
            }
            const key = dayKey(year, month, day);
            const future = key > today;
            return (
              <DayTile
                key={key}
                day={day}
                kind={future ? "ocean" : "grass"}
                href={future ? undefined : `/play?daily=${key}`}
                tone={key === today ? "#fbbf24" : "#ffffff"}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}

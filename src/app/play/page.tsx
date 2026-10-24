import { LevelPicker } from "@/components/play/LevelPicker";
import { PlaySession } from "@/components/play/PlaySession";
import { HairlineHeader, HairlineLink } from "@/components/ui/hairline";
import { creatureHiding } from "@/lib/game/creatureHiding";
import { buildDailyLevel } from "@/lib/game/daily";
import type { Level } from "@/lib/game/level/types";
import { openRequiredLandings } from "@/lib/game/level/landings";
import { serializeLevel } from "@/lib/game/level/serialize";
import { listLevelCards, loadStoredLevel, replaceDailyBoard, saveDailyLevel } from "@/lib/supabase/scores";

function dailyDate(value: string): Date | null {
  if (value === "1") {
    return new Date();
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) > new Date().toISOString().slice(0, 10)) {
    return null;
  }
  return date;
}

function logCreature(level: Level) {
  const hiding = creatureHiding(level);
  if (!hiding) {
    console.log("[journeyman:creature] none", { levelId: level.id });
    return;
  }
  console.log("[journeyman:creature] hiding", {
    levelId: level.id,
    id: hiding.creature.id,
    name: hiding.creature.name,
    row: hiding.row,
    col: hiding.col,
  });
}

type PlayPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const params = await searchParams;
  const dailyValue = params.daily?.trim();
  if (dailyValue) {
    const date = dailyDate(dailyValue);
    if (!date) {
      return (
        <main className="flex h-dvh flex-col overflow-hidden">
          <HairlineHeader title="Play" subtitle="Daily" nav="play" />
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-[11px] uppercase tracking-[0.14em]">That day is not open.</p>
            <HairlineLink href="/play/calendar">Calendar</HairlineLink>
          </div>
        </main>
      );
    }
    const daily = buildDailyLevel(date);
    const stored = await loadStoredLevel(daily.level.id);
    if (!stored) {
      await saveDailyLevel({
        level: daily.level,
        day: daily.day,
        preset: daily.preset,
        solver: daily.solver,
      });
    } else if (openRequiredLandings(stored.level).length > 0) {
      await replaceDailyBoard({ level: stored.level, solver: daily.solver });
    }
    logCreature(daily.level);
    console.log("[journeyman:daily] serve", {
      day: daily.day,
      preset: daily.preset,
      solver: daily.solver,
      bytes: serializeLevel(daily.level).terrain.length,
    });
    return (
      <main className="h-dvh overflow-hidden">
        <PlaySession level={daily.level} solver={daily.solver} />
      </main>
    );
  }

  const levelId = params.level?.trim();

  if (levelId) {
    const stored = await loadStoredLevel(levelId);
    if (!stored) {
      return (
        <main className="flex h-dvh flex-col overflow-hidden">
          <HairlineHeader title="Play" subtitle="Level missing" nav="play" />
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-[11px] uppercase tracking-[0.14em]">
              Could not load level {levelId}.
            </p>
            <HairlineLink href="/play">Level select</HairlineLink>
          </div>
        </main>
      );
    }

    logCreature(stored.level);
    return (
      <main className="h-dvh overflow-hidden">
        <PlaySession level={stored.level} solver={stored.solver ?? undefined} />
      </main>
    );
  }

  const cards = await listLevelCards();

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <HairlineHeader title="Play" subtitle="Choose a level" nav="play" />
      <div className="flex min-h-0 w-full flex-1 flex-col px-3 py-4">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3">
          <LevelPicker cards={cards} />
        </div>
      </div>
    </main>
  );
}

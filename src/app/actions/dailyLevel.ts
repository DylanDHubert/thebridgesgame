"use server";

import { buildDailyLevel } from "@/lib/game/daily";
import { pacificDateKey } from "@/lib/game/pacificDay";
import { openRequiredLandings } from "@/lib/game/level/landings";
import { perfectBridgeCost } from "@/lib/game/perfectScore";
import { loadDailyCard, loadStoredLevel, replaceDailyBoard, saveDailyLevel, type DailyCard } from "@/lib/supabase/scores";

/** SAVE A PAST OR CURRENT PACIFIC DAY ONCE, THEN HAND BACK THE ROW. */
export async function ensureDailyDay(day: string): Promise<DailyCard | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    console.log("[journeyman:daily] ensure rejected", { day });
    return null;
  }
  const today = pacificDateKey();
  if (day > today) {
    console.log("[journeyman:daily] ensure future", { day, today });
    return null;
  }
  const existing = await loadDailyCard(day);
  if (existing) {
    const stored = await loadStoredLevel(existing.id);
    const opened = stored ? openRequiredLandings(stored.level) : [];
    if (stored && opened.length > 0) {
      const solver = perfectBridgeCost(stored.level);
      await replaceDailyBoard({ level: stored.level, solver });
      console.log("[journeyman:daily] ensure repaired", {
        day,
        levelId: existing.id,
        solver,
        opened: opened.map((cell) => [cell.row, cell.col]),
      });
      return { ...existing, solver, thumb: null };
    }
    console.log("[journeyman:daily] ensure hit", {
      day,
      levelId: existing.id,
      thumb: existing.thumb != null,
    });
    return existing;
  }
  const date = new Date(`${day}T12:00:00.000Z`);
  const daily = buildDailyLevel(date);
  await saveDailyLevel({
    level: daily.level,
    day: daily.day,
    preset: daily.preset,
    solver: daily.solver,
  });
  console.log("[journeyman:daily] ensure stored", {
    day,
    levelId: daily.level.id,
    solver: daily.solver,
  });
  return {
    id: daily.level.id,
    day: daily.day,
    name: daily.level.name,
    thumb: null,
    solver: daily.solver,
  };
}

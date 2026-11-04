import { scoreBand, scoreTitle, type ScoreBand } from "@/lib/game/par";

const QUIP: Record<ScoreBand, string> = {
  Albatross: "A ridiculous round.",
  Eagle: "Way under par.",
  Birdie: "Under par.",
  Par: "Right on the number.",
  Bogey: "One bridge too many.",
  Double: "A messy crossing.",
  Triple: "The long way around.",
  "+N": "The scenic route.",
};

export type ShareStory = {
  title: string;
  quip: string;
  place: string;
  rank: number;
  total: number;
};

const BAND_MARK: Record<ScoreBand, string> = {
  Albatross: "🦤",
  Eagle: "🦅",
  Birdie: "🦆",
  Par: "🟰",
  Bogey: "⬛",
  Double: "⬛⬛",
  Triple: "⬛⬛⬛",
  "+N": "➕",
};

/** GREEN IS MON–WED, ORANGE IS THU–FRI, RED IS THE WEEKEND. MATCHES THE DAILY PRESETS. */
function dailyDot(day: string): string {
  const weekday = new Date(`${day}T12:00:00.000Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) {
    return "🔴";
  }
  if (weekday === 4 || weekday === 5) {
    return "🟠";
  }
  return "🟢";
}

/** ONE LINE FOR A PASTE. THE DOT IS ONLY ON A DAILY. */
export function shareGlyph(score: number, solver: number | null, day: string | null): string {
  const mark = solver == null ? "" : BAND_MARK[scoreBand(score, solver)];
  const scene = `🏝️🌊${mark}🌉🐗`;
  return day ? `${dailyDot(day)}${scene}` : scene;
}

/** THE LINE ON THE CARD. RANK COUNTS EVERYONE WHO BUILT IT CHEAPER. */
export function shareStory(score: number, solver: number | null, costs: number[]): ShareStory {
  const cheaper = costs.filter((cost) => cost < score).length;
  const total = Math.max(costs.length, 1);
  const rank = cheaper + 1;
  let place = "First boar across.";
  if (total > 1 && cheaper === 0) {
    place = "Nobody built it cheaper.";
  } else if (cheaper === 1) {
    place = "One player found a shorter way.";
  } else if (cheaper > 1) {
    place = `${cheaper} players found a shorter way.`;
  }
  if (solver == null) {
    return {
      title: String(score),
      quip: `Across in ${score}.`,
      place,
      rank,
      total,
    };
  }
  return {
    title: scoreTitle(score, solver),
    quip: QUIP[scoreBand(score, solver)],
    place,
    rank,
    total,
  };
}

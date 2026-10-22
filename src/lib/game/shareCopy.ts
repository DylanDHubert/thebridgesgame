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

/** GOLF PAR SITS ABOVE THE STORED SOLVER COST SO THE TARGET IS EASIER. */

export function easedPar(solver: number): number {
  const lift = solver <= 10 ? 2 : solver <= 20 ? 3 : 4;
  return solver + lift;
}

export const SCORE_BANDS = [
  "Albatross",
  "Eagle",
  "Birdie",
  "Par",
  "Bogey",
  "Double",
  "Triple",
  "+N",
] as const;

export type ScoreBand = (typeof SCORE_BANDS)[number];

/** ALBATROSS IS EVERYTHING THREE OR MORE UNDER THE GOLF PAR. THERE IS NO CONDOR. */
export function scoreBand(score: number, solver: number): ScoreBand {
  const delta = score - easedPar(solver);
  if (delta <= -3) {
    return "Albatross";
  }
  if (delta === -2) {
    return "Eagle";
  }
  if (delta === -1) {
    return "Birdie";
  }
  if (delta === 0) {
    return "Par";
  }
  if (delta === 1) {
    return "Bogey";
  }
  if (delta === 2) {
    return "Double";
  }
  if (delta === 3) {
    return "Triple";
  }
  return "+N";
}

/** THE PLAYER'S OWN MARK. A BIG OVER SHOWS THE REAL NUMBER. */
export function scoreTitle(score: number, solver: number): string {
  const delta = score - easedPar(solver);
  if (delta >= 4) {
    return `+${delta}`;
  }
  return scoreBand(score, solver);
}

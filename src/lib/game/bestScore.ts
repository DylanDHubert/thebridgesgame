const BEST_KEY = "journeyman:best";
const OPTIMAL_KEY = "journeyman:optimal";

function readAll(): Record<string, number> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(BEST_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const scores: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        scores[id] = value;
      }
    }
    return scores;
  } catch {
    return {};
  }
}

/** BEST BRIDGE COST FOR THIS LEVEL IN THE CURRENT BROWSER SESSION. */
export function readBestScore(levelId: string): number | null {
  const value = readAll()[levelId];
  return value == null ? null : value;
}

export function readBestScores(): Record<string, number> {
  return readAll();
}

function readOptimalIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.sessionStorage.getItem(OPTIMAL_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

/** LEVELS WHOSE STORED BEST MATCHED THE OPTIMAL COST. */
export function readOptimalLevels(): Set<string> {
  return new Set(readOptimalIds());
}

/** REMEMBER THAT THIS LEVEL'S BEST IS OPTIMAL. A LATER WORSE RUN KEEPS THE MARK. */
export function markOptimal(levelId: string) {
  const ids = readOptimalIds();
  if (ids.includes(levelId) || typeof window === "undefined") {
    return;
  }
  ids.push(levelId);
  window.sessionStorage.setItem(OPTIMAL_KEY, JSON.stringify(ids));
  console.log("[journeyman:play] optimal marked", { levelId });
}

/** KEEP THE LOWER COST. RETURNS THE BEST AFTER THIS RUN. */
export function rememberBestScore(levelId: string, score: number): number {
  const scores = readAll();
  const previous = scores[levelId];
  const best = previous == null ? score : Math.min(previous, score);
  scores[levelId] = best;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(BEST_KEY, JSON.stringify(scores));
  }
  console.log("[journeyman:play] best score", { levelId, score, best });
  return best;
}

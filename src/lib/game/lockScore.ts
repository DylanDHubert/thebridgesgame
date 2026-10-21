import { saveFirstSubmission } from "@/lib/supabase/scores";

const LOCK_KEY = "journeyman:lock";
const NAME_KEY = "journeyman:name";
const PLAYER_KEY = "journeyman:player";

function readLocks(): Record<string, number> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(LOCK_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const locks: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        locks[id] = value;
      }
    }
    return locks;
  } catch {
    return {};
  }
}

export function readLockedScores(): Record<string, number> {
  return readLocks();
}

export function readLockedScore(levelId: string): number | null {
  const value = readLocks()[levelId];
  return value == null ? null : value;
}

export function readUsername(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(NAME_KEY)?.trim() ?? "";
}

export function saveUsername(name: string) {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = name.trim();
  if (!trimmed) {
    window.localStorage.removeItem(NAME_KEY);
    return;
  }
  window.localStorage.setItem(NAME_KEY, trimmed);
}

function playerId(): string {
  const existing = window.localStorage.getItem(PLAYER_KEY);
  if (existing) {
    return existing;
  }
  const next = crypto.randomUUID();
  window.localStorage.setItem(PLAYER_KEY, next);
  return next;
}

/** KEEP THE FIRST COST. A LATER RUN DOES NOT REPLACE IT. */
export function lockFirstScore(
  levelId: string,
  score: number,
  bridges: string[],
  username: string,
  player: { id: string | null; token: string | null },
): number {
  const locks = readLocks();
  const existing = locks[levelId];
  if (existing != null) {
    return existing;
  }
  locks[levelId] = score;
  window.localStorage.setItem(LOCK_KEY, JSON.stringify(locks));
  console.log("[journeyman:play] locked score", { levelId, score });
  void saveFirstSubmission({
    levelId,
    playerId: player.id ?? playerId(),
    username: username.trim() || "boar",
    cost: score,
    bridges,
    token: player.token,
  });
  return score;
}

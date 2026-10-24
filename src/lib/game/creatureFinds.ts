import { cellKey } from "@/lib/game/coords";
import { creatureHiding } from "@/lib/game/creatureHiding";
import { CREATURES, creatureById, type Creature } from "@/lib/game/creatures";
import type { Level } from "@/lib/game/level/types";
import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";
import { floodReachable } from "@/lib/game/simulateLevel";

const FIND_KEY = "journeyman:creatures";

export type CreatureFindSource = "wild" | "gift";

/** LOCAL STAND-IN FOR THE FINDS TABLE. ONE ROW PER CREATURE. */
export type CreatureFind = {
  id: number;
  source: CreatureFindSource;
  levelId: string;
};

export type CreatureClaim = {
  creature: Creature;
  source: CreatureFindSource;
};

function readFinds(): CreatureFind[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(FIND_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const finds: CreatureFind[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const row = entry as Record<string, unknown>;
      if (
        typeof row.id !== "number" ||
        (row.source !== "wild" && row.source !== "gift") ||
        typeof row.levelId !== "string" ||
        !creatureById(row.id)
      ) {
        continue;
      }
      finds.push({ id: row.id, source: row.source, levelId: row.levelId });
    }
    return finds;
  } catch {
    return [];
  }
}

function writeFinds(finds: CreatureFind[]) {
  window.localStorage.setItem(FIND_KEY, JSON.stringify(finds));
}

export function readCreatureFinds(): CreatureFind[] {
  return readFinds();
}

function remember(finds: CreatureFind[], claim: CreatureClaim, levelId: string): CreatureClaim {
  finds.push({ id: claim.creature.id, source: claim.source, levelId });
  writeFinds(finds);
  return claim;
}

/**
 * ONE UNLOCK PER SUBMIT.
 * A REACHABLE HIDING WINS. AN EMPTY BOOK WITH NO WILD FIND GETS ONE GIFT.
 */
export function claimCreature(level: Level, bridges: Set<string>): CreatureClaim | null {
  const finds = readFinds();
  const owned = new Set(finds.map((find) => find.id));
  const hiding = creatureHiding(level);
  if (hiding && level.start) {
    const reachable = floodReachable(level, bridges, level.start);
    if (reachable.has(cellKey(hiding.row, hiding.col)) && !owned.has(hiding.creature.id)) {
      return remember(finds, { creature: hiding.creature, source: "wild" }, level.id);
    }
  }
  if (finds.length > 0) {
    return null;
  }
  const pool = CREATURES.filter((creature) => !owned.has(creature.id));
  if (pool.length === 0) {
    return null;
  }
  const roll = mulberry32(hashStringToSeed(`${level.id}:gift:${Date.now()}`))();
  const creature = pool[Math.floor(roll * pool.length)]!;
  return remember(finds, { creature, source: "gift" }, level.id);
}

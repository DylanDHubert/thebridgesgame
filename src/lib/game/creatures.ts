import catalogFile from "@/content/creatures.json";

export type Creature = {
  id: number;
  /** FOLDER UNDER public/assets/animals */
  slug: string;
  name: string;
  /** WHICH FILE IN THE FOLDER: 0.png OR 1.png */
  frame: 0 | 1;
  sound: string;
  description: string;
};

function isFrame(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

function readCatalog(raw: unknown): Creature[] {
  if (!Array.isArray(raw)) {
    throw new Error("CREATURE CATALOG IS NOT A LIST");
  }
  const seen = new Set<number>();
  const creatures: Creature[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      throw new Error("CREATURE ENTRY IS NOT AN OBJECT");
    }
    const row = entry as Record<string, unknown>;
    if (
      typeof row.id !== "number" ||
      !Number.isInteger(row.id) ||
      typeof row.slug !== "string" ||
      typeof row.name !== "string" ||
      typeof row.sound !== "string" ||
      typeof row.description !== "string" ||
      !isFrame(row.frame)
    ) {
      throw new Error("CREATURE ENTRY IS INCOMPLETE");
    }
    if (seen.has(row.id)) {
      throw new Error(`CREATURE ID REPEATED ${row.id}`);
    }
    seen.add(row.id);
    creatures.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      frame: row.frame,
      sound: row.sound,
      description: row.description,
    });
  }
  creatures.sort((a, b) => a.id - b.id);
  return creatures;
}

/** NUMBERED CARDS. ADD THE NEXT ANIMAL AT THE END. NEVER RENUMBER. */
export const CREATURES = readCatalog(catalogFile);

const BY_ID = new Map(CREATURES.map((creature) => [creature.id, creature]));

export function creatureById(id: number): Creature | undefined {
  return BY_ID.get(id);
}

export function creatureSprite(creature: Creature): string {
  return `/assets/animals/${creature.slug}/${creature.frame}.png`;
}

/** LOCKED CARD. LETTERS BECOME ?. SPACES AND PUNCTUATION STAY. */
export function blankLetters(text: string): string {
  return text.replace(/\p{L}/gu, "?");
}

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { HOME_LEVEL_ID } from "@/lib/game/homeMap";
import type { Mission, TileKind } from "../types";
import { deserializeLevel } from "./serialize";
import type { Level, LevelFile } from "./types";

const LEVELS_DIR = path.join(process.cwd(), "public", "levels");

export type LevelListItem = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  terrain: TileKind[];
  mission: Mission;
};

/** SLUG SAFE FOR A FILENAME — REJECTS PATH TRAVERSAL */
function safeFileId(id: string): string {
  const slug = id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return slug.replace(/^-+|-+$/g, "");
}

function isLevelFile(value: unknown): value is LevelFile {
  if (!value || typeof value !== "object") {
    return false;
  }
  const file = value as Partial<LevelFile>;
  return (
    typeof file.version === "number" &&
    typeof file.id === "string" &&
    typeof file.name === "string" &&
    typeof file.terrain === "string" &&
    !!file.grid &&
    typeof file.grid.rows === "number" &&
    typeof file.grid.cols === "number"
  );
}

async function readLevelFile(fileId: string): Promise<LevelFile | null> {
  const target = path.join(LEVELS_DIR, `${fileId}.json`);
  try {
    const raw = await readFile(target, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isLevelFile(parsed)) {
      console.error("[journeyman:levels] invalid level file shape", { fileId });
      return null;
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[journeyman:levels] failed to read level", { fileId, error: message });
    return null;
  }
}

export async function loadSavedLevel(id: string): Promise<Level | null> {
  const fileId = safeFileId(id);
  if (!fileId) {
    return null;
  }
  const file = await readLevelFile(fileId);
  if (!file) {
    return null;
  }
  return deserializeLevel(file);
}

export async function listSavedLevels(): Promise<LevelListItem[]> {
  let entries: string[];
  try {
    entries = await readdir(LEVELS_DIR);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[journeyman:levels] failed to list levels dir", { error: message });
    return [];
  }

  const items: LevelListItem[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) {
      continue;
    }
    const fileId = entry.slice(0, -".json".length);
    const file = await readLevelFile(fileId);
    if (!file) {
      continue;
    }
    const level = deserializeLevel(file);
    if (level.id === HOME_LEVEL_ID || fileId === HOME_LEVEL_ID) {
      continue;
    }
    items.push({
      id: level.id,
      name: level.name,
      rows: level.rows,
      cols: level.cols,
      terrain: level.terrain,
      mission: level.mission,
    });
  }

  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

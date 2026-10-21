import { deserializeLevel, serializeLevel } from "@/lib/game/level/serialize";
import type { Level, LevelFile } from "@/lib/game/level/types";

type SupabaseEnv = {
  url: string;
  key: string;
};

function env(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

function headers(key: string, prefer?: string, token?: string | null): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${token || key}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

/** STORE THE DAILY ONCE. A REPEAT OF THE SAME DAY IS IGNORED. */
export async function saveDailyLevel(input: {
  level: Level;
  day: string;
  preset: string;
  solver: number | null;
}): Promise<void> {
  const remote = env();
  if (!remote) {
    console.log("[journeyman:daily] supabase skipped");
    return;
  }
  const response = await fetch(`${remote.url}/rest/v1/levels`, {
    method: "POST",
    headers: headers(remote.key, "resolution=ignore-duplicates"),
    body: JSON.stringify({
      id: input.level.id,
      name: input.level.name,
      kind: "daily",
      day: input.day,
      preset: input.preset,
      solver: input.solver,
      body: serializeLevel(input.level),
    }),
  });
  console.log("[journeyman:daily] stored", {
    levelId: input.level.id,
    status: response.status,
  });
}

/** THE FIRST SUBMISSION FOR THIS PLAYER AND LEVEL. LATER ROWS ARE REFUSED. */
export async function saveFirstSubmission(input: {
  levelId: string;
  playerId: string;
  username: string;
  cost: number;
  bridges: string[];
  token?: string | null;
}): Promise<void> {
  const remote = env();
  if (!remote || typeof window === "undefined") {
    return;
  }
  const response = await fetch(`${remote.url}/rest/v1/submissions`, {
    method: "POST",
    headers: headers(remote.key, "resolution=ignore-duplicates", input.token),
    body: JSON.stringify({
      level_id: input.levelId,
      player_id: input.playerId,
      username: input.username,
      cost: input.cost,
      bridges: input.bridges,
      counts: true,
    }),
  });
  console.log("[journeyman:play] submission", {
    levelId: input.levelId,
    status: response.status,
  });
}

export type LevelCard = {
  id: string;
  name: string;
  thumb: string | null;
  solver: number | null;
};

/** PUBLIC STILL FOR A LEVEL CARD. REVISION BUSTS THE CACHE AFTER A RE-SAVE. */
export function levelThumbSrc(id: string, revision: string): string {
  const remote = env();
  if (!remote) {
    return "";
  }
  return `${remote.url}/storage/v1/object/public/level-thumbs/${encodeURIComponent(id)}.png?v=${encodeURIComponent(revision)}`;
}

/** WRITE THE PNG, THEN REMEMBER THE REVISION ON THE LEVEL ROW. */
export async function uploadLevelThumb(id: string, png: Uint8Array): Promise<string | null> {
  const remote = env();
  if (!remote) {
    console.log("[journeyman:levels] thumb skipped");
    return null;
  }
  const revision = String(Date.now());
  const response = await fetch(
    `${remote.url}/storage/v1/object/level-thumbs/${encodeURIComponent(id)}.png`,
    {
      method: "POST",
      headers: {
        apikey: remote.key,
        Authorization: `Bearer ${remote.key}`,
        "Content-Type": "image/png",
        "x-upsert": "true",
        "cache-control": "public, max-age=31536000",
      },
      body: new Blob([png as BlobPart]),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    console.log("[journeyman:levels] thumb upload failed", {
      levelId: id,
      status: response.status,
      detail: detail.slice(0, 300),
    });
    return null;
  }
  const patch = await fetch(`${remote.url}/rest/v1/levels?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: headers(remote.key, "return=minimal"),
    body: JSON.stringify({ thumb: revision }),
  });
  console.log("[journeyman:levels] thumb stored", {
    levelId: id,
    bytes: png.byteLength,
    status: patch.status,
  });
  if (!patch.ok) {
    return null;
  }
  return revision;
}

/** NAMES AND THUMB REVISIONS. THE MAP LOADS ONLY WHEN A CARD HAS NO STILL. */
export async function listLevelCards(): Promise<LevelCard[]> {
  const remote = env();
  if (!remote) {
    return [];
  }
  const response = await fetch(
    `${remote.url}/rest/v1/levels?kind=in.(player,catalog)&select=id,name,thumb,solver&order=name.asc`,
    { headers: headers(remote.key), cache: "no-store" },
  );
  if (!response.ok) {
    console.log("[journeyman:levels] list failed", { status: response.status });
    return [];
  }
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") {
      return [];
    }
    const id = "id" in row && typeof row.id === "string" ? row.id : "";
    const name = "name" in row && typeof row.name === "string" ? row.name : "";
    const thumb = "thumb" in row && typeof row.thumb === "string" ? row.thumb : null;
    const solver = "solver" in row && typeof row.solver === "number" ? row.solver : null;
    return id && name ? [{ id, name, thumb, solver }] : [];
  });
}

export type StoredLevel = {
  level: Level;
  solver: number | null;
};

/** BOARD PLUS THE STORED SOLVER COST. NULL WHEN THE ROW HAS NONE. */
export async function loadStoredLevel(id: string): Promise<StoredLevel | null> {
  const remote = env();
  if (!remote) {
    return null;
  }
  const response = await fetch(
    `${remote.url}/rest/v1/levels?id=eq.${encodeURIComponent(id)}&select=body,solver`,
    { headers: headers(remote.key), cache: "no-store" },
  );
  if (!response.ok) {
    console.log("[journeyman:levels] load failed", { id, status: response.status });
    return null;
  }
  const rows: unknown = await response.json();
  const row = Array.isArray(rows) ? (rows[0] as { body?: unknown; solver?: unknown } | undefined) : undefined;
  if (!row || !isBody(row.body)) {
    return null;
  }
  const solver = typeof row.solver === "number" ? row.solver : null;
  console.log("[journeyman:levels] loaded", { id, solver });
  return { level: deserializeLevel(row.body), solver };
}

export async function loadRemoteLevel(id: string): Promise<Level | null> {
  const stored = await loadStoredLevel(id);
  return stored?.level ?? null;
}

function isBody(value: unknown): value is LevelFile {
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
    typeof file.grid.rows === "number"
  );
}

/** SAVE A PLAYER ISLAND. A SECOND SAVE OF THE SAME ID REPLACES THE BOARD. */
export async function savePlayerLevel(
  level: Level,
  authorId: string | null,
  token: string | null,
  solver: number | null,
  kind: "player" | "home" | "how" = "player",
): Promise<{ ok: boolean; error?: string }> {
  const remote = env();
  if (!remote) {
    return { ok: false, error: "Supabase is not configured." };
  }
  const response = await fetch(`${remote.url}/rest/v1/levels?on_conflict=id`, {
    method: "POST",
    headers: headers(
      remote.key,
      "resolution=merge-duplicates,return=representation",
      token,
    ),
    body: JSON.stringify({
      id: level.id,
      name: level.name,
      kind,
      author_id: authorId,
      solver,
      body: serializeLevel(level),
    }),
  });
  const detail = await response.text();
  console.log("[journeyman:levels] player save", {
    levelId: level.id,
    kind,
    status: response.status,
    detail: detail.slice(0, 300),
  });
  if (!response.ok) {
    return { ok: false, error: detail.slice(0, 180) || `Save failed (${response.status})` };
  }
  if (!detail.trim() || detail.trim() === "[]") {
    return { ok: false, error: "Save did not write a row." };
  }
  return { ok: true };
}

export type ScoreRow = {
  cost: number;
  username: string;
};

export type DailyCard = {
  id: string;
  day: string;
  name: string;
  thumb: string | null;
  solver: number | null;
};

function dailyCardFrom(row: object): DailyCard | null {
  const id = "id" in row && typeof row.id === "string" ? row.id : "";
  const day = "day" in row && typeof row.day === "string" ? row.day : "";
  const name = "name" in row && typeof row.name === "string" ? row.name : "";
  const thumb = "thumb" in row && typeof row.thumb === "string" ? row.thumb : null;
  const solver = "solver" in row && typeof row.solver === "number" ? row.solver : null;
  return id && day ? { id, day, name, thumb, solver } : null;
}

/** STORED DAILIES, INCLUDING THE SOLVER COST AND STILL. */
export async function listDailyCards(): Promise<DailyCard[]> {
  const remote = env();
  if (!remote) {
    return [];
  }
  const response = await fetch(
    `${remote.url}/rest/v1/levels?kind=eq.daily&select=id,day,name,thumb,solver`,
    { headers: headers(remote.key), cache: "no-store" },
  );
  if (!response.ok) {
    console.log("[journeyman:daily] list failed", { status: response.status });
    return [];
  }
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") {
      return [];
    }
    const card = dailyCardFrom(row);
    return card ? [card] : [];
  });
}

/** ONE STORED DAY, OR NULL WHEN THAT DATE HAS NOT BEEN SAVED. */
export async function loadDailyCard(day: string): Promise<DailyCard | null> {
  const remote = env();
  if (!remote) {
    return null;
  }
  const response = await fetch(
    `${remote.url}/rest/v1/levels?day=eq.${encodeURIComponent(day)}&kind=eq.daily&select=id,day,name,thumb,solver`,
    { headers: headers(remote.key), cache: "no-store" },
  );
  if (!response.ok) {
    console.log("[journeyman:daily] load failed", { day, status: response.status });
    return null;
  }
  const rows: unknown = await response.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row || typeof row !== "object") {
    return null;
  }
  return dailyCardFrom(row);
}

/** EVERY SUBMITTED COST, GROUPED BY LEVEL, FOR THE ONE-PIXEL STRIP. */
export async function listSubmissionCosts(): Promise<Record<string, number[]>> {
  const remote = env();
  if (!remote) {
    return {};
  }
  const response = await fetch(
    `${remote.url}/rest/v1/submissions?select=level_id,cost`,
    { headers: headers(remote.key), cache: "no-store" },
  );
  if (!response.ok) {
    console.log("[journeyman:levels] costs failed", { status: response.status });
    return {};
  }
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) {
    return {};
  }
  const costs: Record<string, number[]> = {};
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const id = "level_id" in row && typeof row.level_id === "string" ? row.level_id : "";
    const cost = "cost" in row && typeof row.cost === "number" ? row.cost : null;
    if (!id || cost == null) {
      continue;
    }
    const list = costs[id] ?? [];
    list.push(cost);
    costs[id] = list;
  }
  return costs;
}

/** FIRST SAVED COST PER LEVEL FOR ONE PLAYER. */
export async function listPlayerScores(
  playerId: string,
): Promise<Record<string, number>> {
  const remote = env();
  if (!remote || !playerId) {
    return {};
  }
  const response = await fetch(
    `${remote.url}/rest/v1/submissions?player_id=eq.${encodeURIComponent(playerId)}&select=level_id,cost`,
    { headers: headers(remote.key), cache: "no-store" },
  );
  if (!response.ok) {
    console.log("[journeyman:levels] player scores failed", {
      status: response.status,
    });
    return {};
  }
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) {
    return {};
  }
  const scores: Record<string, number> = {};
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const levelId =
      "level_id" in row && typeof row.level_id === "string" ? row.level_id : "";
    const cost = "cost" in row && typeof row.cost === "number" ? row.cost : null;
    if (!levelId || cost == null) {
      continue;
    }
    const previous = scores[levelId];
    scores[levelId] = previous == null ? cost : Math.min(previous, cost);
  }
  return scores;
}

export async function listScoreRows(levelId: string): Promise<ScoreRow[]> {
  const remote = env();
  if (!remote) {
    return [];
  }
  const response = await fetch(
    `${remote.url}/rest/v1/submissions?level_id=eq.${encodeURIComponent(levelId)}&select=cost,username&order=cost.asc`,
    { headers: headers(remote.key), cache: "no-store" },
  );
  if (!response.ok) {
    return [];
  }
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") {
      return [];
    }
    const cost = "cost" in row && typeof row.cost === "number" ? row.cost : null;
    const username =
      "username" in row && typeof row.username === "string" ? row.username : "";
    return cost == null ? [] : [{ cost, username }];
  });
}

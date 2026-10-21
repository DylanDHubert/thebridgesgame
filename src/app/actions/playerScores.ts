"use server";

import { listPlayerScores } from "@/lib/supabase/scores";

/** THE SIGNED-IN PLAYER'S SAVED COSTS. LOGGED ON THE SERVER. */
export async function loadPlayerScores(
  playerId: string,
): Promise<Record<string, number>> {
  const scores = await listPlayerScores(playerId);
  console.log("[journeyman:levels] player scores", {
    playerId,
    count: Object.keys(scores).length,
  });
  return scores;
}

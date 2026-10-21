"use server";

import { uploadLevelThumb } from "@/lib/supabase/scores";

/** STORE A LEVEL STILL. THE BYTES COME FROM THE BOARD THAT IS ALREADY DRAWN. */
export async function storeLevelThumb(
  levelId: string,
  pngBase64: string,
): Promise<string | null> {
  if (!/^[a-z0-9-]+$/.test(levelId) || !pngBase64) {
    console.log("[journeyman:levels] thumb rejected", { levelId });
    return null;
  }
  const png = Buffer.from(pngBase64, "base64");
  console.log("[journeyman:levels] thumb store", { levelId, bytes: png.byteLength });
  return uploadLevelThumb(levelId, png);
}

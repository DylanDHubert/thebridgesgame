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
  // A FLAT OCEAN GRAB IS A FEW KILOBYTES. A REAL ISLAND IS MUCH LARGER.
  if (png.byteLength < 8000) {
    console.log("[journeyman:levels] thumb rejected, too small", {
      levelId,
      bytes: png.byteLength,
    });
    return null;
  }
  console.log("[journeyman:levels] thumb store", { levelId, bytes: png.byteLength });
  return uploadLevelThumb(levelId, png);
}

/** THE BOARD NEVER PRODUCED A STILL WORTH KEEPING. */
export async function logThumbMiss(levelId: string): Promise<void> {
  console.log("[journeyman:levels] thumb missed", { levelId });
}

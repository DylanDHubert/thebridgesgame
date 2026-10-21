"use client";

import { useEffect } from "react";

import { armAudio } from "@/lib/sound/bed";

/** KEEPS THE SONG READY FOR EVERY PAGE. THE VISIT SCREEN, OR THE FIRST TAP AFTER IT, STARTS IT. */
export function SoundBed() {
  useEffect(() => {
    const arm = () => armAudio();
    document.addEventListener("pointerdown", arm, true);
    document.addEventListener("keydown", arm, true);
    return () => {
      document.removeEventListener("pointerdown", arm, true);
      document.removeEventListener("keydown", arm, true);
    };
  }, []);
  return null;
}

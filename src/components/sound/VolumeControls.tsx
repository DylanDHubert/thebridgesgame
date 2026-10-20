"use client";

import { useSyncExternalStore } from "react";

import {
  getAudioLevels,
  setMusicVolume,
  setSfxVolume,
  subscribeAudio,
} from "@/lib/sound/bed";

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em]">
      {label}
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        aria-label={`${label} volume`}
        className="hairline-slider w-20"
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
    </label>
  );
}

/** HOME BAR — MUSIC AND EFFECTS, REMEMBERED ON THIS BROWSER. */
export function VolumeControls() {
  const levels = useSyncExternalStore(subscribeAudio, getAudioLevels, getAudioLevels);
  return (
    <div className="flex shrink-0 items-center gap-4">
      <VolumeSlider label="Music" value={levels.music} onChange={setMusicVolume} />
      <VolumeSlider label="Sfx" value={levels.sfx} onChange={setSfxVolume} />
    </div>
  );
}

"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { HairlineButton } from "@/components/ui/hairline";
import {
  getPlaySettings,
  setCheckFade,
  setCliffOutline,
  subscribePlaySettings,
} from "@/lib/settings";
import {
  getAudioLevels,
  setMusicVolume,
  setSfxVolume,
  subscribeAudio,
} from "@/lib/sound/bed";

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 text-[10px] uppercase tracking-[0.14em]">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        aria-label={`${label} volume`}
        className="hairline-slider w-full min-w-0"
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
    </label>
  );
}

/** MUSIC, EFFECTS, THE CLIFF DASH, AND HOW CHECK BEHAVES. */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const audio = useSyncExternalStore(subscribeAudio, getAudioLevels, getAudioLevels);
  const play = useSyncExternalStore(subscribePlaySettings, getPlaySettings, getPlaySettings);
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-white/80 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="flex w-full max-w-[22rem] flex-col gap-3 border border-black bg-white p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-[11px] uppercase tracking-[0.16em]">Settings</h2>
        <Slider label="Music" value={audio.music} onChange={setMusicVolume} />
        <Slider label="Sfx" value={audio.sfx} onChange={setSfxVolume} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.14em]">Cliff outline</span>
          <HairlineButton
            pressed={play.cliffOutline}
            onClick={() => setCliffOutline(!play.cliffOutline)}
          >
            {play.cliffOutline ? "On" : "Off"}
          </HairlineButton>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.14em]">Check fade</span>
          <HairlineButton
            pressed={play.checkFade === "slow"}
            onClick={() => setCheckFade(play.checkFade === "slow" ? "fast" : "slow")}
          >
            {play.checkFade === "slow" ? "Slow" : "Fast"}
          </HairlineButton>
        </div>
        <HairlineButton onClick={onClose}>Close</HairlineButton>
      </div>
    </div>,
    document.body,
  );
}

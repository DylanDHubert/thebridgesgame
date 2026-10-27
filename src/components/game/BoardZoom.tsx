"use client";

import { useState } from "react";

/** WIDEST VIEW IS THE TUNED FRAME. EACH STOP MOVES CLOSER TO THE CENTER. */
const STOPS = [1, 1.25, 1.55, 1.9, 2.35] as const;

const STEP = [
  "silkscreen-bold inline-flex h-8 w-8 items-center justify-center bg-white text-[20px] leading-none text-black",
  "hover:bg-[#fbbf24]",
  "disabled:pointer-events-none disabled:opacity-40",
].join(" ");

export function useBoardZoom() {
  const [stop, setStop] = useState(0);
  return {
    zoom: STOPS[stop] ?? 1,
    zoomOut: () => setStop((index) => Math.max(0, index - 1)),
    zoomIn: () => setStop((index) => Math.min(STOPS.length - 1, index + 1)),
    atMin: stop <= 0,
    atMax: stop >= STOPS.length - 1,
  };
}

/** PLUS MOVES IN. MINUS STOPS AT THE TUNED FRAME. */
export function BoardZoom({
  onZoomIn,
  onZoomOut,
  atMin,
  atMax,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  atMin: boolean;
  atMax: boolean;
}) {
  return (
    <div className="inline-flex shrink-0 border border-black">
      <button
        type="button"
        aria-label="Zoom out"
        disabled={atMin}
        onClick={onZoomOut}
        className={STEP}
      >
        -
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        disabled={atMax}
        onClick={onZoomIn}
        className={[STEP, "border-l border-black"].join(" ")}
      >
        +
      </button>
    </div>
  );
}

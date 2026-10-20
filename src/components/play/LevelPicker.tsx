import Link from "next/link";

import { MapPreview } from "@/components/game/MapPreview";
import { GAME_STAGE_ASPECT } from "@/components/game/GameStage";
import { HairlineLink } from "@/components/ui/hairline";
import type { Level } from "@/lib/game/level/types";

type LevelPickerProps = {
  levels: Level[];
};

/** LEVEL SELECT — HAIRLINE CARDS */
export function LevelPicker({ levels }: LevelPickerProps) {
  if (levels.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em]">No levels yet</p>
        <HairlineLink href="/create">Create one</HairlineLink>
      </div>
    );
  }

  return (
    <ul className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {levels.map((level) => (
        <li key={level.id} className="min-w-0">
          <Link
            href={`/play?level=${encodeURIComponent(level.id)}`}
            className="block border border-black transition hover:bg-black hover:text-white"
          >
            <div
              className="relative overflow-hidden border-b border-black bg-[rgb(12_48_92)]"
              style={{ aspectRatio: GAME_STAGE_ASPECT }}
            >
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <MapPreview level={level} borderless cells={false} boarClick={false} />
              </div>
            </div>
            <div className="px-2 py-2 text-center">
              <h2 className="truncate text-[9px] uppercase tracking-[0.14em]">
                {level.name}
              </h2>
              <p className="mt-1 text-[8px] uppercase tracking-[0.16em] opacity-60">
                {level.rows}×{level.cols}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

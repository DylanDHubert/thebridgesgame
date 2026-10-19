import Link from "next/link";

import { HairlineLink } from "@/components/ui/hairline";
import { LevelMiniMap } from "@/components/play/LevelMiniMap";
import type { LevelListItem } from "@/lib/game/level/listLevels";

type LevelPickerProps = {
  levels: LevelListItem[];
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
            <div className="aspect-[5/3] overflow-hidden border-b border-black bg-[rgb(12_48_92)]">
              <LevelMiniMap
                rows={level.rows}
                cols={level.cols}
                terrain={level.terrain}
                mission={level.mission}
              />
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

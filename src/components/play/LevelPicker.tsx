import Link from "next/link";

import { LevelMiniMap } from "@/components/play/LevelMiniMap";
import {
  WoodPlaque,
  WOOD_SUB_SHADOW,
  WoodLink,
} from "@/components/ui/woodPlaque";
import type { LevelListItem } from "@/lib/game/level/listLevels";

type LevelPickerProps = {
  levels: LevelListItem[];
};

/** LEVEL SELECT GRID — WOOD-FRAMED MINIMAP CARDS */
export function LevelPicker({ levels }: LevelPickerProps) {
  if (levels.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
        <WoodPlaque className="max-w-sm px-6 py-5 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.14em] text-[rgb(251_191_36)] sm:text-xs"
            style={{ textShadow: WOOD_SUB_SHADOW }}
          >
            No levels yet
          </p>
        </WoodPlaque>
        <WoodLink href="/create" size="md">
          Create one →
        </WoodLink>
      </div>
    );
  }

  return (
    <ul className="grid w-full grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
      {levels.map((level) => (
        <li key={level.id} className="min-w-0 p-0.5">
          <Link
            href={`/play?level=${encodeURIComponent(level.id)}`}
            className="group block transition hover:brightness-110 active:translate-y-px"
          >
            <WoodPlaque compact className="p-[3px]">
              <div className="aspect-[5/3] overflow-hidden outline outline-1 outline-[rgb(255_255_255)]">
                <LevelMiniMap
                  rows={level.rows}
                  cols={level.cols}
                  terrain={level.terrain}
                  mission={level.mission}
                />
              </div>
              <div className="px-1 py-1.5 text-center sm:py-2">
                <h2
                  className="truncate text-[8px] uppercase tracking-[0.12em] text-[rgb(251_191_36)] sm:text-[9px]"
                  style={{ textShadow: WOOD_SUB_SHADOW }}
                >
                  {level.name}
                </h2>
                <p className="mt-0.5 text-[7px] uppercase tracking-[0.16em] text-[rgb(74_44_20)] sm:text-[8px]">
                  {level.rows}×{level.cols}
                </p>
              </div>
            </WoodPlaque>
          </Link>
        </li>
      ))}
    </ul>
  );
}

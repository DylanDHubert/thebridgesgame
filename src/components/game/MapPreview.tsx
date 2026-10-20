"use client";

import { GameBoard } from "@/components/game/GameBoard";
import { GameStage } from "@/components/game/GameStage";
import type { Level } from "@/lib/game/level/types";

const EMPTY_KEYS = new Set<string>();

type MapPreviewProps = {
  level: Level;
  /** PARENT SUPPLIES THE FRAME */
  borderless?: boolean;
  /** SKIP PER-CELL BUTTONS */
  cells?: boolean;
  /** SKIP THE BOAR BUTTON. THE SPRITE STILL DRAWS. */
  boarClick?: boolean;
};

/** ISO BOARD IN THE PLAY FRAME. SAME CROP AS THE GAME. */
export function MapPreview({
  level,
  borderless = false,
  cells = true,
  boarClick = true,
}: MapPreviewProps) {
  return (
    <GameStage>
      <GameBoard
        level={level}
        bridges={EMPTY_KEYS}
        pathKeys={EMPTY_KEYS}
        interactive={false}
        sizing="contain"
        bleed
        showMission
        borderless={borderless}
        cells={cells}
        boarClick={boarClick}
      />
    </GameStage>
  );
}

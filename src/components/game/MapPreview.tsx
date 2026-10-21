"use client";

import { useRef, type RefObject } from "react";

import { logThumbMiss, storeLevelThumb } from "@/app/actions/levelThumb";
import { GameBoard, type StillGrab } from "@/components/game/GameBoard";
import { GameStage } from "@/components/game/GameStage";
import type { Level } from "@/lib/game/level/types";
import { stillPngBase64 } from "@/lib/rendering/stillPng";

const EMPTY_KEYS = new Set<string>();

type MapPreviewProps = {
  level: Level;
  /** PARENT SUPPLIES THE FRAME */
  borderless?: boolean;
  /** SKIP PER-CELL BUTTONS */
  cells?: boolean;
  /** SKIP THE BOAR BUTTON. THE SPRITE STILL DRAWS. */
  boarClick?: boolean;
  /** UPLOAD A STILL ONCE THE BOARD HAS PAINTED. */
  publish?: boolean;
  onPublished?: (revision: string) => void;
  /** PARENT READS THE CURRENT STILL. SAVE USES THIS. */
  stillRef?: RefObject<StillGrab | null>;
};

/** ISO BOARD IN THE PLAY FRAME. SAME CROP AS THE GAME. */
export function MapPreview({
  level,
  borderless = false,
  cells = true,
  boarClick = true,
  publish = false,
  onPublished,
  stillRef: stillRefProp,
}: MapPreviewProps) {
  const ownStill = useRef<StillGrab | null>(null);
  const stillRef = stillRefProp ?? ownStill;
  const ticket = useRef(0);
  const published = useRef<string | null>(null);

  const handleStill = () => {
    if (!publish) {
      return;
    }
    const mine = ++ticket.current;
    void (async () => {
      // THE FIRST PAINT OFTEN LANDS BEFORE THE CARD HAS A SIZE. WAIT FOR A REAL GRAB.
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (mine !== ticket.current || published.current === level.id) {
          return;
        }
        const blob = await stillRef.current?.();
        if (blob && blob.size >= 8000) {
          const png = await stillPngBase64(blob);
          const revision = await storeLevelThumb(level.id, png);
          if (!revision || mine !== ticket.current) {
            return;
          }
          published.current = level.id;
          onPublished?.(revision);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 160));
      }
      if (mine === ticket.current && published.current !== level.id) {
        await logThumbMiss(level.id);
      }
    })();
  };

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
        stillRef={stillRef}
        onStill={publish ? handleStill : undefined}
      />
    </GameStage>
  );
}

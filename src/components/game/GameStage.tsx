import type { ReactNode } from "react";

/** PLAY FULLSCREEN FRAME. THE BOARD KEEPS THIS SHAPE ON EVERY PAGE AND SCREEN. */
export const GAME_STAGE_ASPECT = 2.05;

type GameStageProps = {
  children: ReactNode;
};

/** LARGEST BOX OF THE PLAY FRAME THAT FITS THE SLOT. THE MAP CROPS THE SAME WAY INSIDE IT. */
export function GameStage({ children }: GameStageProps) {
  return (
    <div className="relative h-full min-h-0 w-full min-w-0 [container-type:size]">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[calc(-50%)] [&>*]:h-full [&>*]:w-full"
        style={{
          width: `min(100cqw, calc(100cqh * ${GAME_STAGE_ASPECT}))`,
          height: `min(100cqh, calc(100cqw / ${GAME_STAGE_ASPECT}))`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

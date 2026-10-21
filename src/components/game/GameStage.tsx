import type { ReactNode, Ref } from "react";

/** PLAY FULLSCREEN FRAME. THE BOARD KEEPS THIS SHAPE ON EVERY PAGE AND SCREEN. */
export const GAME_STAGE_ASPECT = 2.05;

type GameStageProps = {
  children: ReactNode;
  /** THE SIZED FRAME, SO A BAR CAN MATCH ITS WIDTH. */
  frameRef?: Ref<HTMLDivElement>;
  /** END SITS THE FRAME ON THE BOTTOM EDGE, JUST ABOVE A BAR. */
  align?: "center" | "end";
};

/** LARGEST BOX OF THE PLAY FRAME THAT FITS THE SLOT. THE MAP CROPS THE SAME WAY INSIDE IT. */
export function GameStage({ children, frameRef, align = "center" }: GameStageProps) {
  return (
    <div className="relative h-full min-h-0 w-full min-w-0 [container-type:size]">
      <div
        ref={frameRef}
        className={[
          "absolute left-1/2 -translate-x-1/2 [&>*]:h-full [&>*]:w-full",
          align === "end" ? "bottom-0" : "top-1/2 -translate-y-1/2",
        ].join(" ")}
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

"use client";

import { useEffect, useState, type RefObject } from "react";

import {
  boarPose,
  BOAR_FOOT,
  BOAR_FRAME_H,
  BOAR_FRAME_W,
  type BoarPlan,
} from "@/lib/rendering/boar";
import { isoCellCenter, SPRITE_NATIVE, type IsoMetrics } from "@/lib/rendering/isoTiles";

export const BOAR_THOUGHTS = [
  "mm, i am hungry.",
  "i want to smell flowers.",
  "i ate all the grass.",
  "no more flowers here.",
  "i wish i could swim.",
  "bridges are a human idea.",
  "sniff sniff. flower?",
  "mud is a good bed.",
  "my hooves refuse to swim.",
  "i could eat this whole island.",
  "that water looks unfriendly.",
  "one more flower, then a nap.",
  "i am a professional smeller.",
  "the grass knows what i did.",
  "i left lunch on another island.",
  "flowers do not come to you.",
] as const;

type BoarThought = {
  id: number;
  text: string;
};

type BoarClickProps = {
  boarRef: RefObject<BoarPlan | null>;
  metrics: IsoMetrics;
  thought: BoarThought | null;
  onClick: () => void;
};

type BoarBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  z: number;
};

/** CLICK THE SPRITE. THE BUBBLE SITS ABOVE HIS HEAD. */
export function BoarClick({ boarRef, metrics, thought, onClick }: BoarClickProps) {
  const [box, setBox] = useState<BoarBox | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = "";

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const plan = boarRef.current;
      if (!plan) {
        return;
      }
      const pose = boarPose(plan, performance.now(), reduced);
      const key = `${pose.row},${pose.col},${pose.facing},${metrics.tileWidth}`;
      if (key === last) {
        return;
      }
      last = key;
      const scale = metrics.tileWidth / SPRITE_NATIVE;
      const foot = BOAR_FOOT[pose.facing];
      const center = isoCellCenter(pose.row, pose.col, metrics);
      setBox({
        left: center.x - foot.x * scale,
        top: center.y - foot.y * scale,
        width: BOAR_FRAME_W * scale,
        height: BOAR_FRAME_H * scale,
        z: pose.row + pose.col,
      });
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [boarRef, metrics]);

  if (!box) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Boar"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className="absolute cursor-pointer border-0 bg-transparent p-0"
        style={{
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          zIndex: box.z,
        }}
      />
      {thought ? (
        <div
          key={thought.id}
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: box.left + box.width / 2,
            top: box.top - 4,
            zIndex: 5000,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="max-w-[10rem] border border-black bg-white px-2 py-1.5 text-center text-[8px] leading-[1.45] text-black">
            {thought.text}
          </p>
          <span className="absolute left-1/2 top-full mt-0.5 h-1.5 w-1.5 -translate-x-1/2 border border-black bg-white" />
          <span className="absolute left-1/2 top-full mt-2.5 h-1 w-1 -translate-x-1/2 border border-black bg-white" />
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { GameStage } from "@/components/game/GameStage";

type BoardColumnProps = {
  board: ReactNode;
  bar: ReactNode;
};

/** LOWER BAR IS THE BOARD'S WIDTH. THE GAP MATCHES THE PADDING AROUND THE FRAME. */
export function BoardColumn({ board, bar }: BoardColumnProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = frameRef.current;
    if (!node) {
      return;
    }
    const apply = () => {
      const next = Math.round(node.getBoundingClientRect().width);
      setWidth((prev) => (prev === next ? prev : next));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="flex min-h-0 flex-1 flex-col items-center gap-3 p-3 sm:gap-4 sm:p-4">
      <div className="relative min-h-0 w-full min-w-0 flex-1">
        <GameStage frameRef={frameRef} align="end">
          {board}
        </GameStage>
      </div>
      <div className="max-w-full shrink-0" style={{ width: width ?? "100%" }}>
        {bar}
      </div>
    </section>
  );
}

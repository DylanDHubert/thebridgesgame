"use client";

import { useEffect, useRef } from "react";

type BridgeCostPopProps = {
  left: number;
  top: number;
  cost: number;
  onDone: () => void;
};

/** +1 / +2 WHEN A BRIDGE LANDS. -1 / -2 WHEN IT IS PICKED UP. */
export function BridgeCostPop({ left, top, cost, onDone }: BridgeCostPopProps) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => onDoneRef.current(), reduced ? 450 : 720);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <span
      aria-hidden
      className="bridge-cost-pop pointer-events-none absolute"
      style={{ left, top }}
    >
      {cost > 0 ? `+${cost}` : String(cost)}
    </span>
  );
}

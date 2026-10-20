import type { CellCoord } from "@/lib/game/types";

/** LOOSE FRAMES ARE 46×32. SHEETS AND STRIPS ARE THE SAME ART WITH GAPS. */
export const BOAR_FRAME_W = 46;
export const BOAR_FRAME_H = 32;
export const BOAR_IDLE_FRAMES = 7;
export const BOAR_RUN_FRAMES = 4;

const STEP_MS = 320;
const FLOWER_PAUSE_MS = 480;
const IDLE_MS = 140;
const RUN_MS = 80;

export type BoarFacing = "NE" | "NW" | "SE" | "SW";
export type BoarAnim = "idle" | "run";

/** FEET IN THE IDLE FRAMES, SO THE BODY STAYS PLANTED ON THE DIAMOND CENTER. */
export const BOAR_FOOT: Record<BoarFacing, { x: number; y: number }> = {
  NE: { x: 19, y: 30 },
  NW: { x: 27, y: 30 },
  SE: { x: 23, y: 29 },
  SW: { x: 22, y: 30 },
};

export type BoarPose = {
  row: number;
  col: number;
  facing: BoarFacing;
  anim: BoarAnim;
  frame: number;
};

export type BoarPlan = {
  start: CellCoord;
  path: CellCoord[];
  flowers: CellCoord[];
  beganAt: number;
};

export function boarFrameSrc(facing: BoarFacing, anim: BoarAnim, frame: number): string {
  return `/assets/boar/boar_${facing}_${anim}_${frame}.png`;
}

export function allBoarFrameSrcs(): string[] {
  const facings: BoarFacing[] = ["NE", "NW", "SE", "SW"];
  const srcs: string[] = [];
  for (const facing of facings) {
    for (let frame = 0; frame < BOAR_IDLE_FRAMES; frame += 1) {
      srcs.push(boarFrameSrc(facing, "idle", frame));
    }
    for (let frame = 0; frame < BOAR_RUN_FRAMES; frame += 1) {
      srcs.push(boarFrameSrc(facing, "run", frame));
    }
  }
  return srcs;
}

function sameCell(a: CellCoord, b: CellCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

/** GRID STEP TO THE ISO FACING. ROW-1 IS UP-RIGHT. */
export function facingBetween(from: CellCoord, to: CellCoord): BoarFacing {
  if (to.row < from.row) {
    return "NE";
  }
  if (to.row > from.row) {
    return "SW";
  }
  if (to.col > from.col) {
    return "SE";
  }
  return "NW";
}

function towardNearest(start: CellCoord, flowers: CellCoord[]): BoarFacing {
  let best: CellCoord | null = null;
  let bestDistance = Infinity;
  for (const flower of flowers) {
    const distance =
      Math.abs(flower.row - start.row) + Math.abs(flower.col - start.col);
    if (distance > 0 && distance < bestDistance) {
      bestDistance = distance;
      best = flower;
    }
  }
  if (!best) {
    return "SE";
  }
  const dr = best.row - start.row;
  const dc = best.col - start.col;
  if (Math.abs(dr) >= Math.abs(dc)) {
    return dr < 0 ? "NE" : "SW";
  }
  return dc > 0 ? "SE" : "NW";
}

type Mark =
  | { kind: "idle"; at: CellCoord; facing: BoarFacing; t0: number; t1: number }
  | {
      kind: "run";
      to: CellCoord;
      facing: BoarFacing;
      t0: number;
      t1: number;
    };

function isFlower(cell: CellCoord, flowers: CellCoord[]): boolean {
  return flowers.some((flower) => sameCell(flower, cell));
}

/** IDLE AT THE START, THEN RUN THE TOUR, PAUSING ON EACH FLOWER ALONG THE WAY. */
function buildMarks(plan: BoarPlan): Mark[] {
  const resting = towardNearest(plan.start, plan.flowers);
  const path = plan.path.length >= 2 ? plan.path : [];
  if (path.length < 2) {
    return [{ kind: "idle", at: plan.start, facing: resting, t0: 0, t1: Infinity }];
  }

  const marks: Mark[] = [];
  let time = 0;
  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1]!;
    const to = path[index]!;
    const facing = facingBetween(from, to);
    marks.push({ kind: "run", to, facing, t0: time, t1: time + STEP_MS });
    time += STEP_MS;
    const more = index < path.length - 1;
    if (more && isFlower(to, plan.flowers)) {
      marks.push({
        kind: "idle",
        at: to,
        facing,
        t0: time,
        t1: time + FLOWER_PAUSE_MS,
      });
      time += FLOWER_PAUSE_MS;
    }
  }

  const last = path[path.length - 1]!;
  const lastFacing = marks[marks.length - 1]?.facing ?? resting;
  marks.push({ kind: "idle", at: last, facing: lastFacing, t0: time, t1: Infinity });
  return marks;
}

export function boarPose(plan: BoarPlan, now: number, reduced: boolean): BoarPose {
  const resting = towardNearest(plan.start, plan.flowers);
  if (reduced) {
    return {
      row: plan.start.row,
      col: plan.start.col,
      facing: resting,
      anim: "idle",
      frame: 0,
    };
  }

  const elapsed = Math.max(0, now - plan.beganAt);
  const marks = buildMarks(plan);
  const mark =
    marks.find((entry) => elapsed >= entry.t0 && elapsed < entry.t1) ??
    marks[marks.length - 1]!;

  if (mark.kind === "run") {
    return {
      row: mark.to.row,
      col: mark.to.col,
      facing: mark.facing,
      anim: "run",
      frame: Math.floor(elapsed / RUN_MS) % BOAR_RUN_FRAMES,
    };
  }

  return {
    row: mark.at.row,
    col: mark.at.col,
    facing: mark.facing,
    anim: "idle",
    frame: Math.floor(elapsed / IDLE_MS) % BOAR_IDLE_FRAMES,
  };
}

import type { CellCoord } from "@/lib/game/types";
import { isoCellCenter, type IsoMetrics } from "@/lib/rendering/isoTiles";

/** LOOSE FRAMES ARE 46×32. SHEETS AND STRIPS ARE THE SAME ART WITH GAPS. */
export const BOAR_FRAME_W = 46;
export const BOAR_FRAME_H = 32;
export const BOAR_IDLE_FRAMES = 7;
export const BOAR_RUN_FRAMES = 4;

/** ONE CELL. A FULL RUN CYCLE IS FOUR FRAMES, SO HE COVERS TWO CELLS PER CYCLE. */
const STEP_MS = 160;

/** HOW LONG A STRAIGHT RUN OF THIS PATH TAKES. NO STOPS FOR FLOWERS. */
export function boarTravelMs(path: { length: number }): number {
  if (path.length < 2) {
    return 0;
  }
  return (path.length - 1) * STEP_MS;
}
/** FACING THE FLOWER BEFORE IT IS EATEN */
const EAT_GAZE_MS = 700;
/** FLOWER IS GONE. HE IS STILL LOOKING AT THE EMPTY CELL. */
const EAT_GONE_MS = 420;
/** THE TURN BEFORE HE WALKS BACK */
const TURN_MS = 280;
const IDLE_MS = 140;
const RUN_MS = 80;

export type BoarFacing = "NE" | "NW" | "SE" | "SW";
export type BoarAnim = "idle" | "run";

/** FEET IN THE IDLE FRAMES. THE DRAW THEN SINKS HIM A QUARTER CELL. */
export const BOAR_FOOT: Record<BoarFacing, { x: number; y: number }> = {
  NE: { x: 19, y: 30 },
  NW: { x: 27, y: 30 },
  SE: { x: 23, y: 29 },
  SW: { x: 22, y: 30 },
};

/** SCREEN DROP UNDER THE DIAMOND CENTER. A QUARTER OF THE CELL HEIGHT. */
export function boarSink(cellHeight: number): number {
  return cellHeight * 0.25;
}

export type BoarPose = {
  /** CELL HE IS SLIDING TOWARD */
  row: number;
  col: number;
  /** CELL HE IS SLIDING FROM. SAME AS ROW/COL WHEN HE IS STANDING. */
  fromRow: number;
  fromCol: number;
  /** 0 AT THE CELL HE LEFT, 1 ON THE CELL HE IS ENTERING */
  slide: number;
  facing: BoarFacing;
  anim: BoarAnim;
  frame: number;
  /** FLOWER CELLS ALREADY EATEN BY THIS MOMENT */
  eaten: ReadonlySet<string>;
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

function oppositeFacing(facing: BoarFacing): BoarFacing {
  switch (facing) {
    case "NE":
      return "SW";
    case "SW":
      return "NE";
    case "SE":
      return "NW";
    case "NW":
      return "SE";
  }
}

function adjacent(a: CellCoord, b: CellCoord): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function cellKeyOf(cell: CellCoord): string {
  return `${cell.row},${cell.col}`;
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
      from: CellCoord;
      to: CellCoord;
      facing: BoarFacing;
      t0: number;
      t1: number;
    };

type Eat = { key: string; at: number };

type BoarScript = {
  marks: Mark[];
  eats: Eat[];
};

function isFlower(cell: CellCoord, flowers: CellCoord[]): boolean {
  return flowers.some((flower) => sameCell(flower, cell));
}

function laterFlower(
  path: CellCoord[],
  fromIndex: number,
  flowers: CellCoord[],
): boolean {
  for (let index = fromIndex; index < path.length; index += 1) {
    if (isFlower(path[index]!, flowers)) {
      return true;
    }
  }
  return false;
}

/**
 * WALK THE TOUR, BUT STOP ONE CELL SHORT OF EACH FLOWER.
 * FACE IT, PAUSE, EAT IT, THEN AFTER THE LAST ONE TURN AND WALK HOME.
 */
function buildScript(plan: BoarPlan): BoarScript {
  const resting = towardNearest(plan.start, plan.flowers);
  const path = plan.path.length >= 2 ? plan.path : [];
  if (path.length < 2) {
    return {
      marks: [{ kind: "idle", at: plan.start, facing: resting, t0: 0, t1: Infinity }],
      eats: [],
    };
  }

  const marks: Mark[] = [];
  const eats: Eat[] = [];
  const stood: CellCoord[] = [path[0]!];
  let time = 0;
  let boarAt = path[0]!;
  let pathIndex = 0;

  const pushIdle = (at: CellCoord, facing: BoarFacing, ms: number) => {
    marks.push({ kind: "idle", at, facing, t0: time, t1: time + ms });
    time += ms;
  };
  const pushRun = (to: CellCoord, facing: BoarFacing, record: boolean) => {
    marks.push({ kind: "run", from: boarAt, to, facing, t0: time, t1: time + STEP_MS });
    time += STEP_MS;
    boarAt = to;
    if (record) {
      stood.push(to);
    }
  };
  const finishAt = (at: CellCoord, facing: BoarFacing) => {
    marks.push({ kind: "idle", at, facing, t0: time, t1: Infinity });
  };
  const walkHome = (awayFromFlower: BoarFacing) => {
    if (stood.length < 2) {
      finishAt(boarAt, oppositeFacing(awayFromFlower));
      return;
    }
    const back = facingBetween(boarAt, stood[stood.length - 2]!);
    pushIdle(boarAt, back, TURN_MS);
    for (let step = stood.length - 2; step >= 0; step -= 1) {
      const dest = stood[step]!;
      const from = step === stood.length - 2 ? boarAt : stood[step + 1]!;
      pushRun(dest, facingBetween(from, dest), false);
    }
    finishAt(boarAt, marks[marks.length - 1]?.facing ?? resting);
  };

  while (pathIndex < path.length - 1) {
    const dest = path[pathIndex + 1]!;
    const facing = facingBetween(boarAt, dest);
    if (isFlower(dest, plan.flowers)) {
      pushIdle(boarAt, facing, EAT_GAZE_MS);
      eats.push({ key: cellKeyOf(dest), at: time });
      pushIdle(boarAt, facing, EAT_GONE_MS);
      if (!laterFlower(path, pathIndex + 2, plan.flowers)) {
        walkHome(facing);
        return { marks, eats };
      }
      const after = path[pathIndex + 2];
      if (after && adjacent(boarAt, after)) {
        pathIndex += 1;
        continue;
      }
      pushRun(dest, facing, true);
      pathIndex += 1;
      continue;
    }
    pushRun(dest, facing, true);
    pathIndex += 1;
  }

  finishAt(boarAt, marks[marks.length - 1]?.facing ?? resting);
  return { marks, eats };
}

function eatenBy(eats: Eat[], elapsed: number): ReadonlySet<string> {
  const eaten = new Set<string>();
  for (const eat of eats) {
    if (elapsed >= eat.at) {
      eaten.add(eat.key);
    }
  }
  return eaten;
}

const NONE_EATEN: ReadonlySet<string> = new Set();

export function boarPose(plan: BoarPlan, now: number, reduced: boolean): BoarPose {
  const resting = towardNearest(plan.start, plan.flowers);
  if (reduced) {
    return {
      row: plan.start.row,
      col: plan.start.col,
      fromRow: plan.start.row,
      fromCol: plan.start.col,
      slide: 1,
      facing: resting,
      anim: "idle",
      frame: 0,
      eaten: NONE_EATEN,
    };
  }

  const elapsed = Math.max(0, now - plan.beganAt);
  const script = buildScript(plan);
  const mark =
    script.marks.find((entry) => elapsed >= entry.t0 && elapsed < entry.t1) ??
    script.marks[script.marks.length - 1]!;
  const eaten = eatenBy(script.eats, elapsed);

  if (mark.kind === "run") {
    const span = Math.max(1, mark.t1 - mark.t0);
    const slide = Math.min(1, Math.max(0, (elapsed - mark.t0) / span));
    return {
      row: mark.to.row,
      col: mark.to.col,
      fromRow: mark.from.row,
      fromCol: mark.from.col,
      slide,
      facing: mark.facing,
      anim: "run",
      frame: Math.floor(elapsed / RUN_MS) % BOAR_RUN_FRAMES,
      eaten,
    };
  }

  return {
    row: mark.at.row,
    col: mark.at.col,
    fromRow: mark.at.row,
    fromCol: mark.at.col,
    slide: 1,
    facing: mark.facing,
    anim: "idle",
    frame: Math.floor(elapsed / IDLE_MS) % BOAR_IDLE_FRAMES,
    eaten,
  };
}

/** SCREEN POINT AND THE CELL THAT SHOULD COVER HIM. SLIDES BETWEEN CENTERS. */
export function boarPlace(
  pose: BoarPose,
  metrics: IsoMetrics,
): { x: number; y: number; row: number; col: number } {
  const from = isoCellCenter(pose.fromRow, pose.fromCol, metrics);
  const to = isoCellCenter(pose.row, pose.col, metrics);
  const t = pose.slide;
  const toward = t >= 0.5;
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    row: toward ? pose.row : pose.fromRow,
    col: toward ? pose.col : pose.fromCol,
  };
}

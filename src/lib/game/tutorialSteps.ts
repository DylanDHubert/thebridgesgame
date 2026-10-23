import { isoBoardFromContent, isoLatticeCells } from "./isoBoard";
import { grassUnderFlowers } from "./level/gridToLevel";
import type { Level } from "./level/types";
import type { CellCoord, TileKind } from "./types";

/** SAME SMALL SEA FOR EVERY LESSON. */
const CONTENT_ROWS = 10;
const CONTENT_COLS = 16;

export type TutorialMode = "bridges" | "finish";

export type TutorialStep = {
  /** STORED ID. THE EDITOR IS /tutorial/<NUMBER>. */
  id: string;
  number: number;
  name: string;
  /** HIS LINE ON THE BOARD. THE BAR UNDER IT IS DRAWN IN THE LESSON. */
  boar: string;
  mode: TutorialMode;
  level: Level;
};

type Paint = (row: number, col: number, kind: TileKind) => void;

function lessonLevel(
  id: string,
  name: string,
  paint: (set: Paint) => { start: CellCoord; flowers: [CellCoord, CellCoord, CellCoord] },
  water: TileKind = "ocean",
): Level {
  const board = isoBoardFromContent(CONTENT_ROWS, CONTENT_COLS);
  const terrain: TileKind[] = Array.from(
    { length: board.rows * board.cols },
    () => "ocean" as TileKind,
  );
  const set: Paint = (row, col, kind) => {
    terrain[row * board.cols + col] = kind;
  };
  if (water !== "ocean") {
    for (const cell of isoLatticeCells(board.span)) {
      if (cell.role === "play") {
        set(cell.row, cell.col, water);
      }
    }
  }
  const placed = paint(set);
  const mission = {
    x: placed.flowers[0],
    y: placed.flowers[1],
    z: placed.flowers[2],
  };
  return {
    id,
    name,
    seed: id,
    rows: board.rows,
    cols: board.cols,
    terrain: grassUnderFlowers(terrain, board.cols, board.rows, mission),
    objects: [],
    routes: [],
    mission,
    start: placed.start,
    iso: board.span,
  };
}

/** TWO GRASS ISLANDS. ONE WATER CELL BETWEEN THEM. */
function grassPair(set: Paint, water: TileKind = "ocean"): {
  start: CellCoord;
  flowers: [CellCoord, CellCoord, CellCoord];
} {
  const land: CellCoord[] = [];
  for (const row of [11, 12]) {
    for (const col of [6, 7, 8]) {
      land.push({ row, col });
    }
    for (const col of [10, 11, 12]) {
      land.push({ row, col });
    }
  }
  for (const cell of land) {
    set(cell.row, cell.col, "grass");
  }
  if (water !== "ocean") {
    set(11, 9, water);
    set(12, 9, water);
  }
  return {
    start: { row: 11, col: 7 },
    flowers: [
      { row: 11, col: 10 },
      { row: 11, col: 11 },
      { row: 12, col: 11 },
    ],
  };
}

const grass = lessonLevel("tutorial-1", "Grass", (set) => grassPair(set));
const marsh = lessonLevel("tutorial-2", "Marsh", (set) => grassPair(set, "marsh"), "marsh");
const around = lessonLevel("tutorial-3", "Around", (set) => {
  for (const col of [6, 7, 8]) {
    set(12, col, "grass");
    set(13, col, "grass");
  }
  set(12, 10, "cliff");
  set(11, 10, "cliff");
  set(13, 10, "grass");
  set(13, 11, "grass");
  set(13, 12, "grass");
  set(12, 11, "grass");
  return {
    start: { row: 12, col: 7 },
    flowers: [
      { row: 13, col: 11 },
      { row: 13, col: 12 },
      { row: 12, col: 11 },
    ],
  };
});
const across = lessonLevel("tutorial-4", "Across", (set) => {
  for (const row of [11, 12]) {
    for (const col of [6, 7, 8]) {
      set(row, col, "grass");
    }
  }
  set(12, 10, "grass");
  for (const col of [11, 12, 13, 14]) {
    set(12, col, "cliff");
  }
  set(11, 14, "cliff");
  set(11, 16, "cliff");
  set(10, 15, "cliff");
  set(13, 15, "cliff");
  set(13, 16, "cliff");
  set(12, 17, "cliff");
  set(11, 15, "grass");
  set(12, 15, "grass");
  set(12, 16, "grass");
  return {
    start: { row: 12, col: 7 },
    flowers: [
      { row: 11, col: 15 },
      { row: 12, col: 15 },
      { row: 12, col: 16 },
    ],
  };
});

/** FIVE LESSONS. EACH ARROW LOADS THE NEXT BOARD. */
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: grass.id,
    number: 1,
    name: "Grass",
    boar: "I ate all the grass and I cannot swim. Oink!",
    mode: "bridges",
    level: grass,
  },
  {
    id: marsh.id,
    number: 2,
    name: "Marsh",
    boar: "Swamp! Marsh! Bayou!",
    mode: "bridges",
    level: marsh,
  },
  {
    id: around.id,
    number: 3,
    name: "Around",
    boar: "Oink Oink!",
    mode: "bridges",
    level: around,
  },
  {
    id: across.id,
    number: 4,
    name: "Across",
    boar: "Moo?",
    mode: "bridges",
    level: across,
  },
  {
    id: "tutorial-5",
    number: 5,
    name: "Check",
    boar: "Click me...",
    mode: "finish",
    level: { ...grass, id: "tutorial-5", name: "Check", seed: "tutorial-5" },
  },
];

export function tutorialStepByNumber(number: number): TutorialStep | null {
  return TUTORIAL_STEPS.find((step) => step.number === number) ?? null;
}

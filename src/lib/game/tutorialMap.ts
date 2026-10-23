import type { Level } from "./level/types";
import type { CellCoord } from "./types";

export const HOW_LEVEL_ID = "how";

export type TutorialLabel = {
  id: "boar" | "x" | "y" | "z";
  label: string;
  at: CellCoord;
  color: string;
};

const LABEL_COLOR = "#fbbf24";

/** DRAG TARGETS — BOAR START, THEN THE THREE FLOWERS IN ORDER. */
export function tutorialLabels(level: Level): TutorialLabel[] {
  const flowers = [level.mission.x, level.mission.y, level.mission.z];
  return [
    {
      id: "boar",
      label: "BOAR",
      at: level.start ?? level.mission.x,
      color: LABEL_COLOR,
    },
    ...flowers.map((at, index) => ({
      id: (["x", "y", "z"] as const)[index]!,
      label: String(index + 1),
      at,
      color: LABEL_COLOR,
    })),
  ];
}

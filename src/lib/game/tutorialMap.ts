import { DIRECTIONS } from "./constants";
import { cellKey, coordKey } from "./coords";
import type { Level } from "./level/types";
import { floodLandComponent } from "./homeMap";
import { isLandKind, isPlayableCell, terrainKindAt } from "./rules";
import { floodReachable } from "./simulateLevel";
import type { CellCoord, GamePhase, TileKind } from "./types";

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

function waterKind(kind: TileKind | undefined): "ocean" | "marsh" | null {
  if (kind === "ocean" || kind === "marsh") {
    return kind;
  }
  return null;
}

type Gap = {
  key: string;
  kind: "ocean" | "marsh";
  touchesCliff: boolean;
  touchesGrass: boolean;
};

/** ONE-CELL WATER BETWEEN WHERE HE CAN STAND AND THE NEXT FLOWER'S ISLAND. */
function gapsToward(level: Level, from: Set<string>, island: Set<string>): Gap[] {
  const gaps: Gap[] = [];
  const seen = new Set<string>();
  for (const key of from) {
    const [row, col] = key.split(",").map(Number) as [number, number];
    for (const { dr, dc } of DIRECTIONS) {
      const wr = row + dr;
      const wc = col + dc;
      const waterKey = cellKey(wr, wc);
      if (seen.has(waterKey) || !isPlayableCell(level, wr, wc)) {
        continue;
      }
      const kind = waterKind(terrainKindAt(level, wr, wc));
      if (!kind) {
        continue;
      }
      let touchesCliff = false;
      let touchesGrass = false;
      let touchesIsland = false;
      for (const step of DIRECTIONS) {
        const lr = wr + step.dr;
        const lc = wc + step.dc;
        const landKey = cellKey(lr, lc);
        if (!island.has(landKey)) {
          continue;
        }
        touchesIsland = true;
        const land = terrainKindAt(level, lr, lc);
        if (land === "cliff") {
          touchesCliff = true;
        } else if (land === "grass") {
          touchesGrass = true;
        }
      }
      if (!touchesIsland) {
        continue;
      }
      seen.add(waterKey);
      gaps.push({ key: waterKey, kind, touchesCliff, touchesGrass });
    }
  }
  return gaps;
}

function bridgeTouchesCliff(level: Level, bridges: Set<string>): boolean {
  for (const key of bridges) {
    const [row, col] = key.split(",").map(Number) as [number, number];
    for (const { dr, dc } of DIRECTIONS) {
      if (terrainKindAt(level, row + dr, col + dc) === "cliff") {
        return true;
      }
    }
  }
  return false;
}

/** WHAT HE SAYS, FROM THE MAP AS IT IS NOW. */
export function tutorialNarration(
  level: Level,
  bridges: Set<string>,
  met: boolean,
  phase: GamePhase,
): string {
  if (phase === "success") {
    return "mm. lunch. blue water costs one, marsh costs two, and stone does not shake hands with a bridge. bigger islands are in play.";
  }
  if (phase === "disconnected") {
    return "i tried. a flower is still not mine. i am staying on the mud.";
  }
  if (!met) {
    return "hello. i live on the mud. click me. i will show you what these hooves can reach.";
  }

  const origin = level.start ?? level.mission.x;
  const reachable = floodReachable(level, bridges, origin);
  const flowers = [level.mission.x, level.mission.y, level.mission.z];
  const next = flowers.find((flower) => !reachable.has(coordKey(flower)));
  if (!next) {
    return "three flowers. press check. i stop one step away, stare, and then the flower is gone.";
  }

  const kind = terrainKindAt(level, next.row, next.col);
  const island = floodLandComponent(level, next);
  if (!kind || !isLandKind(kind) || island.size === 0) {
    return "that flower is in the water. put it on grass. i do not eat waves.";
  }

  const gaps = gapsToward(level, reachable, island);
  const stoneGaps = gaps.filter((gap) => gap.touchesCliff && !gap.touchesGrass);
  const marshGaps = gaps.filter((gap) => gap.kind === "marsh" && gap.touchesGrass);
  const oceanGaps = gaps.filter((gap) => gap.kind === "ocean" && gap.touchesGrass);
  const onAGap = gaps.some((gap) => bridges.has(gap.key));

  if (bridgeTouchesCliff(level, bridges) && stoneGaps.length > 0) {
    return "that bridge touches the stone. i can walk on stone. i cannot step onto it from a bridge. aim for the grass.";
  }
  if (stoneGaps.length > 0) {
    return "the grey stone is land. bridges will not hold my hoof there. bridge to the grass beside the stone.";
  }
  if (marshGaps.length > 0 && oceanGaps.length === 0) {
    return "the green water is marsh. a bridge there costs two. the blue ones cost one. i am expensive in swamps.";
  }
  if (oceanGaps.length > 0) {
    if (bridges.size > 0 && !onAGap) {
      return "that bridge is not the gap. the blue water between me and the next flower. one bridge.";
    }
    return "yellow is me. i do not swim. click the blue water. one bridge to the next flower.";
  }
  if (marshGaps.length > 0) {
    return "the green water is marsh. a bridge there costs two. the blue ones cost one. i am expensive in swamps.";
  }
  return "the next flower is further than one bridge. keep going. i am still hungry.";
}

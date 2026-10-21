import { CREATE_FIXED_GRID } from "@/lib/game/createConfig";
import {
  DEFAULT_GENERATION_CONFIG,
  type NoiseConfig,
} from "@/lib/game/generationConfig";
import { generateLevel } from "@/lib/game/level/generateLevel";
import type { Level } from "@/lib/game/level/types";
import { perfectBridgeCost } from "@/lib/game/perfectScore";

/** OCTAVE WEIGHTS STAY ON THE SHARED DEFAULT. THE PRESET NAMES SCALES ONLY. */
const OCTAVE_WEIGHTS = {
  octave2Weight: DEFAULT_GENERATION_CONFIG.noise.octave2Weight,
  octave3Weight: DEFAULT_GENERATION_CONFIG.noise.octave3Weight,
};

export type DailyPresetId = "A" | "B" | "C";

type DailyPreset = {
  id: DailyPresetId;
  noise: NoiseConfig;
};

function presetNoise(
  landThreshold: number,
  falloffStrength: number,
  falloffRadius: number,
  octave1Scale: number,
  octave2Scale: number,
  octave3Scale: number,
): NoiseConfig {
  return {
    landThreshold,
    falloffStrength,
    falloffRadius,
    octave1Scale,
    octave2Scale,
    octave3Scale,
    ...OCTAVE_WEIGHTS,
  };
}

/** A IS MON–WED. B IS THU–FRI. C IS THE WEEKEND. THE CLOCK IS UTC. */
const PRESET_A = presetNoise(0.18, 0.3, 0.78, 0.18, 0.85, 0.4);
const PRESET_B = presetNoise(0.21, 0.14, 0.93, 0.17, 0.75, 0.35);
const PRESET_C = presetNoise(0.35, 0.14, 0.93, 0.17, 0.75, 0.35);

export function dailyPresetFor(date: Date): DailyPreset {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) {
    return { id: "C", noise: PRESET_C };
  }
  if (day === 4 || day === 5) {
    return { id: "B", noise: PRESET_B };
  }
  return { id: "A", noise: PRESET_A };
}

export function dailyDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type DailyBuild = {
  level: Level;
  solver: number | null;
  preset: DailyPresetId;
  day: string;
};

/** THE BOARD FOR A UTC DAY. THE SAME SEED ALWAYS DRAWS THE SAME ISLAND. */
export function dailyLevelFor(date: Date): Level {
  const preset = dailyPresetFor(date);
  const day = dailyDateKey(date);
  return generateLevel({
    seed: `daily-${day}`,
    config: {
      grid: { ...CREATE_FIXED_GRID },
      noise: preset.noise,
    },
  });
}

/** ONE BOARD PER UTC DATE. THE GRID MATCHES CREATE. THE SOLVER COST IS FROZEN HERE. */
export function buildDailyLevel(date = new Date()): DailyBuild {
  const preset = dailyPresetFor(date);
  const day = dailyDateKey(date);
  const level = dailyLevelFor(date);
  const solver = perfectBridgeCost(level);
  console.log("[journeyman:daily] built", {
    day,
    preset: preset.id,
    levelId: level.id,
    solver,
  });
  return { level, solver, preset: preset.id, day };
}

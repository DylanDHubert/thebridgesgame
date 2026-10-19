import { createNoise2D } from "simplex-noise";

import type { IsoSpan } from "@/lib/game/isoBoard";
import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";

/** ONE CYCLE ACROSS ABOUT TWO THIRDS OF THE BOARD, WHICH FILLS THE SCREEN. */
const WAVE_PERIOD_OF_WIDTH = 2 / 3;

/** HOW FAR THE DEPTH WASH MAY SWING. SHORE MOVES LESS THAN OPEN WATER. */
const WAVE_SWING = 0.16;

/** DEPTH STEPS KEPT SO THE TINT CACHE STAYS FINITE WHILE THE WAVE MOVES. */
const DEPTH_STEPS = 24;

type Noise2D = (x: number, y: number) => number;

export type WaterWaveField = {
  sample: (row: number, col: number, time: number) => number;
};

/** A FEW STEPS SO NEIGHBORING MARSH TILES CAN SHARE A TINT. */
const WARMTH_STEPS = 8;

/** FOUR OCTAVES. EACH ONE IS HALF THE LAST AND ABOUT TWICE AS FINE. */
function fractalNoise(noise: Noise2D, x: number, y: number): number {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let weight = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    sum += noise(x * frequency, y * frequency) * amplitude;
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2.05;
  }
  return sum / weight;
}

/**
 * TWO SINE WAVES WITH THE SAME ON-SCREEN LENGTH.
 * SCREEN X FOLLOWS U = COL - ROW. SCREEN Y IS HALF AS TALL PER V STEP.
 */
export function buildWaterWaveField(seed: string, span: IsoSpan): WaterWaveField {
  const widthInU = span.uMax - span.uMin + 2;
  const period = Math.max(1, widthInU * WAVE_PERIOD_OF_WIDTH);
  const waveNumber = (Math.PI * 2) / period;
  const phase = ((hashStringToSeed(`${seed}-water-waves`) % 1000) / 1000) * Math.PI * 2;

  return {
    sample(row: number, col: number, time: number) {
      const u = col - row;
      const v = col + row;
      const swell = Math.sin(waveNumber * u - time * 0.45 + phase);
      const cross = Math.sin(waveNumber * (u * 0.45 + v * 0.445) - time * 0.28 + phase * 0.5);
      return swell * 0.7 + cross * 0.3;
    },
  };
}

/** STABLE PATCHES FROM THE CURRENT GREEN TOWARD THE YELLOW MARSH. */
export function buildMarshWarmth(seed: string): (row: number, col: number) => number {
  const noise = createNoise2D(mulberry32(hashStringToSeed(`${seed}-marsh-warm`)));

  return (row: number, col: number) => {
    const n = fractalNoise(noise, col * 0.16 + 4, row * 0.16 + 11);
    const warmth = Math.min(1, Math.max(0, (n + 1) * 0.5));
    return Math.round(warmth * WARMTH_STEPS) / WARMTH_STEPS;
  };
}

/** BASE DEPTH PLUS A SMALL DRIFTING WAVE. SHORE STAYS THE SHALLOW END. */
export function animatedWaterDepth(
  field: WaterWaveField,
  base: number,
  row: number,
  col: number,
  time: number,
): number {
  const shore = Math.min(1, Math.max(0, base));
  const delta = field.sample(row, col, time) * WAVE_SWING * (0.4 + shore * 0.6);
  const next = Math.min(1, Math.max(0, shore + delta));
  return Math.round(next * DEPTH_STEPS) / DEPTH_STEPS;
}

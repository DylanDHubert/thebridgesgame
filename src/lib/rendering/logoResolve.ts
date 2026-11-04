/**
 * THE LOADING MARK. A 1-BIT BLACK-ON-WHITE FIELD OF SCRAMBLED PIXELS SORTS
 * ITSELF INTO THE LOGO, THEN THE REAL PALETTE DITHERS IN OVER THE TOP.
 *
 * EVERYTHING IS DRIVEN BY A SINGLE PROGRESS VALUE p IN 0..1, SO THE MARK CAN
 * BE RUN OFF A CLOCK OR OFF REAL LOAD PROGRESS WITHOUT CHANGING THE CODE.
 */

import { BLOCK_H, BLOCK_W, GREEN_INDICES, PALETTE, cellAt } from "@/lib/rendering/logoBlock";

export const LOGO_SIZE = 128;

const AREA = LOGO_SIZE * LOGO_SIZE;
const INK = 0xff000000;
const PAPER = 0xffffffff;

/** 4x4 ORDERED DITHER THRESHOLDS IN 0..1. */
const BAYER4 = new Float32Array([
  0.5 / 16, 8.5 / 16, 2.5 / 16, 10.5 / 16,
  12.5 / 16, 4.5 / 16, 14.5 / 16, 6.5 / 16,
  3.5 / 16, 11.5 / 16, 1.5 / 16, 9.5 / 16,
  15.5 / 16, 7.5 / 16, 13.5 / 16, 5.5 / 16,
]);

/**
 * CELL-ALIGNED 3x3 PATTERN. BECAUSE THE PERIOD EQUALS THE CELL SIZE, TWO
 * CELLS AT THE SAME DENSITY GET THE IDENTICAL DOTS -- WHICH IS WHAT MAKES A
 * FACE READ AS ONE FLAT TONE INSTEAD OF AS NOISE.
 */
const PATTERN3 = [
  [0, 6, 4],
  [5, 2, 8],
  [3, 7, 1],
];

const BLOCK_SCALE = 3;
const BLOCK_TOP = 8;
const TEXT_GAP = 14;
const FONT_PX = 8;

/** THE DIRT IS LIT FROM THE LEFT, SO ITS TWO FACES TAKE DIFFERENT TONES. */
const TOP_INK = 0.1;
const LEFT_INK = 0.48;
const RIGHT_INK = 0.95;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export type LogoTarget = {
  /** 0 = PAPER, 1 = INK. ALREADY REDUCED TO 1-BIT BY THE CELL PATTERNS. */
  density: Float32Array;
  /** PACKED ARGB OF THE REAL ART, 0 WHERE THERE IS NONE. */
  color: Uint32Array;
  /** 0..1 ORDERING KEY SAYING WHEN EACH PIXEL TURNS COLOR. */
  reveal: Float32Array;
};

/**
 * RASTERIZE THE TITLE INTO THE DENSITY FIELD. THE GLYPHS ARE THRESHOLDED ON
 * ALPHA SO THE PIXEL FONT STAYS CRISP INSTEAD OF ANTI-ALIASED.
 */
function drawTitle(density: Float32Array, title: string, fontFamily: string, top: number) {
  const pad = 16;
  const canvas = document.createElement("canvas");
  canvas.width = LOGO_SIZE;
  canvas.height = FONT_PX + pad * 2;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return;
  }
  ctx.font = `700 ${FONT_PX}px ${fontFamily}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  const metrics = ctx.measureText(title);
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent || 6);
  const x0 = Math.round((LOGO_SIZE - metrics.width) / 2);
  ctx.fillStyle = "#000";
  ctx.fillText(title, x0, pad + ascent);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let y = 0; y < canvas.height; y++) {
    const ty = top + (y - pad);
    if (ty < 0 || ty >= LOGO_SIZE) {
      continue;
    }
    for (let x = 0; x < LOGO_SIZE; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 127) {
        density[ty * LOGO_SIZE + x] = 1;
      }
    }
  }
}

/**
 * BUILD THE RESOLVED MARK. fontFamily IS THE RESOLVED SILKSCREEN FAMILY --
 * CANVAS CANNOT READ THE CSS VARIABLE, SO IT HAS TO BE PASSED IN.
 */
export function buildLogoTarget(fontFamily: string, title = "The Bridges Game"): LogoTarget {
  const density = new Float32Array(AREA);
  const color = new Uint32Array(AREA);
  const reveal = new Float32Array(AREA);

  const s = BLOCK_SCALE;
  const blockW = BLOCK_W * s;
  const blockH = BLOCK_H * s;
  const bx = Math.round((LOGO_SIZE - blockW) / 2);
  const by = BLOCK_TOP;

  for (let cy = 0; cy < BLOCK_H; cy++) {
    for (let cx = 0; cx < BLOCK_W; cx++) {
      const index = cellAt(cx, cy);
      if (index < 0) {
        continue;
      }
      const green = GREEN_INDICES.has(index);
      let tone = green ? TOP_INK : cx < BLOCK_W / 2 ? LEFT_INK : RIGHT_INK;

      // THE GRASS LIP: A HARD LINE WHERE DIRT MEETS THE GRASS ABOVE IT.
      const above = cellAt(cx, cy - 1);
      if (!green && above >= 0 && GREEN_INDICES.has(above)) {
        tone = 1;
      }
      // A ONE-CELL RIM KEEPS THE SILHOUETTE READABLE AT 1-BIT.
      const edge =
        cellAt(cx - 1, cy) < 0 ||
        cellAt(cx + 1, cy) < 0 ||
        cellAt(cx, cy - 1) < 0 ||
        cellAt(cx, cy + 1) < 0;
      if (edge) {
        tone = 1;
      }

      const [r, g, b] = PALETTE[index];
      const argb = ((0xff000000 | (b << 16) | (g << 8) | r) >>> 0) as number;
      // GRASS LIGHTS UP FIRST, THEN THE DIRT BLEEDS DOWNWARD.
      const order = green ? 0.34 * (cy / BLOCK_H) : 0.38 + 0.62 * (cy / BLOCK_H);

      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const px = bx + cx * s + x;
          const py = by + cy * s + y;
          if (px < 0 || py < 0 || px >= LOGO_SIZE || py >= LOGO_SIZE) {
            continue;
          }
          const i = py * LOGO_SIZE + px;
          density[i] = tone > (PATTERN3[y][x] + 0.5) / (s * s) ? 1 : 0;
          color[i] = argb;
          reveal[i] = clamp01(order);
        }
      }
    }
  }

  drawTitle(density, title, fontFamily, by + blockH + TEXT_GAP);
  return { density, color, reveal };
}

export type LogoSorter = {
  reset(): void;
  /** WRITE THE FIELD FOR PROGRESS p INTO out. */
  frame(out: Float32Array, p: number): void;
};

/**
 * COLUMNS START SCRAMBLED AND ODD-EVEN TRANSPOSITION SORT BACK INTO PLACE.
 * SORTING IS SPENT IN STEP WITH p, SO THE PICTURE NEVER RUNS AHEAD OF LOADING.
 */
export function createPixelSort(target: LogoTarget): LogoSorter {
  const columns: Float32Array[] = [];
  for (let x = 0; x < LOGO_SIZE; x++) {
    const col = new Float32Array(LOGO_SIZE);
    for (let y = 0; y < LOGO_SIZE; y++) {
      col[y] = target.density[y * LOGO_SIZE + x];
    }
    columns.push(col);
  }

  let perm: Int16Array[] = [];
  let parity = 0;
  let passes = 0;

  const reset = () => {
    perm = [];
    for (let x = 0; x < LOGO_SIZE; x++) {
      const a = new Int16Array(LOGO_SIZE);
      for (let y = 0; y < LOGO_SIZE; y++) {
        a[y] = y;
      }
      for (let i = LOGO_SIZE - 1; i > 0; i--) {
        const j = Math.floor(hash2(x * 97 + i, i * 31) * (i + 1));
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
      }
      perm.push(a);
    }
    parity = 0;
    passes = 0;
  };

  const pass = () => {
    for (let x = 0; x < LOGO_SIZE; x++) {
      const a = perm[x];
      for (let y = parity; y < LOGO_SIZE - 1; y += 2) {
        if (a[y] > a[y + 1]) {
          const tmp = a[y];
          a[y] = a[y + 1];
          a[y + 1] = tmp;
        }
      }
    }
    parity ^= 1;
    passes++;
  };

  reset();

  return {
    reset,
    frame(out, p) {
      // A FULL SORT NEEDS ABOUT ONE PASS PER ROW; THE SLACK LANDS IT EARLY
      // ENOUGH THAT THE COLOR SWEEP HAS A SETTLED PICTURE TO WORK ON.
      const want = Math.round(clamp01(p) * (LOGO_SIZE + 12));
      let guard = 0;
      while (passes < want && guard++ < 400) {
        pass();
      }
      for (let x = 0; x < LOGO_SIZE; x++) {
        const a = perm[x];
        const col = columns[x];
        for (let y = 0; y < LOGO_SIZE; y++) {
          out[y * LOGO_SIZE + x] = col[a[y]];
        }
      }
    },
  };
}

/**
 * DITHER THE FIELD DOWN TO 1-BIT AND LET COLOR WIN WHERE IT HAS ARRIVED.
 * THE COLOR FRONT IS ITSELF DITHERED SO IT LANDS AS PIXELS, NOT AS A WIPE.
 */
export function paintLogo(
  target: LogoTarget,
  field: Float32Array,
  pixels: Uint32Array,
  colorAmount: number,
) {
  const colored = colorAmount > 0;
  // OVERSHOOT SO FULL PROGRESS CLEARS EVERY PIXEL DESPITE THE JITTER.
  const front = colorAmount * 1.3 - 0.15;
  for (let y = 0; y < LOGO_SIZE; y++) {
    const row = y * LOGO_SIZE;
    for (let x = 0; x < LOGO_SIZE; x++) {
      const i = row + x;
      const threshold = BAYER4[(y & 3) * 4 + (x & 3)];
      let out = field[i] > threshold ? INK : PAPER;
      if (colored) {
        const c = target.color[i];
        if (c !== 0 && front > target.reveal[i] + (threshold - 0.5) * 0.14) {
          out = c;
        }
      }
      pixels[i] = out;
    }
  }
}

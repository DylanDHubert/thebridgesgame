/**
 * BLOCK ART EXTRACTED FROM public/apple-touch-icon.png.
 * THE SOURCE IS 180x180 DRAWN ON A 5px GRID, SO THE NATIVE ART IS 32x24 CELLS.
 * '.' IS TRANSPARENT; '0'-'7' INDEX INTO PALETTE.
 */

export const BLOCK_W = 32;
export const BLOCK_H = 24;

/** THE EIGHT SOURCE COLORS, AS [r, g, b]. */
export const PALETTE: readonly (readonly [number, number, number])[] = [
  [117, 167, 67],
  [70, 130, 50],
  [173, 119, 87],
  [77, 43, 50],
  [122, 72, 65],
  [37, 86, 46],
  [52, 28, 39],
  [36, 21, 39],
];

/** THE THREE GREENS ARE THE GRASS TOP; THE REST ARE THE DIRT BODY. */
export const GREEN_INDICES: ReadonlySet<number> = new Set([0, 1, 5]);

export const ROWS: readonly string[] = [
  "..............0001..............",
  "............21111333............",
  ".........0224111330014..........",
  "........0144415530004433........",
  "......01444355440014433330......",
  "....001444322241144433332044....",
  "..2014444222222424244400011144..",
  "20114442222244444443300111111446",
  "11143331222444443333404444144036",
  "14233310114244333004444443224337",
  "43663241444333000011144332143376",
  "33666414433310011101143021336766",
  "43366433630101411044434333366666",
  "43366333662444411444377766666667",
  "33364333664344414433367666677767",
  "33364333643333441367667777777777",
  "33337333643333336766677766666667",
  "..3673333743333736676666666767..",
  "....633337433336667666666667....",
  "......33664333366676666777......",
  "........6633336366666667........",
  "..........633363667666..........",
  "............33636766............",
  "..............6637..............",
];

/** PALETTE INDEX AT A CELL, OR -1 WHERE THE ART IS TRANSPARENT. */
export function cellAt(cx: number, cy: number): number {
  if (cx < 0 || cy < 0 || cx >= BLOCK_W || cy >= BLOCK_H) {
    return -1;
  }
  const ch = ROWS[cy][cx];
  return ch === '.' ? -1 : ch.charCodeAt(0) - 48;
}

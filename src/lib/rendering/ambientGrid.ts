import {
  terrainGridGap,
  terrainSubcellRect,
  terrainSubcellSize,
} from "@/lib/rendering/terrainBorders";
import { WATER_SUBCELLS } from "@/lib/rendering/waterNoise";
import { DEFAULT_DISPLAY_PREFS } from "@/lib/rendering/displayPrefs";

/** MATCHES A TYPICAL PLAY BOARD CELL */
export const AMBIENT_CELL_SIZE = 32;

export const AMBIENT_GRID_OPACITY = DEFAULT_DISPLAY_PREFS.cellGridOpacity;

export type AmbientGridMetrics = {
  cellSize: number;
  gap: number;
  stride: number;
};

export function ambientGridMetrics(
  cellSize = AMBIENT_CELL_SIZE,
): AmbientGridMetrics {
  const gap = terrainGridGap(cellSize);
  return { cellSize, gap, stride: cellSize + gap };
}

/** HOW MANY CELLS FILL A BOX — SAME STRIDE AS GameBoard */
export function ambientGridCounts(
  width: number,
  height: number,
  cellSize = AMBIENT_CELL_SIZE,
): { rows: number; cols: number; metrics: AmbientGridMetrics } {
  const metrics = ambientGridMetrics(cellSize);
  const { gap, stride } = metrics;
  const cols = Math.max(1, Math.ceil((width + gap) / stride));
  const rows = Math.max(1, Math.ceil((height + gap) / stride));
  return { rows, cols, metrics };
}

export function ambientCellOrigin(
  row: number,
  col: number,
  stride: number,
): { x: number; y: number } {
  return { x: col * stride, y: row * stride };
}

/** WHITE SQUARE OUTLINE — SAME AS drawWhiteGrid */
export function drawAmbientWhiteCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  opacity = AMBIENT_GRID_OPACITY,
): void {
  if (opacity <= 0) {
    return;
  }
  ctx.fillStyle = `rgb(255 255 255 / ${opacity})`;
  ctx.fillRect(x, y, cellSize, 1);
  ctx.fillRect(x, y + cellSize - 1, cellSize, 1);
  ctx.fillRect(x, y, 1, cellSize);
  ctx.fillRect(x + cellSize - 1, y, 1, cellSize);
}

export function forEachAmbientSubcell(
  cellSize: number,
  subcells: number,
  originX: number,
  originY: number,
  paint: (rect: { x: number; y: number; width: number; height: number }, subRow: number, subCol: number) => void,
): void {
  const subSize = terrainSubcellSize(cellSize, subcells);
  for (let subRow = 0; subRow < subcells; subRow += 1) {
    for (let subCol = 0; subCol < subcells; subCol += 1) {
      const rect = terrainSubcellRect(
        originX,
        originY,
        cellSize,
        subcells,
        subSize,
        subCol,
        subRow,
      );
      paint(rect, subRow, subCol);
    }
  }
}

/** FILL THE 1-TEXTURE-PIXEL GAPS BETWEEN CELLS (LEVEL STRUCTURE) */
export function paintAmbientGaps(
  ctx: CanvasRenderingContext2D,
  rows: number,
  cols: number,
  metrics: AmbientGridMetrics,
  colorAt: (row: number, col: number) => { r: number; g: number; b: number },
): void {
  const { cellSize, gap, stride } = metrics;
  if (gap <= 0) {
    return;
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const { r, g, b } = colorAt(row, col);
      ctx.fillStyle = `rgb(${r} ${g} ${b})`;
      ctx.fillRect(col * stride + cellSize, row * stride, gap, cellSize);
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const { r, g, b } = colorAt(row, col);
      ctx.fillStyle = `rgb(${r} ${g} ${b})`;
      ctx.fillRect(col * stride, row * stride + cellSize, cellSize, gap);
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const { r, g, b } = colorAt(row, col);
      ctx.fillStyle = `rgb(${r} ${g} ${b})`;
      ctx.fillRect(col * stride + cellSize, row * stride + cellSize, gap, gap);
    }
  }
}

export { WATER_SUBCELLS };

/** OUTER RINGS OF THE ISO RECTANGLE THAT STAY EMPTY OCEAN */
export const ISO_PAD_LAYERS = 2;

/** ONE VISUAL STEP ALONG THE ISO LATTICE IS 2 UNITS OF U OR V */
const LATTICE_STEP = 2;

export type IsoSpan = {
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
};

export type IsoCellRole = "play" | "pad" | "void";

export type IsoBoard = {
  rows: number;
  cols: number;
  span: IsoSpan;
  minRow: number;
  minCol: number;
};

/** ONE EXTRA ROW ON THE TOP, LEFT, AND RIGHT SO THOSE EDGES GET CUT BY THE FRAME. */
export function bleedRimSpan(span: IsoSpan): IsoSpan {
  return {
    uMin: span.uMin - LATTICE_STEP,
    uMax: span.uMax + LATTICE_STEP,
    vMin: span.vMin - LATTICE_STEP,
    vMax: span.vMax,
  };
}

export function isIsoSpan(value: unknown): value is IsoSpan {
  if (!value || typeof value !== "object") {
    return false;
  }
  const span = value as Partial<IsoSpan>;
  return [span.uMin, span.uMax, span.vMin, span.vMax].every(
    (entry) => typeof entry === "number" && Number.isFinite(entry),
  );
}

/**
 * STORED GRID FOR A CONTENT RECTANGLE.
 * THE LATTICE FILLS THE ISO RECTANGLE. COORDINATES ARE SHIFTED SO ROW AND COL STAY NON-NEGATIVE.
 * OUTER ISO_PAD_LAYERS ARE PADDING. THE REST OF THE LATTICE IS PLAYABLE, INCLUDING THE CORNER FILLS.
 */
export function isoBoardFromContent(contentRows: number, contentCols: number): IsoBoard {
  const uMin = 1 - contentRows;
  const uMax = contentCols - 1;
  const vMin = 0;
  const vMax = contentRows + contentCols - 2;
  let minRow = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;
  let minCol = Number.POSITIVE_INFINITY;
  let maxCol = Number.NEGATIVE_INFINITY;

  for (let v = vMin; v <= vMax; v += 1) {
    for (let u = uMin; u <= uMax; u += 1) {
      if (((u + v) & 1) !== 0) {
        continue;
      }
      const row = (v - u) / 2;
      const col = (v + u) / 2;
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }
  }

  const shiftU = minRow - minCol;
  const shiftV = -minCol - minRow;
  return {
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
    minRow,
    minCol,
    span: {
      uMin: uMin + shiftU,
      uMax: uMax + shiftU,
      vMin: vMin + shiftV,
      vMax: vMax + shiftV,
    },
  };
}

export function isoCellRole(row: number, col: number, span: IsoSpan): IsoCellRole {
  const u = col - row;
  const v = col + row;
  if (u < span.uMin || u > span.uMax || v < span.vMin || v > span.vMax) {
    return "void";
  }
  const edgeU = Math.min(u - span.uMin, span.uMax - u);
  const edgeV = Math.min(v - span.vMin, span.vMax - v);
  const layer = Math.min(
    Math.floor(edgeU / LATTICE_STEP),
    Math.floor(edgeV / LATTICE_STEP),
  );
  return layer < ISO_PAD_LAYERS ? "pad" : "play";
}

/** BACK TO FRONT. PADDING AND PLAYABLE CELLS ONLY — VOIDS ARE THE ROW/COL CORNERS OUTSIDE THE RECTANGLE. */
export function isoLatticeCells(
  span: IsoSpan,
): { row: number; col: number; role: Exclude<IsoCellRole, "void"> }[] {
  const cells: { row: number; col: number; role: Exclude<IsoCellRole, "void"> }[] = [];
  for (let v = span.vMin; v <= span.vMax; v += 1) {
    for (let u = span.uMin; u <= span.uMax; u += 1) {
      if (((u + v) & 1) !== 0) {
        continue;
      }
      const row = (v - u) / 2;
      const col = (v + u) / 2;
      const role = isoCellRole(row, col, span);
      if (role === "void") {
        continue;
      }
      cells.push({ row, col, role });
    }
  }
  return cells;
}

export type Point = { x: number; y: number };

function catmullRom(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

/**
 * SMOOTH A POLYLINE VIA CATMULL-ROM.
 * RETURNS A DENSE POLYLINE IN THE SAME SPACE AS `pts`.
 */
export function smoothPoints(
  pts: Point[],
  closed: boolean,
  samplesPerSegment = 20,
): Point[] {
  if (pts.length < 3) {
    return pts;
  }

  const n = pts.length;
  const getPt = (i: number): Point =>
    closed ? pts[((i % n) + n) % n]! : pts[Math.max(0, Math.min(n - 1, i))]!;

  const segments = closed ? n : n - 1;
  const result: Point[] = [];

  for (let seg = 0; seg < segments; seg += 1) {
    const p0 = getPt(seg - 1);
    const p1 = getPt(seg);
    const p2 = getPt(seg + 1);
    const p3 = getPt(seg + 2);
    for (let step = 0; step < samplesPerSegment; step += 1) {
      result.push(catmullRom(p0, p1, p2, p3, step / samplesPerSegment));
    }
  }

  result.push(closed ? getPt(0) : pts[n - 1]!);
  return result;
}

export type ArcTable = { cumulative: number[]; total: number };

/** CUMULATIVE ARC LENGTH SO A SHIP CAN MOVE AT CONSTANT SPEED */
export function buildArcTable(points: Point[]): ArcTable {
  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i]!.x - points[i - 1]!.x;
    const dy = points[i]!.y - points[i - 1]!.y;
    cumulative.push(cumulative[i - 1]! + Math.hypot(dx, dy));
  }
  return { cumulative, total: cumulative[cumulative.length - 1] ?? 0 };
}

export type PathSample = { x: number; y: number; angle: number };

/** SAMPLE A POINT (AND HEADING) AT A GIVEN DISTANCE ALONG THE POLYLINE */
export function samplePath(
  points: Point[],
  cumulative: number[],
  distance: number,
): PathSample {
  if (points.length === 0) {
    return { x: 0, y: 0, angle: 0 };
  }
  if (points.length === 1) {
    return { x: points[0]!.x, y: points[0]!.y, angle: 0 };
  }

  const total = cumulative[cumulative.length - 1] ?? 0;
  const clamped = Math.max(0, Math.min(total, distance));

  let i = 1;
  while (i < cumulative.length && cumulative[i]! < clamped) {
    i += 1;
  }

  const prev = points[i - 1]!;
  const next = points[i] ?? prev;
  const segLength = (cumulative[i] ?? cumulative[i - 1]!) - cumulative[i - 1]!;
  const t = segLength > 0 ? (clamped - cumulative[i - 1]!) / segLength : 0;

  return {
    x: prev.x + (next.x - prev.x) * t,
    y: prev.y + (next.y - prev.y) * t,
    angle: Math.atan2(next.y - prev.y, next.x - prev.x),
  };
}

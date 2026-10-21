/** GAME TIME FOR THE HOME RUN. RATE 1 MATCHES THE WALL CLOCK. */

const listeners = new Set<() => void>();

let rate = 1;
let anchorReal = 0;
let anchorGame = 0;

export const FAST_RUN_RATE = 3;

export function getRunRate(): number {
  return rate;
}

/** MAP A WALL TIMESTAMP ONTO THE RUN. OMITTED, USES NOW. */
export function runNow(real = performance.now()): number {
  return anchorGame + (real - anchorReal) * rate;
}

export function setRunRate(next: number) {
  const real = performance.now();
  anchorGame = runNow(real);
  anchorReal = real;
  rate = next;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeRunRate(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

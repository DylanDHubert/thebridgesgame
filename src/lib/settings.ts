export type CheckFade = "fast" | "slow";

export type PlaySettings = {
  cliffOutline: boolean;
  checkFade: CheckFade;
};

const CLIFF_KEY = "journeyman:cliff-outline";
const CHECK_FADE_KEY = "journeyman:check-fade";

const DEFAULTS: PlaySettings = {
  cliffOutline: true,
  checkFade: "fast",
};

let settings: PlaySettings = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") {
    return;
  }
  hydrated = true;
  settings = {
    cliffOutline: window.localStorage.getItem(CLIFF_KEY) !== "0",
    checkFade: window.localStorage.getItem(CHECK_FADE_KEY) === "slow" ? "slow" : "fast",
  };
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getPlaySettings(): PlaySettings {
  hydrate();
  return settings;
}

export function subscribePlaySettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setCliffOutline(on: boolean) {
  hydrate();
  settings = { ...settings, cliffOutline: on };
  window.localStorage.setItem(CLIFF_KEY, on ? "1" : "0");
  emit();
}

export function setCheckFade(pace: CheckFade) {
  hydrate();
  settings = { ...settings, checkFade: pace };
  window.localStorage.setItem(CHECK_FADE_KEY, pace);
  emit();
}

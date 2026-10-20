/** ONE MUSIC ELEMENT FOR THE WHOLE VISIT. PAGES MUST NOT BUILD ANOTHER. */

const MUSIC_SRC = "/assets/sfx/music.mp3";
const WALK_SRC = "/assets/sfx/walking.mp3";
const MUSIC_KEY = "journeyman:music";
const SFX_KEY = "journeyman:sfx";

const CLIPS = {
  click: "/assets/sfx/boar_click.mp3",
  eat: "/assets/sfx/boar_eat.mp3",
  placeWater: "/assets/sfx/place_bridge_water.mp3",
  placeMarsh: "/assets/sfx/place_bridge_marsh.mp3",
  removeWater: "/assets/sfx/remove_bridge_water.mp3",
  removeMarsh: "/assets/sfx/remove_bridge_marsh.mp3",
} as const;

export type SfxName = keyof typeof CLIPS;

type Levels = { music: number; sfx: number };

const listeners = new Set<() => void>();
const runners = new Set<string>();

let musicVolume = 0.55;
let sfxVolume = 0.8;
let snapshot: Levels = { music: musicVolume, sfx: sfxVolume };
let armed = false;
let music: HTMLAudioElement | null = null;
let walking: HTMLAudioElement | null = null;
let hydrated = false;

function clamp(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function readStored(key: string, fallback: number): number {
  if (typeof window === "undefined") {
    return fallback;
  }
  const raw = window.localStorage.getItem(key);
  if (raw == null) {
    return fallback;
  }
  return clamp(Number(raw));
}

function hydrate() {
  if (hydrated || typeof window === "undefined") {
    return;
  }
  hydrated = true;
  musicVolume = readStored(MUSIC_KEY, musicVolume);
  sfxVolume = readStored(SFX_KEY, sfxVolume);
  snapshot = { music: musicVolume, sfx: sfxVolume };
}

function emit() {
  snapshot = { music: musicVolume, sfx: sfxVolume };
  for (const listener of listeners) {
    listener();
  }
}

function mount(audio: HTMLAudioElement, id: string, src: string, loop: boolean) {
  audio.id = id;
  audio.src = src;
  audio.loop = loop;
  audio.preload = "auto";
  audio.hidden = true;
  if (!audio.isConnected && typeof document !== "undefined") {
    document.body.appendChild(audio);
  }
}

function ensureElements() {
  hydrate();
  if (typeof window === "undefined") {
    return;
  }
  if (!music) {
    music = new Audio();
    mount(music, "journeyman-music", MUSIC_SRC, true);
  }
  music.volume = musicVolume;
  if (!walking) {
    walking = new Audio();
    mount(walking, "journeyman-walking", WALK_SRC, true);
  }
  walking.volume = sfxVolume;
}

function syncWalking() {
  if (!walking) {
    return;
  }
  walking.volume = sfxVolume;
  const want = runners.size > 0 && armed && sfxVolume > 0;
  if (want && walking.paused) {
    void walking.play().catch(() => undefined);
    return;
  }
  if (!want && !walking.paused) {
    walking.pause();
  }
}

/** START THE LOOP ON THE FIRST GESTURE. A LATER CALL DOES NOT REWIND IT. */
export function armAudio() {
  hydrate();
  if (typeof window === "undefined") {
    return;
  }
  const first = !armed;
  armed = true;
  ensureElements();
  if (music && music.paused) {
    void music.play().then(
      () => {
        if (first) {
          console.log("[journeyman:sfx] music started");
        }
      },
      () => undefined,
    );
  }
  syncWalking();
}

export function getAudioLevels(): Levels {
  hydrate();
  return snapshot;
}

export function subscribeAudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setMusicVolume(next: number) {
  hydrate();
  musicVolume = clamp(next);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MUSIC_KEY, String(musicVolume));
  }
  if (music) {
    music.volume = musicVolume;
  }
  armAudio();
  emit();
}

export function setSfxVolume(next: number) {
  hydrate();
  sfxVolume = clamp(next);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SFX_KEY, String(sfxVolume));
  }
  if (walking) {
    walking.volume = sfxVolume;
  }
  armAudio();
  syncWalking();
  emit();
}

export function playSfx(name: SfxName) {
  hydrate();
  if (typeof window === "undefined" || sfxVolume <= 0) {
    return;
  }
  armAudio();
  const clip = new Audio(CLIPS[name]);
  clip.volume = sfxVolume;
  void clip.play().catch(() => undefined);
}

export function playBridgeToggle(kind: string | undefined, removing: boolean) {
  const marsh = kind === "marsh";
  if (removing) {
    playSfx(marsh ? "removeMarsh" : "removeWater");
    return;
  }
  playSfx(marsh ? "placeMarsh" : "placeWater");
}

/** EACH CANVAS CLAIMS THE WALK LOOP WHILE ITS BOAR IS MID-STRIDE. */
export function setWalker(id: string, running: boolean) {
  if (running) {
    runners.add(id);
  } else {
    runners.delete(id);
  }
  if (!armed) {
    return;
  }
  ensureElements();
  syncWalking();
}

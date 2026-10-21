/** ONE SONG FOR THE WHOLE VISIT. PAGES MUST NOT START ANOTHER. */

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
  fastForward: "/assets/sfx/fast_forward.mp3",
} as const;

export type SfxName = keyof typeof CLIPS;

type Levels = { music: number; sfx: number };

const listeners = new Set<() => void>();
const runners = new Set<string>();

/** LOGIC WROTE THIS GAPLESS MAP INTO THE MP3. A MEDIA ELEMENT PLAYS THE PADDING EVERY LOOP. */
const GAPLESS_DELAY = 528;
const GAPLESS_PADDING = 2270;
const GAPLESS_RATE = 48000;
const FULL_SECONDS = 34.344;
const GAPLESS_SECONDS = 34.2857;

let musicVolume = 0.55;
let sfxVolume = 0.8;
let snapshot: Levels = { music: musicVolume, sfx: sfxVolume };
let armed = false;
/** HELD UNTIL THE VISIT SCREEN SAYS THE SONG MAY START. */
let audioBlocked = true;
let context: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicSource: AudioBufferSourceNode | null = null;
let musicPending = false;
let musicLoad: Promise<AudioBuffer> | null = null;
let musicElement: HTMLAudioElement | null = null;
let walking: HTMLAudioElement | null = null;
let hydrated = false;
let audioRate = 1;

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

function ensureWalking() {
  hydrate();
  if (typeof window === "undefined") {
    return;
  }
  if (!walking) {
    walking = new Audio();
    mount(walking, "journeyman-walking", WALK_SRC, true);
  }
  walking.volume = sfxVolume;
  walking.playbackRate = audioRate;
}

function musicContext(): AudioContext {
  if (!context) {
    context = new AudioContext();
    musicGain = context.createGain();
    musicGain.gain.value = musicVolume;
    musicGain.connect(context.destination);
  }
  return context;
}

/** DROP THE ENCODER SILENCE WHEN THE DECODER STILL LEFT IT ON THE BUFFER. */
function trimGapless(audio: AudioContext, buffer: AudioBuffer): AudioBuffer {
  const slack = Math.round(0.02 * buffer.sampleRate);
  const gaplessLength = Math.round(GAPLESS_SECONDS * buffer.sampleRate);
  if (Math.abs(buffer.length - gaplessLength) <= slack) {
    return buffer;
  }
  const fullLength = Math.round(FULL_SECONDS * buffer.sampleRate);
  if (Math.abs(buffer.length - fullLength) > slack) {
    return buffer;
  }
  const scale = buffer.sampleRate / GAPLESS_RATE;
  const delay = Math.round(GAPLESS_DELAY * scale);
  const padding = Math.round(GAPLESS_PADDING * scale);
  const length = buffer.length - delay - padding;
  if (length < buffer.sampleRate) {
    return buffer;
  }
  const trimmed = audio.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    trimmed.getChannelData(channel).set(buffer.getChannelData(channel).subarray(delay, delay + length));
  }
  console.log("[journeyman:sfx] music loop trimmed", {
    cutStartMs: Math.round((delay / buffer.sampleRate) * 1000),
    cutEndMs: Math.round((padding / buffer.sampleRate) * 1000),
  });
  return trimmed;
}

function loadMusic(audio: AudioContext): Promise<AudioBuffer> {
  if (!musicLoad) {
    musicLoad = fetch(MUSIC_SRC)
      .then((response) => {
        if (!response.ok) {
          throw new Error(String(response.status));
        }
        return response.arrayBuffer();
      })
      .then((bytes) => audio.decodeAudioData(bytes.slice(0)))
      .then((decoded) => trimGapless(audio, decoded))
      .catch((error: unknown) => {
        musicLoad = null;
        throw error;
      });
  }
  return musicLoad;
}

function startElementMusic(first: boolean) {
  if (!musicElement) {
    musicElement = new Audio();
    mount(musicElement, "journeyman-music", MUSIC_SRC, true);
  }
  musicElement.volume = musicVolume;
  musicElement.playbackRate = audioRate;
  if (!musicElement.paused) {
    return;
  }
  void musicElement.play().then(
    () => {
      if (first) {
        console.log("[journeyman:sfx] music started");
      }
    },
    () => undefined,
  );
}

/** PCM LOOP. THE MEDIA ELEMENT RESTARTS THE MP3 AND PLAYS THE GAP. */
function startMusic(first: boolean) {
  if (musicSource || musicElement || musicPending) {
    return;
  }
  let audio: AudioContext;
  try {
    audio = musicContext();
  } catch (error) {
    console.error("[journeyman:sfx] music context failed", error);
    startElementMusic(first);
    return;
  }
  musicPending = true;
  void audio.resume();
  void loadMusic(audio).then(
    (buffer) => {
      musicPending = false;
      if (!armed || musicSource || musicElement || !musicGain) {
        return;
      }
      const source = audio.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.playbackRate.value = audioRate;
      source.connect(musicGain);
      source.start();
      musicSource = source;
      if (first) {
        console.log("[journeyman:sfx] music started", audio.state);
      }
    },
    (error: unknown) => {
      musicPending = false;
      console.error("[journeyman:sfx] gapless music failed", error);
      startElementMusic(first);
    },
  );
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

/** THE VISIT SCREEN HOLDS THE SONG UNTIL CONTINUE. */
export function setAudioBlocked(blocked: boolean) {
  audioBlocked = blocked;
}

/** START THE LOOP ON THE FIRST GESTURE. A LATER CALL DOES NOT REWIND IT. */
export function armAudio() {
  hydrate();
  if (typeof window === "undefined" || audioBlocked) {
    return;
  }
  const first = !armed;
  armed = true;
  ensureWalking();
  startMusic(first);
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
  if (musicGain) {
    musicGain.gain.value = musicVolume;
  }
  if (musicElement) {
    musicElement.volume = musicVolume;
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

/** SPEED THE SONG AND THE WALK LOOP. ONE-SHOT CLIPS STAY AT NORMAL PITCH. */
export function setAudioRate(next: number) {
  audioRate = next;
  if (walking) {
    walking.playbackRate = next;
  }
  if (musicElement) {
    musicElement.playbackRate = next;
  }
  if (musicSource) {
    musicSource.playbackRate.value = next;
  }
  console.log("[journeyman:sfx] rate", next);
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
  ensureWalking();
  syncWalking();
}

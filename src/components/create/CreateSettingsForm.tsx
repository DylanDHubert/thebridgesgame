"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { storeLevelThumb } from "@/app/actions/levelThumb";
import { useAuth } from "@/components/auth/AuthProvider";
import { MapPreview } from "@/components/game/MapPreview";
import type { StillGrab } from "@/components/game/GameBoard";
import { HairlineButton, HairlineRow } from "@/components/ui/hairline";
import { perfectBridgeCost } from "@/lib/game/perfectScore";
import { stillPngBase64 } from "@/lib/rendering/stillPng";
import { savePlayerLevel } from "@/lib/supabase/scores";
import { randomArchipelagoName } from "@/lib/game/archipelagoNames";
import {
  CREATE_FIXED_GRID,
  createViewSearchParams,
  DEFAULT_CREATE_CONFIG,
  loadCreateConfig,
  normalizeCreateConfig,
  saveCreateConfig,
  type CreateGenerationConfig,
} from "@/lib/game/createConfig";
import { generateLevel } from "@/lib/game/level/generateLevel";
import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";

const PREVIEW_DELAY_MS = 120;

/** HOLD THE LAST VALUE UNTIL THE SLIDER SETTLES, THEN REDRAW THE MAP */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: Omit<SliderProps, "hint">) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-3 text-[10px] uppercase tracking-[0.14em]">
        <span>{label}</span>
        <span className="font-mono">
          {value.toFixed(3).replace(/\.?0+$/, "")}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="hairline-slider"
      />
    </label>
  );
}

function randomCreateSeed(): string {
  const rng = mulberry32(hashStringToSeed(`${Date.now()}`));
  return randomArchipelagoName(rng);
}

export function CreateSettingsForm() {
  const router = useRouter();
  const auth = useAuth();
  const [draft, setDraft] = useState<CreateGenerationConfig>(DEFAULT_CREATE_CONFIG);
  const [seed, setSeed] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(loadCreateConfig());
    setSeed(randomCreateSeed());
  }, []);

  const updateNoise = useCallback(
    (patch: Partial<CreateGenerationConfig["noise"]>) => {
      setDraft((current) =>
        normalizeCreateConfig({
          ...current,
          noise: { ...current.noise, ...patch },
        }),
      );
    },
    [],
  );

  const handleGenerate = useCallback(() => {
    const normalized = normalizeCreateConfig(draft);
    saveCreateConfig(normalized);
    const nextSeed = seed.trim() || randomCreateSeed();
    const params = createViewSearchParams(nextSeed, normalized);
    router.push(`/create/view?${params.toString()}`);
  }, [draft, router, seed]);

  const handleRerollSeed = useCallback(() => {
    setSeed(randomCreateSeed());
  }, []);

  const handleReset = useCallback(() => {
    setDraft(DEFAULT_CREATE_CONFIG);
    setSeed(randomCreateSeed());
  }, []);

  const stillRef = useRef<StillGrab | null>(null);

  const previewSeed = useDebouncedValue(seed.trim(), PREVIEW_DELAY_MS);
  const previewDraft = useDebouncedValue(draft, PREVIEW_DELAY_MS);
  const preview = useMemo(() => {
    if (!previewSeed) {
      return null;
    }
    return generateLevel({ seed: previewSeed, config: previewDraft });
  }, [previewDraft, previewSeed]);

  const handleSave = useCallback(async () => {
    const normalized = normalizeCreateConfig(draft);
    const nextSeed = seed.trim() || randomCreateSeed();
    const level = generateLevel({ seed: nextSeed, config: normalized });
    setSaving(true);
    setNote(null);
    const solver = perfectBridgeCost(level);
    const result = await savePlayerLevel(level, auth.userId, auth.accessToken, solver);
    if (result.ok && preview?.id === level.id) {
      const still = await stillRef.current?.();
      if (still) {
        await storeLevelThumb(level.id, await stillPngBase64(still));
      }
    }
    setNote(result.ok ? `Saved ${level.name}` : (result.error ?? "Save failed"));
    setSaving(false);
  }, [auth.accessToken, auth.userId, draft, preview, seed]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col-reverse gap-3 lg:flex-row">
      <div className="flex min-h-0 w-full max-h-full flex-1 flex-col overflow-hidden border border-black bg-white lg:w-[28rem] lg:flex-none">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-1 text-center">
          <p className="text-[8px] uppercase tracking-[0.28em] text-black/55">
            Workshop
          </p>
          <h2 className="text-[11px] uppercase tracking-[0.16em]">
            Archipelago settings
          </h2>
          <p className="pt-1 text-[8px] uppercase tracking-[0.16em] text-black/55">
            Grid {CREATE_FIXED_GRID.cols}×{CREATE_FIXED_GRID.rows}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-center text-[8px] uppercase tracking-[0.22em] text-black/55">
            Shape
          </p>
          <div className="space-y-3">
            <SliderField
              label="Sea level"
              value={draft.noise.landThreshold}
              min={-0.2}
              max={0.35}
              step={0.01}
              onChange={(value) => updateNoise({ landThreshold: value })}
            />
            <SliderField
              label="Edge water"
              value={draft.noise.falloffStrength}
              min={0}
              max={0.8}
              step={0.01}
              onChange={(value) => updateNoise({ falloffStrength: value })}
            />
            <SliderField
              label="Reach"
              value={draft.noise.falloffRadius}
              min={0.4}
              max={1}
              step={0.01}
              onChange={(value) => updateNoise({ falloffRadius: value })}
            />
            <SliderField
              label="Detail"
              value={draft.noise.octave1Scale}
              min={0.03}
              max={0.2}
              step={0.005}
              onChange={(value) => updateNoise({ octave1Scale: value })}
            />
            <SliderField
              label="Ridges"
              value={draft.noise.octave2Weight}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => updateNoise({ octave2Weight: value })}
            />
            <SliderField
              label="Speckles"
              value={draft.noise.octave3Weight}
              min={0}
              max={0.6}
              step={0.05}
              onChange={(value) => updateNoise({ octave3Weight: value })}
            />
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-[10px] uppercase tracking-[0.14em]">
          Name
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              className="min-w-0 flex-1 border border-black bg-white px-2.5 py-2 font-mono text-[10px] normal-case tracking-normal text-black focus:outline-none"
            />
            <HairlineButton type="button" onClick={handleRerollSeed}>
              Reroll
            </HairlineButton>
          </div>
        </label>
      </div>

      <div className="shrink-0 border-t border-black px-4 py-4 sm:px-5">
        <HairlineRow>
          <HairlineButton type="button" onClick={handleGenerate}>
            Edit
          </HairlineButton>
          <HairlineButton type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </HairlineButton>
          <HairlineButton type="button" onClick={handleReset}>
            Reset
          </HairlineButton>
        </HairlineRow>
        {note ? (
          <p className="pt-3 text-center text-[10px] uppercase tracking-[0.14em]">{note}</p>
        ) : null}
      </div>
      </div>
      <div className="h-full min-h-0 min-w-0 flex-1" role="region" aria-label="Map preview">
        {preview ? (
          <MapPreview level={preview} stillRef={stillRef} creatures={false} />
        ) : (
          <div className="h-full w-full border border-black bg-[rgb(12_48_92)]" />
        )}
      </div>
    </div>
  );
}

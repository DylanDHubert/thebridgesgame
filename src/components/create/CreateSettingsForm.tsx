"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CREATE_FIXED_GRID,
  createViewSearchParams,
  DEFAULT_CREATE_CONFIG,
  loadCreateConfig,
  normalizeCreateConfig,
  saveCreateConfig,
  type CreateGenerationConfig,
} from "@/lib/game/createConfig";
import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";
import {
  WoodButton,
  WoodControlRow,
  WOOD_SUB_SHADOW,
} from "@/components/ui/woodPlaque";

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
      <span className="flex items-baseline justify-between gap-3 text-[10px] uppercase tracking-[0.12em] text-[rgb(210_196_138)]">
        <span>{label}</span>
        <span className="font-mono text-[rgb(72_176_210)]">
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
        className="wood-slider"
      />
    </label>
  );
}

function randomCreateSeed(): string {
  const rng = mulberry32(hashStringToSeed(`${Date.now()}`));
  return `create-${Math.floor(rng() * 1_000_000_000)}`;
}

export function CreateSettingsForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<CreateGenerationConfig>(DEFAULT_CREATE_CONFIG);
  const [seed, setSeed] = useState("");

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

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden border-2 border-[rgb(74_44_20)] bg-[rgb(12_48_92)] shadow-[0_0_0_2px_rgb(42_28_16)]">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-1 text-center">
          <p
            className="text-[8px] font-medium uppercase tracking-[0.28em] text-[rgb(251_191_36)] sm:text-[9px]"
            style={{ textShadow: WOOD_SUB_SHADOW }}
          >
            Workshop
          </p>
          <h2 className="text-xs font-normal uppercase tracking-[0.14em] text-[rgb(210_196_138)] sm:text-sm">
            Archipelago settings
          </h2>
          <p className="pt-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(72_176_210)]">
            Grid {CREATE_FIXED_GRID.cols}×{CREATE_FIXED_GRID.rows}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-center text-[8px] font-medium uppercase tracking-[0.22em] text-[rgb(72_176_210)]">
            Noise
          </p>
          <div className="space-y-3">
            <SliderField
              label="Land threshold"
              value={draft.noise.landThreshold}
              min={-0.2}
              max={0.35}
              step={0.01}
              onChange={(value) => updateNoise({ landThreshold: value })}
            />
            <SliderField
              label="Edge falloff"
              value={draft.noise.falloffStrength}
              min={0}
              max={0.8}
              step={0.01}
              onChange={(value) => updateNoise({ falloffStrength: value })}
            />
            <SliderField
              label="Falloff radius"
              value={draft.noise.falloffRadius}
              min={0.4}
              max={1}
              step={0.01}
              onChange={(value) => updateNoise({ falloffRadius: value })}
            />
            <SliderField
              label="Octave 1 scale"
              value={draft.noise.octave1Scale}
              min={0.03}
              max={0.2}
              step={0.005}
              onChange={(value) => updateNoise({ octave1Scale: value })}
            />
            <SliderField
              label="Octave 2 weight"
              value={draft.noise.octave2Weight}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => updateNoise({ octave2Weight: value })}
            />
            <SliderField
              label="Octave 3 weight"
              value={draft.noise.octave3Weight}
              min={0}
              max={0.6}
              step={0.05}
              onChange={(value) => updateNoise({ octave3Weight: value })}
            />
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[rgb(210_196_138)]">
          Seed
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              className="min-w-0 flex-1 border border-[rgb(95_84_74)] bg-[rgb(28_48_78)] px-2.5 py-2 font-mono text-[10px] normal-case tracking-normal text-[rgb(210_196_138)] focus:border-[rgb(210_196_138)] focus:outline-none"
            />
            <WoodButton type="button" onClick={handleRerollSeed}>
              Reroll
            </WoodButton>
          </div>
        </label>
      </div>

      <div className="shrink-0 border-t border-[rgb(74_44_20)] px-4 py-4 sm:px-5">
        <WoodControlRow>
          <WoodButton type="button" size="md" onClick={handleGenerate}>
            Generate archipelago
          </WoodButton>
          <WoodButton type="button" size="md" onClick={handleReset}>
            Reset
          </WoodButton>
        </WoodControlRow>
      </div>
    </div>
  );
}

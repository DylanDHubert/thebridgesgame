import { redirect } from "next/navigation";

import { DraftPuzzleView } from "@/components/create/DraftPuzzleView";
import { HairlineHeader } from "@/components/ui/hairline";
import {
  createConfigFromSearchParams,
  DEFAULT_CREATE_CONFIG,
  normalizeCreateConfig,
} from "@/lib/game/createConfig";
import { HOME_LEVEL_ID } from "@/lib/game/homeMap";
import { generateLevel } from "@/lib/game/level/generateLevel";
import { loadSavedLevel } from "@/lib/game/level/listLevels";

type CreateViewPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function CreateViewPage({ searchParams }: CreateViewPageProps) {
  const params = await searchParams;
  const levelId = params.level?.trim();

  if (levelId) {
    const level = await loadSavedLevel(levelId);
    if (!level) {
      redirect("/create");
    }
    return (
      <main className="flex h-dvh flex-col overflow-hidden">
        <HairlineHeader
          title="Create"
          subtitle={level.id === HOME_LEVEL_ID ? "Home map" : level.name}
          nav="create"
        />
        <div className="min-h-0 flex-1">
          <DraftPuzzleView level={level} homeMap={level.id === HOME_LEVEL_ID} />
        </div>
      </main>
    );
  }

  const seed = params.seed?.trim();
  if (!seed) {
    redirect("/create");
  }

  const config = normalizeCreateConfig(
    createConfigFromSearchParams(params) ?? DEFAULT_CREATE_CONFIG,
  );
  const level = generateLevel({ seed, config });

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <HairlineHeader title="Create" subtitle={level.name} nav="create" />
      <div className="min-h-0 flex-1">
        <DraftPuzzleView level={level} />
      </div>
    </main>
  );
}

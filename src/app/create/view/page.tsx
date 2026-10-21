import { redirect } from "next/navigation";

import { CreateEditor } from "@/components/create/DraftPuzzleView";
import { DEV_EDITOR } from "@/lib/devMode";
import {
  createConfigFromSearchParams,
  DEFAULT_CREATE_CONFIG,
  normalizeCreateConfig,
} from "@/lib/game/createConfig";
import { HOME_LEVEL_ID } from "@/lib/game/homeMap";
import { HOW_LEVEL_ID } from "@/lib/game/tutorialMap";
import { generateLevel } from "@/lib/game/level/generateLevel";
import { loadRemoteLevel } from "@/lib/supabase/scores";

type CreateViewPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function CreateViewPage({ searchParams }: CreateViewPageProps) {
  const params = await searchParams;
  const levelId = params.level?.trim();

  if (levelId) {
    if (!DEV_EDITOR) {
      redirect("/create");
    }
    const level = await loadRemoteLevel(levelId);
    if (!level || level.id === "loading") {
      redirect("/create");
    }
    const isHome = level.id === HOME_LEVEL_ID;
    const isTutorial = level.id === HOW_LEVEL_ID;
    if (!isHome && !isTutorial) {
      redirect("/create");
    }
    return (
      <main className="flex h-dvh flex-col overflow-hidden">
        <CreateEditor
          level={level}
          homeMap={isHome}
          tutorialMap={isTutorial}
          subtitle={isHome ? "Home map" : "Tutorial"}
        />
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
      <CreateEditor level={level} subtitle={level.name} />
    </main>
  );
}

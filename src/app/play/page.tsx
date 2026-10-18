import { LevelPicker } from "@/components/play/LevelPicker";
import { PlaySession } from "@/components/play/PlaySession";
import { WoodenHeader } from "@/components/home/WoodenHeader";
import { WoodLink } from "@/components/ui/woodPlaque";
import { listSavedLevels, loadSavedLevel } from "@/lib/game/level/listLevels";

type PlayPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const params = await searchParams;
  const levelId = params.level?.trim();

  if (levelId) {
    const level = await loadSavedLevel(levelId);
    if (!level) {
      return (
        <main className="flex h-dvh flex-col overflow-hidden">
          <WoodenHeader title="Play" subtitle="Level missing" nav="play" />
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-sm text-[rgb(210_196_138)]">
              Could not load level{" "}
              <code className="text-[rgb(72_176_210)]">{levelId}</code>.
            </p>
            <WoodLink href="/play">← Level select</WoodLink>
          </div>
        </main>
      );
    }

    return (
      <main className="h-dvh overflow-hidden">
        <PlaySession level={level} />
      </main>
    );
  }

  const levels = await listSavedLevels();

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <WoodenHeader title="Play" subtitle="Choose a level" nav="play" />
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-4 py-3 sm:px-6">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3">
          <LevelPicker levels={levels} />
        </div>
      </div>
    </main>
  );
}

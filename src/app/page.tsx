import { HomeScreen } from "@/components/home/HomeScreen";
import { HOME_LEVEL_ID } from "@/lib/game/homeMap";
import { loadSavedLevel } from "@/lib/game/level/listLevels";

export default async function HomePage() {
  const level = await loadSavedLevel(HOME_LEVEL_ID);
  if (!level) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-center">
        <p className="text-sm text-[rgb(210_196_138)]">
          Home map missing. Open Create → Edit home map, or add{" "}
          <code className="text-[rgb(72_176_210)]">public/levels/home.json</code>.
        </p>
      </main>
    );
  }

  return <HomeScreen level={level} />;
}

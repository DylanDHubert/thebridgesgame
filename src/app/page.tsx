import { HomeScreen } from "@/components/home/HomeScreen";
import { HairlineHeader } from "@/components/ui/hairline";
import { HOME_LEVEL_ID } from "@/lib/game/homeMap";
import { loadSavedLevel } from "@/lib/game/level/listLevels";

export default async function HomePage() {
  const level = await loadSavedLevel(HOME_LEVEL_ID);
  if (!level) {
    return (
      <main className="flex h-dvh flex-col overflow-hidden">
        <HairlineHeader title="Home" subtitle="The Bridges Game" nav="home" />
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.14em]">
            Home map missing. Open Create, then Edit home map.
          </p>
        </div>
      </main>
    );
  }

  return <HomeScreen level={level} />;
}

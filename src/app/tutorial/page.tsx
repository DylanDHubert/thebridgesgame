import { HowLesson } from "@/components/how/HowLesson";
import { HairlineHeader, HairlineLink } from "@/components/ui/hairline";
import { DEV_EDITOR } from "@/lib/devMode";
import { loadRemoteLevel } from "@/lib/supabase/scores";
import { HOW_LEVEL_ID } from "@/lib/game/tutorialMap";

/** THE BOAR TEACHES ON WHATEVER MAP IS SAVED AS THE TUTORIAL. */
export default async function TutorialPage() {
  const level = await loadRemoteLevel(HOW_LEVEL_ID);
  if (!level) {
    return (
      <main className="flex h-dvh flex-col overflow-hidden">
        <HairlineHeader nav="tutorial" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.14em]">
            Tutorial map missing.
          </p>
          {DEV_EDITOR ? (
            <HairlineLink href="/create/view?level=how">Edit tutorial</HairlineLink>
          ) : (
            <HairlineLink href="/">Home</HairlineLink>
          )}
        </div>
      </main>
    );
  }

  return <HowLesson level={level} />;
}

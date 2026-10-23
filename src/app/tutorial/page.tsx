import { HowLesson } from "@/components/how/HowLesson";
import { TUTORIAL_STEPS } from "@/lib/game/tutorialSteps";
import { loadRemoteLevel } from "@/lib/supabase/scores";

/** A SAVED EDIT REPLACES THAT STEP. OTHERWISE THE BUILT-IN BOARD. */
export default async function TutorialPage() {
  const saved = await Promise.all(TUTORIAL_STEPS.map((step) => loadRemoteLevel(step.id)));
  const levels = TUTORIAL_STEPS.map((step, index) => saved[index] ?? step.level);
  console.log(
    "[journeyman:tutorial] boards",
    TUTORIAL_STEPS.map((step, index) => ({
      step: step.number,
      source: saved[index] ? "saved" : "built-in",
      clicks: levels[index]?.clicks?.length ?? 0,
    })),
  );

  return <HowLesson levels={levels} />;
}

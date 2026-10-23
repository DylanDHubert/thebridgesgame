import { redirect } from "next/navigation";

import { CreateEditor } from "@/components/create/DraftPuzzleView";
import { DEV_EDITOR } from "@/lib/devMode";
import { tutorialStepByNumber } from "@/lib/game/tutorialSteps";
import { loadRemoteLevel } from "@/lib/supabase/scores";

type TutorialEditPageProps = {
  params: Promise<{ step: string }>;
};

/** DEV EDITOR FOR ONE LESSON. /tutorial/1 THROUGH /tutorial/5. */
export default async function TutorialEditPage({ params }: TutorialEditPageProps) {
  const { step: raw } = await params;
  const step = tutorialStepByNumber(Number(raw));
  if (!DEV_EDITOR || !step) {
    redirect("/tutorial");
  }

  const saved = await loadRemoteLevel(step.id);
  const level = saved ?? step.level;
  console.log("[journeyman:tutorial] edit", {
    step: step.number,
    source: saved ? "saved" : "built-in",
  });

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <CreateEditor level={level} tutorialMap subtitle={`${step.number} · ${step.name}`} />
    </main>
  );
}

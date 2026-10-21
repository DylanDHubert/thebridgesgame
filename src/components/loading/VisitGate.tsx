"use client";

import { useEffect, useState } from "react";

import { BoarRun } from "@/components/loading/LoadingScreen";
import { HairlineButton } from "@/components/ui/hairline";
import { armAudio, setAudioBlocked } from "@/lib/sound/bed";

const VISIT_KEY = "journeyman:visit";

/** ONCE EACH BROWSER SESSION. CONTINUE IS WHAT STARTS THE SONG. */
export function VisitGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(VISIT_KEY) === "1") {
      setAudioBlocked(false);
      return;
    }
    setAudioBlocked(true);
    setOpen(true);
  }, []);

  const onContinue = () => {
    window.sessionStorage.setItem(VISIT_KEY, "1");
    setAudioBlocked(false);
    setOpen(false);
    armAudio();
    console.log("[journeyman:sfx] visit continued");
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex min-h-dvh w-full flex-col items-center justify-center gap-5 bg-white text-black"
      role="dialog"
      aria-modal="true"
      aria-label="Continue"
    >
      <BoarRun />
      <HairlineButton autoFocus className="w-[184px]" onClick={onContinue}>
        Continue
      </HairlineButton>
    </div>
  );
}

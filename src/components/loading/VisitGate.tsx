"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BoarRun } from "@/components/loading/LoadingScreen";
import { HairlineButton } from "@/components/ui/hairline";
import { armAudio, setAudioBlocked } from "@/lib/sound/bed";

const VISIT_KEY = "journeyman:visit";

/** ONCE EACH BROWSER SESSION. CONTINUE IS WHAT STARTS THE SONG. */
export function VisitGate() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // THE SHARED CARD IS THE FIRST THING A FRIEND SHOULD SEE.
    if (pathname.startsWith("/share/")) {
      setAudioBlocked(false);
      setOpen(false);
      return;
    }
    if (window.sessionStorage.getItem(VISIT_KEY) === "1") {
      setAudioBlocked(false);
      return;
    }
    setAudioBlocked(true);
    setOpen(true);
  }, [pathname]);

  const begin = () => {
    window.sessionStorage.setItem(VISIT_KEY, "1");
    setAudioBlocked(false);
    setOpen(false);
    armAudio();
  };

  const onContinue = () => {
    begin();
    console.log("[journeyman:sfx] visit continued");
  };

  const onToday = () => {
    begin();
    console.log("[journeyman:sfx] visit today");
    router.push("/play?daily=1");
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
      <div className="flex flex-col items-center gap-2">
        <HairlineButton autoFocus className="w-[184px]" onClick={onContinue}>
          Continue
        </HairlineButton>
        <HairlineButton className="w-[184px]" onClick={onToday}>
          Today's level
        </HairlineButton>
      </div>
    </div>
  );
}

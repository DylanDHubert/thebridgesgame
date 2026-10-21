"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { LoadingScreen } from "@/components/loading/LoadingScreen";

const PassageContext = createContext<((href: string) => void) | null>(null);

/** HOW LONG A BROKEN NAVIGATION MAY KEEP THE BAR UP. */
const GIVE_UP_MS = 15000;
/** ONE SW RUN CYCLE, SO THE SCREEN DOES NOT FLASH. */
const HOLD_MS = 320;

/** SEND THE LOADING MARK UP UNTIL THE NEXT PAGE IS READY. */
export function useBoarPassage(): (href: string) => void {
  const depart = useContext(PassageContext);
  if (!depart) {
    throw new Error("Boar passage is missing");
  }
  return depart;
}

function here(): string {
  return window.location.pathname + window.location.search;
}

/** FULL-SCREEN LOADING MARK. HE STAYS UP WHILE THE PAGE IS STILL COMING. */
export function BoarPassage({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [target, setTarget] = useState<string | null>(null);
  const [trip, setTrip] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [held, setHeld] = useState(false);

  const depart = useCallback(
    (href: string) => {
      if (href === here()) {
        return;
      }
      setArrived(false);
      setHeld(false);
      setTrip((value) => value + 1);
      setTarget(href);
      console.log("[journeyman:load] running until", href);
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) {
        return;
      }
      const raw = anchor.getAttribute("href");
      if (!raw || raw.startsWith("#") || anchor.getAttribute("target") === "_blank") {
        return;
      }
      const url = new URL(raw, window.location.origin);
      if (url.origin !== window.location.origin) {
        return;
      }
      const next = url.pathname + url.search;
      if (next === here()) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      depart(next);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [depart]);

  useEffect(() => {
    if (!target) {
      return;
    }
    if (here() === target) {
      setArrived(true);
    }
  }, [pathname, target, trip]);

  useEffect(() => {
    if (!target) {
      return;
    }
    const giveUp = window.setTimeout(() => {
      if (here() !== target) {
        console.error("[journeyman:load] gave up waiting", target);
      }
      setTarget(null);
    }, GIVE_UP_MS);
    return () => window.clearTimeout(giveUp);
  }, [target, trip]);

  useEffect(() => {
    if (!target) {
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = reduced ? 0 : HOLD_MS;
    if (wait <= 0) {
      setHeld(true);
      return;
    }
    setHeld(false);
    const timer = window.setTimeout(() => setHeld(true), wait);
    return () => window.clearTimeout(timer);
  }, [target, trip]);

  useEffect(() => {
    if (target && arrived && held) {
      setTarget(null);
    }
  }, [target, arrived, held]);

  return (
    <PassageContext.Provider value={depart}>
      {children}
      {target ? (
        <div
          className="fixed inset-0 z-[70] bg-white"
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          <LoadingScreen />
        </div>
      ) : null}
    </PassageContext.Provider>
  );
}

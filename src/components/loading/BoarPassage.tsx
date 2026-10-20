"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { GameBoard } from "@/components/game/GameBoard";
import { GameStage } from "@/components/game/GameStage";
import {
  LOADING_LAP_MS,
  LOADING_LEVEL,
  LOADING_PATH,
} from "@/lib/game/loadingRing";

const PassageContext = createContext<((href: string) => void) | null>(null);

/** SEND THE BOAR AROUND THE RING, THEN OPEN THE PAGE. */
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

/** FULL-SCREEN LAP. LINKS AND depart() BOTH WAIT FOR THE WHOLE RUN. */
export function BoarPassage({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [target, setTarget] = useState<string | null>(null);
  const [lap, setLap] = useState(0);
  const [lapDone, setLapDone] = useState(false);
  const [arrived, setArrived] = useState(false);
  const bridges = useMemo(() => new Set<string>(), []);

  const depart = useCallback(
    (href: string) => {
      if (href === here()) {
        return;
      }
      setArrived(false);
      setLapDone(false);
      setLap((value) => value + 1);
      setTarget(href);
      console.log("[journeyman:load] ring", href, { wait: LOADING_LAP_MS });
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
  }, [pathname, target, lap]);

  useEffect(() => {
    if (!target) {
      return;
    }
    const timer = window.setTimeout(() => setLapDone(true), LOADING_LAP_MS);
    const giveUp = window.setTimeout(() => {
      if (here() !== target) {
        console.error("[journeyman:load] ring gave up", target);
      }
      setTarget(null);
    }, LOADING_LAP_MS + 8000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(giveUp);
    };
  }, [target, lap]);

  useEffect(() => {
    if (target && lapDone && arrived) {
      setTarget(null);
    }
  }, [target, lapDone, arrived]);

  return (
    <PassageContext.Provider value={depart}>
      {children}
      {target ? (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-white"
          role="status"
          aria-live="polite"
          aria-label="The boar is running the ring"
        >
          <div className="relative min-h-0 flex-1 p-4">
            <GameStage>
              <GameBoard
                key={lap}
                level={LOADING_LEVEL}
                bridges={bridges}
                pathKeys={bridges}
                runPath={LOADING_PATH}
                showMission={false}
                showBoar
                cells={false}
                interactive={false}
                sizing="contain"
                bleed
                alwaysAnimate
                boarLine="i run the ring. then we go."
              />
            </GameStage>
          </div>
        </div>
      ) : null}
    </PassageContext.Provider>
  );
}

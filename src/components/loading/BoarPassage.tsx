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
import { loadingLapMs, loadingRunPath } from "@/lib/game/loadingRing";
import { deserializeLevel } from "@/lib/game/level/serialize";
import type { Level, LevelFile } from "@/lib/game/level/types";

const PassageContext = createContext<((href: string) => void) | null>(null);

/** HOW LONG A BROKEN NAVIGATION MAY KEEP HIM RUNNING. */
const GIVE_UP_MS = 15000;

/** SEND HIM AROUND THE SQUARE UNTIL THE NEXT PAGE IS READY. */
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

async function fetchLoadingLevel(): Promise<Level | null> {
  try {
    const response = await fetch("/levels/loading.json");
    if (!response.ok) {
      console.error("[journeyman:load] missing loading level", response.status);
      return null;
    }
    const file = (await response.json()) as LevelFile;
    return deserializeLevel(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[journeyman:load] failed to read loading level", message);
    return null;
  }
}

/** FULL-SCREEN RUN. AT LEAST ONE LAP, AND HE STAYS OUT IF THE PAGE IS STILL COMING. */
export function BoarPassage({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [target, setTarget] = useState<string | null>(null);
  const [lap, setLap] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [lapDone, setLapDone] = useState(false);
  const [level, setLevel] = useState<Level | null>(null);
  const bridges = useMemo(() => new Set<string>(), []);
  const runPath = useMemo(() => (level ? loadingRunPath(level) : []), [level]);
  const lapMs = level ? loadingLapMs(level) : null;

  useEffect(() => {
    let cancel = false;
    void fetchLoadingLevel().then((next) => {
      if (!cancel && next) {
        setLevel(next);
      }
    });
    return () => {
      cancel = true;
    };
  }, []);

  const depart = useCallback(
    (href: string) => {
      if (href === here()) {
        return;
      }
      setArrived(false);
      setLapDone(false);
      setLap((value) => value + 1);
      setTarget(href);
      console.log("[journeyman:load] running until", href);
      router.push(href);
      void fetchLoadingLevel().then((next) => {
        if (next) {
          setLevel(next);
        }
      });
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
    const giveUp = window.setTimeout(() => {
      if (here() !== target) {
        console.error("[journeyman:load] gave up waiting", target);
      }
      setTarget(null);
    }, GIVE_UP_MS);
    return () => window.clearTimeout(giveUp);
  }, [target, lap]);

  useEffect(() => {
    if (!target || lapMs == null) {
      return;
    }
    if (lapMs <= 0) {
      setLapDone(true);
      return;
    }
    setLapDone(false);
    console.log("[journeyman:load] holding for one lap", lapMs);
    const timer = window.setTimeout(() => setLapDone(true), lapMs);
    return () => window.clearTimeout(timer);
  }, [target, lap, lapMs]);

  useEffect(() => {
    if (target && arrived && lapDone) {
      setTarget(null);
    }
  }, [target, arrived, lapDone]);

  return (
    <PassageContext.Provider value={depart}>
      {children}
      {target ? (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-white"
          role="status"
          aria-live="polite"
          aria-label="The boar is running until the page loads"
        >
          <div className="relative min-h-0 flex-1 p-4">
            {level ? (
              <GameStage>
                <GameBoard
                  key={lap}
                  level={level}
                  bridges={bridges}
                  pathKeys={bridges}
                  runPath={runPath}
                  showMission={false}
                  showBoar
                  cells={false}
                  interactive={false}
                  sizing="contain"
                  bleed
                  alwaysAnimate
                  boarLine="i run until the page is here."
                />
              </GameStage>
            ) : null}
          </div>
        </div>
      ) : null}
    </PassageContext.Provider>
  );
}

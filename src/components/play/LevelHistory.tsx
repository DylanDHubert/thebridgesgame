"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/components/auth/AuthProvider";
import { HairlineButton, HairlineLink, HairlineRow } from "@/components/ui/hairline";
import { SCORE_BANDS, scoreBand, scoreTitle } from "@/lib/game/par";
import { listLevelRuns, type LevelRun } from "@/lib/supabase/scores";

const COLS =
  "grid grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 px-3";

const HEAT = ["#e7e5e4", "#99f6e4", "#5eead4", "#2ec4b6", "#14b8a6", "#0f766e", "#115e59"];

function heatColor(share: number): string {
  if (share <= 0) {
    return HEAT[0]!;
  }
  const index = Math.min(HEAT.length - 1, Math.ceil(share * (HEAT.length - 1)));
  return HEAT[index]!;
}

function runDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "2-digit",
  }).format(date);
}

function SectionLabel({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-black px-3 py-1.5 text-[10px] uppercase tracking-[0.14em]">
      <h3>{title}</h3>
      <span>{detail}</span>
    </div>
  );
}

/** ONE BAR PER BAND. THE COUNT IS THE FIELD, NOT A LIST OF SCORES. */
function FieldChart({ costs, solver }: { costs: number[]; solver: number | null }) {
  if (costs.length === 0) {
    return (
      <p className="px-3 py-3 text-center text-[10px] uppercase tracking-[0.12em]">
        No one else yet
      </p>
    );
  }
  if (solver == null) {
    return (
      <p className="px-3 py-3 text-center text-[10px] uppercase tracking-[0.12em]">
        {costs.length} {costs.length === 1 ? "player" : "players"}
      </p>
    );
  }
  const counts = SCORE_BANDS.map(
    (band) => costs.filter((cost) => scoreBand(cost, solver) === band).length,
  );
  const peak = Math.max(...counts, 1);
  return (
    <ul className="flex flex-col px-3 py-2">
      {SCORE_BANDS.map((band, index) => {
        const count = counts[index] ?? 0;
        const width = count === 0 ? 0 : Math.max(8, (count / peak) * 100);
        return (
          <li
            key={band}
            className="grid grid-cols-[auto_minmax(0,1fr)_1.25rem] items-center gap-3 py-0.5 text-[10px] uppercase tracking-[0.08em]"
          >
            <span>{band}</span>
            <span className="h-1.5 bg-[#e7e5e4]">
              <span
                className="block h-full"
                style={{ width: `${width}%`, background: heatColor(count / costs.length) }}
              />
            </span>
            <span className="text-right tabular-nums">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** YOUR RUNS, THEN THE FIELD AS BANDS. FIVE ROWS SHOW BEFORE THE LIST SCROLLS. */
export function LevelHistory({
  levelId,
  name,
  solver,
  playHref,
  onClose,
}: {
  levelId: string;
  name: string;
  solver: number | null;
  playHref: string;
  onClose: () => void;
}) {
  const auth = useAuth();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [runs, setRuns] = useState<LevelRun[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!levelId) {
      setRuns([]);
      setReady(true);
      return;
    }
    let cancel = false;
    setReady(false);
    void listLevelRuns(levelId).then((loaded) => {
      if (cancel) {
        return;
      }
      setRuns(
        [...loaded].sort(
          (a, b) => a.cost - b.cost || a.createdAt.localeCompare(b.createdAt),
        ),
      );
      setReady(true);
    });
    return () => {
      cancel = true;
    };
  }, [levelId]);

  const mine =
    auth.userId == null ? [] : runs.filter((run) => run.playerId === auth.userId);
  const others = runs.filter((run) => run.first && run.playerId !== auth.userId);

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-white/80 px-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className="flex max-h-[80vh] w-full max-w-md flex-col border border-black bg-white outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-black px-3 py-2 text-center text-[11px] uppercase tracking-[0.16em]">
          <h2 className="truncate">{name}</h2>
        </header>
        {!ready ? (
          <p className="px-3 py-6 text-center text-[10px] uppercase tracking-[0.12em]">Loading</p>
        ) : (
          <div className="min-h-0 overflow-y-auto">
            <section>
              <SectionLabel
                title="Your rounds"
                detail={String(mine.length)}
              />
              {mine.length === 0 ? (
                <p className="px-3 py-3 text-center text-[10px] uppercase tracking-[0.12em]">
                  No rounds yet
                </p>
              ) : (
                <>
                  <div
                    className={`${COLS} h-6 border-b border-black text-[8px] uppercase tracking-[0.14em]`}
                  >
                    <span />
                    <span>Result</span>
                    <span>Score</span>
                    <span>Date</span>
                    <span className="text-right">Share</span>
                  </div>
                  <ol className="max-h-40 overflow-y-auto">
                    {mine.map((run, index) => {
                      const shareHref = `/share/${encodeURIComponent(levelId)}?name=${encodeURIComponent(run.username)}&score=${run.cost}`;
                      const result = solver == null ? "—" : scoreTitle(run.cost, solver);
                      return (
                        <li
                          key={`${run.createdAt}-${index}`}
                          className={`${COLS} h-8 border-b border-black text-[10px] uppercase tracking-[0.08em] last:border-b-0`}
                        >
                          {run.first ? (
                            <span className="inline-flex h-4 w-fit items-center bg-[#fbbf24] px-1 text-[8px] leading-none tracking-[0.12em]">
                              First
                            </span>
                          ) : (
                            <span />
                          )}
                          <span>{result}</span>
                          <span className="tabular-nums">{run.cost}</span>
                          <span className="truncate">{runDate(run.createdAt)}</span>
                          <Link
                            href={shareHref}
                            className="justify-self-end underline decoration-black underline-offset-2 hover:bg-[#fbbf24]"
                          >
                            Share
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}
            </section>
            <section className="border-t border-black">
              <SectionLabel
                title="Field"
                detail={`${others.length} ${others.length === 1 ? "player" : "players"}`}
              />
              <FieldChart costs={others.map((run) => run.cost)} solver={solver} />
            </section>
          </div>
        )}
        <div className="shrink-0 border-t border-black px-3 py-3">
          <HairlineRow>
            <HairlineLink href={playHref}>Play</HairlineLink>
            <HairlineButton onClick={onClose}>Close</HairlineButton>
          </HairlineRow>
        </div>
      </div>
    </div>,
    document.body,
  );
}

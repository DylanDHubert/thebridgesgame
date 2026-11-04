"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { HairlineButton } from "@/components/ui/hairline";

const LINK = "underline decoration-black underline-offset-2 hover:bg-[#fbbf24]";

/** WHO MADE THE GAME, THE SOUND, AND THE ART. */
export function CreditsDialog({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null);

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
        aria-label="Credits"
        className="flex w-full max-w-[22rem] flex-col gap-3 border border-black bg-white p-4 outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-[11px] uppercase tracking-[0.16em]">Credits</h2>
        <ul className="flex flex-col gap-2 text-[10px] uppercase leading-5 tracking-[0.12em]">
          <li>
            Developer:{" "}
            <a href="https://dylanhubert.me" target="_blank" rel="noreferrer" className={LINK}>
              Dylan Hubert
            </a>
          </li>
          <li>
            SFX:{" "}
            <a href="https://dylanhubert.me" target="_blank" rel="noreferrer" className={LINK}>
              Dylan Hubert
            </a>
          </li>
          <li>
            Main Art:{" "}
            <a
              href="https://scrabling.itch.io"
              target="_blank"
              rel="noreferrer"
              className={LINK}
            >
              Scrabling
            </a>
          </li>
          <li>
            Animal Sprites:{" "}
            <a
              href="https://masuone.itch.io"
              target="_blank"
              rel="noreferrer"
              className={LINK}
            >
              Masuone
            </a>
          </li>
          <li className="text-center">Coded with Cursor</li>
          <li className="text-center text-[#dc2626]">No AI art used</li>
        </ul>
        <HairlineButton onClick={onClose}>Close</HairlineButton>
      </div>
    </div>,
    document.body,
  );
}

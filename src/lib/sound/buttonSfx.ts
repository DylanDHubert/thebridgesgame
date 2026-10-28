"use client";

import { useEffect, useRef, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";

import { playSfx } from "@/lib/sound/bed";

type PressHandlers<T extends HTMLElement> = {
  onPointerDown?: (event: PointerEvent<T>) => void;
  onKeyDown?: (event: KeyboardEvent<T>) => void;
  onKeyUp?: (event: KeyboardEvent<T>) => void;
  onBlur?: (event: FocusEvent<T>) => void;
};

function blocked(node: HTMLElement): boolean {
  return node.matches(":disabled") || node.getAttribute("aria-disabled") === "true";
}

/** PRESS AND RELEASE FOR CHROME CONTROLS. A SLIDE-OFF STILL RELEASES. */
export function useButtonSfx<T extends HTMLElement>(kind: "button" | "link" = "button") {
  const held = useRef(false);
  const clearWatch = useRef<(() => void) | null>(null);

  const release = () => {
    clearWatch.current?.();
    clearWatch.current = null;
    if (!held.current) {
      return;
    }
    held.current = false;
    playSfx("buttonUp");
  };

  const press = () => {
    if (held.current) {
      return;
    }
    held.current = true;
    playSfx("buttonDown");
  };

  useEffect(() => () => release(), []);

  const accepts = (key: string) =>
    kind === "link" ? key === "Enter" : key === "Enter" || key === " ";

  return (extra?: PressHandlers<T>): PressHandlers<T> => ({
    onPointerDown: (event) => {
      extra?.onPointerDown?.(event);
      if (event.button !== 0 || blocked(event.currentTarget)) {
        return;
      }
      press();
      const pointerId = event.pointerId;
      const finish = (up: Event) => {
        if ("pointerId" in up && (up as globalThis.PointerEvent).pointerId !== pointerId) {
          return;
        }
        release();
      };
      clearWatch.current?.();
      window.addEventListener("pointerup", finish, true);
      window.addEventListener("pointercancel", finish, true);
      clearWatch.current = () => {
        window.removeEventListener("pointerup", finish, true);
        window.removeEventListener("pointercancel", finish, true);
      };
    },
    onKeyDown: (event) => {
      extra?.onKeyDown?.(event);
      if (
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        !accepts(event.key) ||
        blocked(event.currentTarget)
      ) {
        return;
      }
      press();
    },
    onKeyUp: (event) => {
      extra?.onKeyUp?.(event);
      if (accepts(event.key)) {
        release();
      }
    },
    onBlur: (event) => {
      extra?.onBlur?.(event);
      release();
    },
  });
}

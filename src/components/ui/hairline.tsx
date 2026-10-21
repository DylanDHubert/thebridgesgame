"use client";

import Link from "next/link";
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { AccountLink } from "@/components/auth/AccountLink";
import { useAuth } from "@/components/auth/AuthProvider";

const CONTROL =
  "inline-flex items-center justify-center border border-black bg-white px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white disabled:pointer-events-none disabled:opacity-40";

type HairlineButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed?: boolean;
};

/** TEXT BUTTON — ONE PIXEL RULE, INVERTS WHEN PRESSED */
export function HairlineButton({
  children,
  pressed,
  className = "",
  type = "button",
  ...rest
}: HairlineButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={[CONTROL, pressed ? "bg-black text-white" : "", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

type HairlineLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  pressed?: boolean;
  "aria-label"?: string;
};

/** LINK WITH THE SAME HAIRLINE RULE AS A BUTTON */
export function HairlineLink({
  href,
  children,
  className = "",
  pressed = false,
  "aria-label": ariaLabel,
}: HairlineLinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={pressed ? "page" : undefined}
      className={[CONTROL, pressed ? "bg-black text-white" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Link>
  );
}

/** WRAPPING ROW OF HAIRLINE CONTROLS */
export function HairlineRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>
  );
}

const NAV = [
  { id: "home", href: "/", label: "Home" },
  { id: "play", href: "/play", label: "Play" },
  { id: "calendar", href: "/play/calendar", label: "Calendar" },
  { id: "tutorial", href: "/tutorial", label: "Tutorial" },
  { id: "create", href: "/create", label: "Create" },
] as const;

/** ISLAND LABEL YELLOW. SELECTED IS BLACK; HOVER IS THIS YELLOW. */
const NAV_LINK = [
  "inline-flex items-center justify-center border border-black bg-white px-3 py-1.5",
  "text-[10px] uppercase tracking-[0.16em] text-black transition",
  "hover:bg-[#fbbf24] hover:text-black",
  "aria-[current=page]:bg-black aria-[current=page]:text-white",
  "aria-[current=page]:hover:bg-[#fbbf24] aria-[current=page]:hover:text-black",
].join(" ");

/** THIN BAR — GAME NAME ON THE LEFT, MENU ON THE RIGHT */
export function HairlineHeader({
  nav,
  playHref,
  menuOpen = false,
  menuLocked = false,
}: {
  title?: string;
  subtitle?: string;
  nav?: "home" | "play" | "calendar" | "tutorial" | "create";
  /** SAVED LEVEL. SHOWN ABOVE THE REST OF THE MENU. */
  playHref?: string | null;
  /** OPEN THE MENU. A LOCKED MENU STAYS UP. */
  menuOpen?: boolean;
  menuLocked?: boolean;
}) {
  const { userId } = useAuth();
  const [open, setOpen] = useState(menuOpen);
  const close = () => {
    if (menuLocked) {
      return;
    }
    setOpen(false);
  };

  useEffect(() => {
    if (menuOpen) {
      setOpen(true);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-black px-4 py-3 sm:px-6">
      <h1
        className="min-w-0 truncate text-[11px] tracking-[0.12em] text-[#fbbf24]"
        style={{
          textShadow:
            "1px 0 0 rgb(12 48 92), -1px 0 0 rgb(12 48 92), 0 1px 0 rgb(12 48 92), 0 -1px 0 rgb(12 48 92)",
        }}
      >
        The Bridges Game
      </h1>
      {userId ? (
        <button
          type="button"
          className={[NAV_LINK, open ? "bg-black text-white" : ""].filter(Boolean).join(" ")}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          Menu
        </button>
      ) : null}
      {open && userId
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-white/80 px-4"
              onClick={close}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Menu"
                className="flex w-full max-w-[22rem] flex-col gap-2 border border-black bg-white p-4"
                onClick={(event) => event.stopPropagation()}
              >
                {playHref ? (
                  <div className="border-b border-black pb-2">
                    <Link href={playHref} className={`${NAV_LINK} w-full`}>
                      Play level
                    </Link>
                  </div>
                ) : null}
                {NAV.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={nav === item.id ? "page" : undefined}
                    className={`${NAV_LINK} w-full`}
                    onClick={close}
                  >
                    {item.label}
                  </Link>
                ))}
                <AccountLink onDone={close} />
                {menuLocked ? null : (
                  <button type="button" className={`${NAV_LINK} w-full`} onClick={close}>
                    Close
                  </button>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}

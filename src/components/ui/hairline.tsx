import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

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

/** THIN BAR — GAME NAME ON THE LEFT, SECTION LINKS ON THE RIGHT */
export function HairlineHeader({
  nav,
}: {
  title?: string;
  subtitle?: string;
  nav?: "home" | "play" | "create";
}) {
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
      <nav className="flex shrink-0 items-center gap-2">
        {NAV.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={nav === item.id ? "page" : undefined}
            className={NAV_LINK}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

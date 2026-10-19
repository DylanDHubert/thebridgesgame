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
  "aria-label"?: string;
};

/** LINK WITH THE SAME HAIRLINE RULE AS A BUTTON */
export function HairlineLink({
  href,
  children,
  className = "",
  "aria-label": ariaLabel,
}: HairlineLinkProps) {
  return (
    <Link href={href} aria-label={ariaLabel} className={`${CONTROL} ${className}`}>
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

/** THIN BAR — TITLE ON THE LEFT, SECTION LINKS ON THE RIGHT */
export function HairlineHeader({
  title,
  subtitle,
  nav,
}: {
  title: string;
  subtitle?: string;
  nav?: "home" | "play" | "create";
}) {
  return (
    <header className="flex shrink-0 items-end justify-between gap-4 border-b border-black px-4 py-3 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-[11px] uppercase tracking-[0.22em]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 truncate text-[9px] uppercase tracking-[0.16em] text-black/55">
            {subtitle}
          </p>
        ) : null}
      </div>
      <nav className="flex shrink-0 gap-4 text-[10px] uppercase tracking-[0.18em]">
        {NAV.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={nav === item.id ? "page" : undefined}
            className={
              nav === item.id
                ? "underline decoration-1 underline-offset-4"
                : "hover:underline hover:decoration-1 hover:underline-offset-4"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

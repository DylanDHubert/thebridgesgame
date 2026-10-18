import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
} from "react";

/** SHARED WOOD PLAQUE LOOK — HEADER ARROWS, BUTTONS, FRAMES */
export const WOOD_PLAQUE_STYLE: CSSProperties = {
  background:
    "linear-gradient(180deg, rgb(198 142 78) 0%, rgb(168 118 62) 55%, rgb(138 92 48) 100%)",
  boxShadow:
    "inset 0 2px 0 rgb(222 176 112), inset 0 -3px 0 rgb(96 58 28), 0 0 0 3px rgb(74 44 20), 0 0 0 5px rgb(42 28 16)",
};

export const WOOD_TITLE_SHADOW =
  "2px 0 0 rgb(42 24 10), -2px 0 0 rgb(42 24 10), 0 2px 0 rgb(42 24 10), 0 -2px 0 rgb(42 24 10), 1px 1px 0 rgb(42 24 10)";

export const WOOD_SUB_SHADOW =
  "1px 0 0 rgb(42 24 10), -1px 0 0 rgb(42 24 10), 0 1px 0 rgb(42 24 10), 0 -1px 0 rgb(42 24 10)";

function PlaqueStuds({ compact = false }: { compact?: boolean }) {
  const stud = compact
    ? "absolute size-1 bg-[rgb(74_44_20)]"
    : "absolute size-1 bg-[rgb(74_44_20)] sm:size-1.5";
  const inset = { boxShadow: "inset 0 1px 0 rgb(206 158 96)" };
  return (
    <>
      <span
        aria-hidden
        className={`${stud} left-1 top-1 ${compact ? "" : "sm:left-1.5 sm:top-1.5"}`}
        style={inset}
      />
      <span
        aria-hidden
        className={`${stud} right-1 top-1 ${compact ? "" : "sm:right-1.5 sm:top-1.5"}`}
        style={inset}
      />
      <span
        aria-hidden
        className={`${stud} bottom-1 left-1 ${compact ? "" : "sm:bottom-1.5 sm:left-1.5"}`}
        style={inset}
      />
      <span
        aria-hidden
        className={`${stud} bottom-1 right-1 ${compact ? "" : "sm:bottom-1.5 sm:right-1.5"}`}
        style={inset}
      />
    </>
  );
}

type WoodPlaqueProps = {
  children: ReactNode;
  className?: string;
  compact?: boolean;
  style?: CSSProperties;
};

/** STATIC WOOD SHELL — USE INSIDE LINKS/BUTTONS OR AS A FRAME */
export function WoodPlaque({
  children,
  className = "",
  compact = false,
  style,
}: WoodPlaqueProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{ ...WOOD_PLAQUE_STYLE, ...style }}
    >
      <PlaqueStuds compact={compact} />
      {children}
    </div>
  );
}

type WoodFrameProps = {
  children: ReactNode;
  className?: string;
  /** INNER PAD AROUND CONTENT (DEFAULT THIN BEZEL) */
  insetClassName?: string;
};

/** GAMEPLAY / PANEL FRAME — WOOD BEZEL, DEEP OCEAN WELL */
export function WoodFrame({
  children,
  className = "",
  insetClassName = "p-[3px]",
}: WoodFrameProps) {
  return (
    <WoodPlaque compact className={`min-h-0 min-w-0 ${insetClassName} ${className}`}>
      <div className="min-h-0 min-w-0 overflow-hidden bg-[rgb(12_48_92)]">
        {children}
      </div>
    </WoodPlaque>
  );
}

const LABEL_CLASS =
  "relative uppercase tracking-[0.12em] text-[rgb(251_191_36)]";

const SIZE_CLASS = {
  sm: "px-3 py-2 text-[8px] sm:px-3.5 sm:text-[9px]",
  md: "px-4 py-2.5 text-[9px] sm:px-5 sm:text-[10px]",
  icon: "flex size-11 items-center justify-center sm:size-12",
} as const;

/** ROW GAP CLEARS OUTER PLAQUE RINGS (3px + 5px) */
export const WOOD_CONTROL_GAP = "gap-3 sm:gap-4";

type WoodControlProps = {
  children: ReactNode;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  pressed?: boolean;
  compact?: boolean;
};

function woodControlClass({
  className = "",
  pressed,
}: {
  className?: string;
  pressed?: boolean;
}) {
  return [
    "group inline-flex shrink-0 items-center justify-center transition",
    "hover:brightness-110 active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-45",
    pressed ? "brightness-110" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

type WoodButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> &
  WoodControlProps;

/** ACTION BUTTON — WOOD PLAQUE + YELLOW PIXEL LABEL */
export function WoodButton({
  children,
  size = "sm",
  className = "",
  pressed,
  compact = size === "sm" || size === "icon",
  type = "button",
  ...rest
}: WoodButtonProps) {
  return (
    <button
      type={type}
      className={woodControlClass({ className, pressed })}
      aria-pressed={pressed}
      {...rest}
    >
      <WoodPlaque
        compact={compact}
        className={`inline-flex w-full items-center justify-center ${SIZE_CLASS[size]}`}
      >
        <span className={LABEL_CLASS} style={{ textShadow: WOOD_SUB_SHADOW }}>
          {children}
        </span>
      </WoodPlaque>
    </button>
  );
}

type WoodLinkProps = WoodControlProps & {
  href: string;
  "aria-label"?: string;
};

/** LINK STYLED AS WOOD BUTTON */
export function WoodLink({
  href,
  children,
  size = "sm",
  className = "",
  pressed,
  compact = size === "sm" || size === "icon",
  "aria-label": ariaLabel,
}: WoodLinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={woodControlClass({ className, pressed })}
    >
      <WoodPlaque
        compact={compact}
        className={`inline-flex w-full items-center justify-center ${SIZE_CLASS[size]}`}
      >
        <span className={LABEL_CLASS} style={{ textShadow: WOOD_SUB_SHADOW }}>
          {children}
        </span>
      </WoodPlaque>
    </Link>
  );
}

/** CENTERED / WRAPPING ROW WITH ROOM FOR PLAQUE SHADOWS */
export function WoodControlRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center ${WOOD_CONTROL_GAP} ${className}`}
    >
      {children}
    </div>
  );
}

/** 7×7 PIXEL CHEVRON */
export function PixelArrow({ direction }: { direction: "left" | "right" }) {
  const leftRows: number[][] = [
    [5],
    [4, 5],
    [3, 4],
    [2, 3],
    [3, 4],
    [4, 5],
    [5],
  ];
  const rightRows: number[][] = [
    [3],
    [3, 4],
    [4, 5],
    [5, 6],
    [4, 5],
    [3, 4],
    [3],
  ];
  const rows = direction === "left" ? leftRows : rightRows;

  return (
    <svg
      aria-hidden
      viewBox="0 0 7 7"
      width={18}
      height={18}
      className="sm:h-5 sm:w-5"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated" }}
    >
      {rows.map((cols, row) =>
        cols.map((col) => (
          <rect
            key={`${row}-${col}`}
            x={col - 1}
            y={row}
            width={1}
            height={1}
            fill="rgb(251 191 36)"
          />
        )),
      )}
    </svg>
  );
}

"use client";

const BOX = [
  "inline-flex aspect-square shrink-0 items-center justify-center p-1.5",
  "border border-black bg-white text-black",
  "hover:bg-[#fbbf24]",
].join(" ");

/** PIXEL GEAR. THE BUTTON STAYS SQUARE BESIDE A TEXT CONTROL. */
export function GearButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={BOX} aria-label="Settings" onClick={onClick}>
      <svg viewBox="0 0 14 14" className="h-4 w-4" aria-hidden>
        <path
          fill="currentColor"
          fillRule="evenodd"
          shapeRendering="crispEdges"
          d="M5 0h4v2h-4zM5 12h4v2h-4zM0 5h2v4H0zM12 5h2v4h-2zM2 2h2v2H2zM10 2h2v2h-2zM2 10h2v2H2zM10 10h2v2h-2zM4 4h6v6H4zM6 6h2v2H6z"
        />
      </svg>
    </button>
  );
}

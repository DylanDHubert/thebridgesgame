"use client";

import Link from "next/link";

import { useButtonSfx } from "@/lib/sound/buttonSfx";
import {
  PixelArrow,
  WoodPlaque,
  WOOD_SUB_SHADOW,
  WOOD_TITLE_SHADOW,
} from "@/components/ui/woodPlaque";

type WoodenHeaderProps = {
  title: string;
  subtitle?: string;
  /** SECTION KEY FOR ← / → BETWEEN HOME · PLAY · CREATE */
  nav?: "home" | "play" | "create";
};

const NAV_ORDER = ["home", "play", "create"] as const;
const NAV_HREF = {
  home: "/",
  play: "/play",
  create: "/create",
} as const;

function neighbors(current: (typeof NAV_ORDER)[number]) {
  const index = NAV_ORDER.indexOf(current);
  const prev = NAV_ORDER[(index + NAV_ORDER.length - 1) % NAV_ORDER.length];
  const next = NAV_ORDER[(index + 1) % NAV_ORDER.length];
  return { prev, next };
}

function NavArrowLink({
  href,
  label,
  direction,
}: {
  href: string;
  label: string;
  direction: "left" | "right";
}) {
  const press = useButtonSfx<HTMLAnchorElement>("link");
  return (
    <Link
      href={href}
      aria-label={label}
      className="group shrink-0 transition hover:brightness-110 active:translate-y-px"
      {...press()}
    >
      <WoodPlaque className="flex size-11 items-center justify-center sm:size-12" compact>
        <span className="drop-shadow-[1px_1px_0_rgb(42_24_10)]">
          <PixelArrow direction={direction} />
        </span>
      </WoodPlaque>
    </Link>
  );
}

/** TITLE BANNER — CLEAN BAR + WOODEN PLAQUE + ARROW NAV */
export function WoodenHeader({ title, subtitle, nav }: WoodenHeaderProps) {
  const links = nav ? neighbors(nav) : null;

  return (
    <header className="relative w-full shrink-0 border-b-2 border-[rgb(42_28_16)] bg-[rgb(28_48_78)] shadow-[0_4px_0_rgb(12_32_58)]">
      <div className="flex items-center justify-center gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5">
        {links ? (
          <NavArrowLink
            href={NAV_HREF[links.prev]}
            label={links.prev}
            direction="left"
          />
        ) : null}

        <WoodPlaque className="min-w-[min(100%,16rem)] max-w-md px-6 py-2.5 text-center sm:min-w-[22rem] sm:px-8 sm:py-3">
          <h1
            className="text-sm font-normal uppercase tracking-[0.1em] text-[rgb(251_191_36)] sm:text-base"
            style={{ textShadow: WOOD_TITLE_SHADOW }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className="mt-1 text-[7px] font-medium uppercase tracking-[0.22em] text-[rgb(251_191_36)] sm:text-[8px]"
              style={{ textShadow: WOOD_SUB_SHADOW }}
            >
              {subtitle}
            </p>
          ) : null}
        </WoodPlaque>

        {links ? (
          <NavArrowLink
            href={NAV_HREF[links.next]}
            label={links.next}
            direction="right"
          />
        ) : null}
      </div>
    </header>
  );
}

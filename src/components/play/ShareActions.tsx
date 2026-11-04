"use client";

import { useEffect, useState } from "react";

import { HairlineButton, HairlineLink, HairlineRow } from "@/components/ui/hairline";

/** COPY THE EMOJI LINE, HAND THE CARD OFF, OR OPEN THE ISLAND. ONE ROW. */
export function ShareActions({
  title,
  text,
  copyText,
  playHref,
}: {
  title: string;
  text: string;
  copyText?: string | null;
  playHref: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  const copy = () => {
    const line = copyText || text;
    void navigator.clipboard.writeText(line).then(() => {
      setCopied(true);
    });
  };

  const share = () => {
    void navigator.share({ title, text, url: window.location.href }).catch(() => {
      // THE SHEET WAS DISMISSED. THE CARD STAYS.
    });
  };

  return (
    <HairlineRow>
      <HairlineButton onClick={copy}>{copied ? "Copied" : "Copy"}</HairlineButton>
      {canShare ? <HairlineButton onClick={share}>Share</HairlineButton> : null}
      <HairlineLink href={playHref}>Play</HairlineLink>
    </HairlineRow>
  );
}

"use client";

import { useEffect, useState } from "react";

import { HairlineButton, HairlineLink, HairlineRow } from "@/components/ui/hairline";

/** COPY THE CARD, HAND IT OFF, OR OPEN THE ISLAND. ONE ROW. */
export function ShareActions({
  title,
  text,
  playHref,
}: {
  title: string;
  text: string;
  playHref: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canSend, setCanSend] = useState(false);

  useEffect(() => {
    setCanSend(typeof navigator.share === "function");
  }, []);

  const copy = () => {
    const url = window.location.href;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
    });
  };

  const send = () => {
    void navigator.share({ title, text, url: window.location.href }).catch(() => {
      // THE SHEET WAS DISMISSED. THE CARD STAYS.
    });
  };

  return (
    <HairlineRow>
      <HairlineButton onClick={copy}>{copied ? "Copied" : "Copy link"}</HairlineButton>
      {canSend ? <HairlineButton onClick={send}>Send</HairlineButton> : null}
      <HairlineLink href={playHref}>Play</HairlineLink>
    </HairlineRow>
  );
}

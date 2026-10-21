"use client";

import type { ReactNode } from "react";

import { HairlineHeader } from "@/components/ui/hairline";

export const AUTH_FIELD =
  "w-full border border-black bg-white px-2.5 py-2 text-[10px] uppercase tracking-[0.12em] text-black placeholder:text-black/40 focus:outline-none";

/** CENTERED LOGIN OR SIGN-UP PAGE. */
export function AuthForm({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <HairlineHeader />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4">
        <h2 className="text-center text-[11px] uppercase tracking-[0.16em]">{title}</h2>
        {children}
      </div>
    </main>
  );
}

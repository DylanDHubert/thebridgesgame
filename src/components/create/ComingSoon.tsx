import { BoarRun } from "@/components/loading/LoadingScreen";
import { HairlineHeader, HairlineLink } from "@/components/ui/hairline";

/** CREATE IS CLOSED OUTSIDE THE DEV SERVER. */
export function ComingSoon() {
  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-white">
      <HairlineHeader nav="create" />
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5"
        role="dialog"
        aria-modal="true"
        aria-label="Coming soon"
      >
        <BoarRun />
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#ef4444]">Coming soon</p>
        <HairlineLink href="/">Home</HairlineLink>
      </div>
    </main>
  );
}

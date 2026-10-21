import { CalendarMonth } from "@/components/play/CalendarMonth";
import { HairlineHeader } from "@/components/ui/hairline";

/** THIS MONTH IN UTC. A DAY OPENS THAT DAILY, INCLUDING ONES NOT BUILT YET. */
export default function CalendarPage() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <HairlineHeader title="Play" subtitle="Calendar" nav="calendar" />
      <CalendarMonth />
    </main>
  );
}

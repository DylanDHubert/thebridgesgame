import { ComingSoon } from "@/components/create/ComingSoon";
import { CreateSettingsForm } from "@/components/create/CreateSettingsForm";
import { HairlineHeader, HairlineLink, HairlineRow } from "@/components/ui/hairline";
import { CREATE_OPEN } from "@/lib/devMode";

export default function CreatePage() {
  if (!CREATE_OPEN) {
    console.log("[journeyman:create] coming soon");
    return <ComingSoon />;
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <HairlineHeader title="Create" subtitle="The Bridges Game" nav="create" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4 sm:px-6">
        <HairlineRow className="shrink-0 justify-center">
          <HairlineLink href="/create/view?level=home">Edit home map</HairlineLink>
          <HairlineLink href="/create/view?level=how">Edit tutorial</HairlineLink>
          <HairlineLink href="/create/view?level=loading">Edit loading</HairlineLink>
        </HairlineRow>
        <div className="min-h-0 flex-1 overflow-hidden">
          <CreateSettingsForm />
        </div>
      </div>
    </main>
  );
}

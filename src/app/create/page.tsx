import { CreateSettingsForm } from "@/components/create/CreateSettingsForm";
import { HairlineHeader, HairlineLink } from "@/components/ui/hairline";

export default function CreatePage() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <HairlineHeader title="Create" subtitle="The Bridges Game" nav="create" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4 sm:px-6">
        <div className="flex shrink-0 justify-center">
          <HairlineLink href="/create/view?level=home">Edit home map</HairlineLink>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <CreateSettingsForm />
        </div>
      </div>
    </main>
  );
}

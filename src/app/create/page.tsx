import { CreateSettingsForm } from "@/components/create/CreateSettingsForm";
import { HairlineHeader, HairlineLink } from "@/components/ui/hairline";

export default function CreatePage() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <HairlineHeader title="Create" subtitle="The Bridges Game" nav="create" />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-6">
        <div className="flex h-full max-h-[40rem] w-full max-w-md flex-col gap-4 sm:max-w-lg">
          <div className="flex shrink-0 justify-center pt-1">
            <HairlineLink href="/create/view?level=home">Edit home map</HairlineLink>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <CreateSettingsForm />
          </div>
        </div>
      </div>
    </main>
  );
}

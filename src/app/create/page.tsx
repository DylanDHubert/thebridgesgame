import { CreateSettingsForm } from "@/components/create/CreateSettingsForm";
import { WoodenHeader } from "@/components/home/WoodenHeader";
import { WoodLink } from "@/components/ui/woodPlaque";

export default function CreatePage() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <WoodenHeader title="Create" subtitle="the bridges game" nav="create" />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-6">
        <div className="flex h-full max-h-[40rem] w-full max-w-md flex-col gap-4 sm:max-w-lg">
          <div className="flex shrink-0 justify-center pt-1">
            <WoodLink href="/create/view?level=home">Edit home map →</WoodLink>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <CreateSettingsForm />
          </div>
        </div>
      </div>
    </main>
  );
}

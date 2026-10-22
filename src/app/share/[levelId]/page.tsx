import type { Metadata } from "next";

import { SharePoster } from "@/components/play/SharePoster";
import { HairlineHeader, HairlineLink } from "@/components/ui/hairline";
import { shareStory } from "@/lib/game/shareCopy";
import { levelThumbSrc, listScoreRows, loadShareLevel } from "@/lib/supabase/scores";

type SharePageProps = {
  params: Promise<{ levelId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

function cleanName(value: string | undefined): string {
  const name = (value ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 32);
  return name || "Boar";
}

function cleanScore(value: string | undefined): number | null {
  if (!value || !/^\d{1,4}$/.test(value)) {
    return null;
  }
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

async function roundFor(levelId: string, name: string, hinted: number | null) {
  const [level, rows] = await Promise.all([loadShareLevel(levelId), listScoreRows(levelId)]);
  const matched = rows.filter(
    (row) => row.username.trim().toLowerCase() === name.toLowerCase(),
  );
  const stored =
    matched.length > 0 ? Math.min(...matched.map((row) => row.cost)) : null;
  const score = stored ?? hinted;
  const costs = rows.map((row) => row.cost);
  if (score != null && stored == null) {
    costs.push(score);
  }
  return { level, score, costs };
}

export async function generateMetadata({
  params,
  searchParams,
}: SharePageProps): Promise<Metadata> {
  const { levelId } = await params;
  const query = await searchParams;
  if (!/^[a-z0-9-]+$/.test(levelId)) {
    return { title: "The Bridges Game" };
  }
  const name = cleanName(query.name);
  const { level, score, costs } = await roundFor(levelId, name, cleanScore(query.score));
  if (!level || score == null) {
    return { title: "The Bridges Game" };
  }
  const story = shareStory(score, level.solver, costs);
  const description = `${name} scored ${story.title} on ${level.name}. ${story.quip} ${story.place}`;
  const thumb = level.thumb ? levelThumbSrc(level.id, level.thumb) : null;
  return {
    title: `${name} · ${story.title} · ${level.name}`,
    description,
    openGraph: {
      title: `${name} · ${story.title}`,
      description,
      ...(thumb ? { images: [{ url: thumb, alt: level.name }] } : {}),
    },
  };
}

/** A PUBLIC CARD FOR ONE ROUND. LOGGED-OUT FRIENDS CAN OPEN IT. */
export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { levelId } = await params;
  const query = await searchParams;
  const name = cleanName(query.name);
  if (!/^[a-z0-9-]+$/.test(levelId)) {
    return (
      <main className="flex h-dvh flex-col overflow-hidden">
        <HairlineHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.14em]">That island is not on the map.</p>
          <HairlineLink href="/">Home</HairlineLink>
        </div>
      </main>
    );
  }
  const { level, score, costs } = await roundFor(levelId, name, cleanScore(query.score));
  console.log("[journeyman:share] card", {
    levelId,
    name,
    score,
    players: costs.length,
    found: level != null,
  });
  if (!level) {
    return (
      <main className="flex h-dvh flex-col overflow-hidden">
        <HairlineHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.14em]">That island is not on the map.</p>
          <HairlineLink href="/">Home</HairlineLink>
        </div>
      </main>
    );
  }
  const playHref =
    level.kind === "daily" && level.day
      ? `/play?daily=${level.day}`
      : `/play?level=${encodeURIComponent(level.id)}`;
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <HairlineHeader />
      <div className="min-h-0 flex-1 overflow-hidden">
        <SharePoster
          levelName={level.name}
          playerName={name}
          score={score}
          solver={level.solver}
          costs={costs}
          thumbUrl={level.thumb ? levelThumbSrc(level.id, level.thumb) : null}
          playHref={playHref}
        />
      </div>
    </main>
  );
}

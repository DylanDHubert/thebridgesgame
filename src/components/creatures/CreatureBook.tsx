"use client";

import { useEffect, useState } from "react";

import { HairlineHeader } from "@/components/ui/hairline";
import { readCreatureFinds } from "@/lib/game/creatureFinds";
import {
  blankLetters,
  creatureSprite,
  CREATURES,
  type Creature,
} from "@/lib/game/creatures";

function cardText(creature: Creature, blank: boolean): {
  name: string;
  sound: string;
  description: string;
} {
  if (!blank) {
    return {
      name: creature.name,
      sound: creature.sound,
      description: creature.description,
    };
  }
  return {
    name: blankLetters(creature.name),
    sound: blankLetters(creature.sound),
    description: blankLetters(creature.description),
  };
}

export function CreatureCard({ creature, blank }: { creature: Creature; blank: boolean }) {
  const text = cardText(creature, blank);
  const number = String(creature.id).padStart(2, "0");
  return (
    <article className="flex flex-col gap-2 border border-black bg-white p-3">
      <p className="text-[10px] tracking-[0.16em] text-black/55">{number}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={creatureSprite(creature)}
        alt={blank ? "" : creature.name}
        width={96}
        height={96}
        className="mx-auto h-24 w-24"
        style={{
          imageRendering: "pixelated",
          filter: blank ? "brightness(0)" : undefined,
        }}
      />
      <h2 className="text-[11px] uppercase tracking-[0.14em]">{text.name}</h2>
      <p className="text-[10px] tracking-[0.12em] text-black/55">{text.sound}</p>
      <p className="text-[10px] leading-relaxed tracking-[0.04em]">{text.description}</p>
    </article>
  );
}

/** THE BOOK. A CARD FILLS IN WHEN THAT CREATURE IS UNLOCKED ON THIS BROWSER. */
export function CreatureBook() {
  const [unlocked, setUnlocked] = useState<Set<number>>(new Set());

  useEffect(() => {
    setUnlocked(new Set(readCreatureFinds().map((find) => find.id)));
  }, []);

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <HairlineHeader nav="creatures" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <h1 className="text-[11px] uppercase tracking-[0.18em]">
            Creatures {unlocked.size}/{CREATURES.length}
          </h1>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CREATURES.map((creature) => (
              <li key={creature.id}>
                <CreatureCard creature={creature} blank={!unlocked.has(creature.id)} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

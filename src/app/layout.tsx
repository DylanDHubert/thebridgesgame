import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";

import { BoarPassage } from "@/components/loading/BoarPassage";
import { VisitGate } from "@/components/loading/VisitGate";
import { SoundBed } from "@/components/sound/SoundBed";
import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "The Bridges Game",
  description:
    "Bridge the Isles — daily archipelago puzzles and island crafting.",
  icons: {
    icon: "/assets/sprites/tiles/wood_moss.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${pixelFont.variable} h-full`}>
      <body className={`${pixelFont.className} relative flex h-dvh flex-col overflow-hidden bg-white text-black`}>
        <SoundBed />
        <BoarPassage>{children}</BoarPassage>
        <VisitGate />
      </body>
    </html>
  );
}

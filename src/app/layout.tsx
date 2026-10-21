import type { Metadata, Viewport } from "next";
import { Press_Start_2P } from "next/font/google";

import { AuthGate } from "@/components/auth/AuthGate";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { BoarPassage } from "@/components/loading/BoarPassage";
import { VisitGate } from "@/components/loading/VisitGate";
import { SoundBed } from "@/components/sound/SoundBed";
import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

const TURQUOISE = "#2ec4b6";

export const viewport: Viewport = {
  themeColor: TURQUOISE,
};

export const metadata: Metadata = {
  title: "The Bridges Game",
  description:
    "Bridge the Isles — daily archipelago puzzles and island crafting.",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "32x32" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "The Bridges Game",
    description:
      "Bridge the Isles — daily archipelago puzzles and island crafting.",
    images: [
      {
        url: "/apple-touch-icon.png",
        width: 180,
        height: 180,
        alt: "A boar on turquoise",
      },
    ],
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
        <AuthProvider>
          <SoundBed />
          <BoarPassage>
            <AuthGate>{children}</AuthGate>
          </BoarPassage>
          <VisitGate />
        </AuthProvider>
      </body>
    </html>
  );
}

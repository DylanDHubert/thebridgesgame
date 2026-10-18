import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";

import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "the bridges game",
  description:
    "Bridge the Isles — daily archipelago puzzles and island crafting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${pixelFont.variable} h-full`}>
      <body className={`${pixelFont.className} app-backdrop relative flex h-dvh flex-col overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}

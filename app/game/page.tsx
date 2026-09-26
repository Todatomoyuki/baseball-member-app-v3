import type { Metadata, Viewport } from "next";
import { GamesPage } from "@/components/games/GamesPage";

export const metadata: Metadata = { title: "YG ミニゲーム", robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#141923", viewportFit: "cover" };

export default function GamePage() {
  return <GamesPage />;
}

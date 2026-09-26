import type { Metadata, Viewport } from "next";
import { ChinchiroPage } from "@/components/games/ChinchiroPage";

export const metadata: Metadata = { title: "川高の振れ！チンチロ！ | YG ミニゲーム", robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#141923", viewportFit: "cover" };

export default function KawatakaChinchiroPage() {
  return <ChinchiroPage />;
}

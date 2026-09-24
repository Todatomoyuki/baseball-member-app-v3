import type { Metadata, Viewport } from "next";
import { GotoWisdomPage } from "@/components/goto/GotoWisdomPage";

export const metadata: Metadata = {
  title: "後藤君のありがたいお話 | GOTO'S WORDS",
  description: "悩んでいるのか。なら、俺を押せ。後藤 竜冶が、今日のあなたに贈るひとこと。",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#070b13",
  viewportFit: "cover",
};

export default function GotoPage() {
  return <GotoWisdomPage />;
}

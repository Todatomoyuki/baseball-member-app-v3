import type { Metadata, Viewport } from "next";
import { PachinkoPage } from "@/components/pachi/PachinkoPage";

export const metadata: Metadata = {
  title: "YG NIGHT STADIUM | YGパチンコ",
  description: "その一球が、逆転を呼ぶ。闘志を燃やせ。",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#060c18", viewportFit: "cover" };

export default function PachiPage() {
  return <PachinkoPage />;
}

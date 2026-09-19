import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "YG | メンバー表", description: "打順と守備を並べて、草野球のメンバー表を作成。", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({children}:Readonly<{children: React.ReactNode}>){return <html lang="ja"><body>{children}</body></html>}

import type { ScheduleGame } from "@/lib/schedule";

export type ScheduleNameOptions = { title: string[]; opponent: string[]; location: string[] };

/** 取得済みのオーダー候補と予定の履歴を使い、検索用の追加通信を避ける。 */
export function scheduleNameOptions(
  games: ReadonlyArray<Pick<ScheduleGame, "title" | "opponent" | "location">>,
  existing: ScheduleNameOptions,
): ScheduleNameOptions {
  const names = (field: keyof ScheduleNameOptions) => [...new Set([
    ...existing[field], ...games.map((game) => game[field]),
  ].map((name) => name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
  return { title: names("title"), opponent: names("opponent"), location: names("location") };
}

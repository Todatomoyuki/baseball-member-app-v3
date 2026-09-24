"use client";

import { initialStatsData, type StatsData } from "@/lib/stats";
import { api } from "../lib/api";
import { useAutosavedData, type AutosavedDataSource, type DataSnapshot } from "./useAutosavedData";

const API_ERROR = "成績データを処理できませんでした。";

// Preserve partial writes: unrelated games are neither sent nor rewritten.
function saveStats(data: StatsData, revision: number, savedJson: string) {
  const previous = savedJson ? JSON.parse(savedJson) as StatsData : initialStatsData();
  const games = Object.fromEntries(
    Object.entries(data.games).filter(([key, game]) =>
      JSON.stringify(game) !== JSON.stringify(previous.games[key]),
    ),
  );
  const removedGames = Object.keys(previous.games).filter((key) => !Object.hasOwn(data.games, key));
  return api("/api/stats", "PUT", { data: { games }, removedGames, partial: true, revision }, API_ERROR);
}

const statsSource: AutosavedDataSource<StatsData> = {
  initialData: initialStatsData,
  load: () => api<DataSnapshot<StatsData>>("/api/stats", "GET", undefined, API_ERROR),
  save: saveStats,
  loadError: "成績データを読み込めませんでした。",
};

export function useStatsData() {
  return useAutosavedData(statsSource);
}

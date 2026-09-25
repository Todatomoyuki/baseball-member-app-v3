"use client";

import { useMemo, useState } from "react";
import { initialScheduleData, validateScheduleData, type ScheduleData, type ScheduleGame } from "@/lib/schedule";
import { api } from "../lib/api";
import { useAutosavedData, type AutosavedDataSource, type DataSnapshot } from "./useAutosavedData";

const API_ERROR = "スケジュールを処理できませんでした。";

const scheduleSource: AutosavedDataSource<ScheduleData> = {
  initialData: initialScheduleData,
  load: async () => {
    const snapshot = await api<DataSnapshot<ScheduleData>>("/api/schedule", "GET", undefined, API_ERROR);
    return { ...snapshot, data: validateScheduleData(snapshot.data) };
  },
  save: (data, revision) => api<{ revision: number }>(
    "/api/schedule", "PUT", { data, revision }, API_ERROR,
  ),
  loadError: "スケジュールを読み込めませんでした。",
};

export function useScheduleData() {
  const [loginGames, setLoginGames] = useState<ScheduleGame[] | null>(null);
  const source = useMemo<AutosavedDataSource<ScheduleData>>(() => ({
    ...scheduleSource,
    load: async () => {
      const snapshot = await scheduleSource.load();
      setLoginGames((current) => current ?? snapshot.data.games);
      return snapshot;
    },
  }), []);
  const schedule = useAutosavedData(source);
  return {
    ...schedule,
    loginGames,
    retrySave: () => {
      if (schedule.saveState === "error") schedule.edit((current) => current);
    },
  };
}

"use client";

import { initialEquipmentData, type EquipmentData } from "@/lib/equipment";
import { api } from "../lib/api";
import { useAutosavedData, type AutosavedDataSource, type DataSnapshot } from "./useAutosavedData";

const API_ERROR = "道具データを処理できませんでした。";
const equipmentSource: AutosavedDataSource<EquipmentData> = {
  initialData: initialEquipmentData,
  load: () => api<DataSnapshot<EquipmentData>>("/api/equipment", "GET", undefined, API_ERROR),
  save: (data, revision) => api("/api/equipment", "PUT", { data, revision }, API_ERROR),
  loadError: "道具データを読み込めませんでした。",
};

export function useEquipmentData() {
  return useAutosavedData(equipmentSource);
}

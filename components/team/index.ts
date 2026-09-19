/**
 * チーム機能の公開エントリ。
 * 外（app/ 配下など）からは基本的にここだけを import してください。
 */
export { TeamApp } from "./TeamApp";
export { EquipmentView } from "./equipment/EquipmentView";
export type {
  AppView,
  AuthState,
  DragKey,
  PlayerLocation,
  SaveState,
  TeamTab,
} from "./types";

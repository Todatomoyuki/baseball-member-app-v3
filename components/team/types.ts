/**
 * チーム機能全体で共有する型定義。
 * ドメインモデル（TeamData / Player / Position）は @/lib/model 側にあります。
 */

/** アプリランチャーで切り替える画面種別 */
export type AppView = "lineup" | "equipment" | "stats";

/** 画面内のタブ */
export type TeamTab = "order" | "players";

/** 保存状態 */
export type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

/** ログイン状態 */
export type AuthState = "loading" | "login" | "member-selection" | "ready";

/**
 * ドラッグ&ドロップの識別子。
 * dnd-kit の id は `${kind}:${key}` という文字列で組み立てます。
 *
 * - kind: "player"   … 選手の入れ替え。key は "slot:0" / "pitcher" / "bench:<id>" / "absent:<id>" / "bench-zone" / "absent-zone"
 * - kind: "position" … 守備位置の入れ替え。key は打順のインデックス（"0"〜"8"）
 * - kind: "order"    … 打順そのものの並べ替え。key は打順のインデックス
 */
export type DragKey = { kind: "player" | "position" | "order"; key: string };

/** 選手編集モーダルで扱う対象。"new" は新規登録 */
export type PlayerEditorTarget = import("@/lib/model").Player | "new" | null;

/** 選手が今どこにいるか */
export type PlayerLocation = "bench" | "absent" | "active";

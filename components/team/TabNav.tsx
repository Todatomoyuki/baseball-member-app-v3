"use client";
import { Check, GripVertical, Users } from "lucide-react";
import type { SaveState, TeamTab } from "./types";
import { SaveStateLabel } from "./common/SaveStateLabel";

/** タブ切り替え + 右端の保存ステータス表示 */
export function TabNav({
  tab,
  onChange,
  playerCount,
  saveState,
}: {
  tab: TeamTab;
  onChange: (tab: TeamTab) => void;
  playerCount: number;
  saveState: SaveState;
}) {
  const bad = saveState === "error" || saveState === "conflict";

  return (
    <nav className="tabs" aria-label="画面切替">
      <button
        className={tab === "order" ? "active" : ""}
        onClick={() => onChange("order")}
      >
        <GripVertical size={17} />
        オーダー
      </button>
      <button
        className={tab === "players" ? "active" : ""}
        onClick={() => onChange("players")}
      >
        <Users size={17} />
        登録選手
        <span className="count-badge">{playerCount}</span>
      </button>
      <span className={`save-status ${bad ? "bad" : ""}`} role="status">
        <SaveStateLabel state={saveState} />
      </span>
    </nav>
  );
}
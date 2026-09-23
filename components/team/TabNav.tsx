"use client";
import { useLayoutEffect, useRef } from "react";
import { BarChart3, BriefcaseBusiness, GripVertical, Users } from "lucide-react";
import type { AppView, SaveState, TeamTab } from "./types";
import { SaveStateLabel } from "./common/SaveStateLabel";

let savedScrollLeft = 0;

/** タブ切り替え + 右端の保存ステータス表示 */
export function TabNav({
  tab,
  appView,
  onChange,
  onViewChange,
  playerCount,
  saveState,
}: {
  tab: TeamTab;
  appView: AppView;
  onChange: (tab: TeamTab) => void;
  onViewChange: (view: AppView) => void;
  playerCount: number;
  saveState: SaveState;
}) {
  const bad = saveState === "error" || saveState === "conflict";
  const tabsRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (tabsRef.current) tabsRef.current.scrollLeft = savedScrollLeft;
  }, []);

  return (
    <div className="app-tabs-shell">
      <nav
        ref={tabsRef}
        className="tabs app-tabs"
        aria-label="画面切替"
        onScroll={(event) => {
          savedScrollLeft = event.currentTarget.scrollLeft;
        }}
      >
        <button
          className={appView === "lineup" && tab === "order" ? "active" : ""}
          onClick={() => {
            onViewChange("lineup");
            onChange("order");
          }}
        >
          <GripVertical size={16} />
          オーダー
        </button>
        <button
          className={appView === "lineup" && tab === "players" ? "active" : ""}
          onClick={() => {
            onViewChange("lineup");
            onChange("players");
          }}
        >
          <Users size={16} />
          登録
          <span className="count-badge">{playerCount}</span>
        </button>
        <button
          className={appView === "equipment" ? "active" : ""}
          onClick={() => onViewChange("equipment")}
        >
          <BriefcaseBusiness size={16} />
          道具管理
        </button>
        <button
          className={appView === "stats" ? "active" : ""}
          onClick={() => onViewChange("stats")}
        >
          <BarChart3 size={16} />
          成績
        </button>
      </nav>
      <span
        className={`save-status app-tabs-save-status ${bad ? "bad" : ""}`}
        role="status"
      >
        <SaveStateLabel state={saveState} />
      </span>
    </div>
  );
}

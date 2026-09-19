"use client";
import { Settings } from "lucide-react";
import { BrandButton } from "./common/BrandButton";

/** 画面最上部のヘッダー（ロゴ + 設定ボタン） */
export function TopBar({
  onBrandClick,
  onSettingsClick,
}: {
  onBrandClick: () => void;
  onSettingsClick: () => void;
}) {
  return (
    <header className="topbar">
      <BrandButton onClick={onBrandClick} />
      <div className="header-right">
        <span className="team-badge">チーム共有</span>
        <button
          className="icon-button"
          aria-label="設定"
          onClick={onSettingsClick}
        >
          <Settings size={21} />
        </button>
      </div>
    </header>
  );
}

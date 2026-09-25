"use client";
import { Settings, UserRound } from "lucide-react";
import { BrandButton } from "./common/BrandButton";

/** 画面最上部のヘッダー（ロゴ + 設定ボタン） */
export function TopBar({
  memberName,
  onBrandClick,
  onSettingsClick,
}: {
  memberName: string;
  onBrandClick: () => void;
  onSettingsClick: () => void;
}) {
  return (
    <header className="topbar">
      <BrandButton onClick={onBrandClick} />
      <div className="header-right">
        <span className="login-member" aria-label={`ログイン中: ${memberName}`} title={memberName}>
          <UserRound size={16} aria-hidden="true" />
          <span>{memberName}</span>
        </span>
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

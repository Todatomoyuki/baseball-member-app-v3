"use client";
import type { SaveState } from "./types";

/**
 * 通信エラーの表示バー。
 * 競合（409 = 他の端末が先に保存した）のときだけ「最新データを読み込む」ボタンを出します。
 */
export function ErrorBanner({
  message,
  saveState,
  onReload,
  onRetry,
}: {
  message: string;
  saveState: SaveState;
  onReload: () => void;
  onRetry: () => void;
}) {
  if (!message) return null;

  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {saveState === "conflict" ? (
        <button onClick={onReload}>最新データを読み込む</button>
      ) : (
        <button onClick={onRetry}>再試行</button>
      )}
    </div>
  );
}

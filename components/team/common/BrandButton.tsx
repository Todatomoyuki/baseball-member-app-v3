"use client";

/** 左上の「YG TEAM TOOLS」ロゴ。押すとアプリランチャー（メニュー）が開きます。 */
export function BrandButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="brand brand-button"
      onClick={onClick}
      aria-label="YGメニューを開く"
    >
      <span className="brand-mark">Y</span>
      <span>
        YG <small>TEAM TOOLS</small>
      </span>
    </button>
  );
}

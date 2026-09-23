"use client";
import { FileDown, Users } from "lucide-react";
import type { TeamTab } from "./types";

/** スマホ用の下部固定バー（タブ切替 + PDF 作成） */
export function MobileBottomBar({
  tab,
  onToggleTab,
  pdfBusy,
  onCreatePdf,
}: {
  tab: TeamTab;
  onToggleTab: () => void;
  pdfBusy: boolean;
  onCreatePdf: () => void;
}) {
  return (
    <div className="mobile-bottom">
      <button className="mobile-nav" onClick={onToggleTab}>
        <Users size={19} />
        {tab === "order" ? "登録情報" : "オーダー"}
      </button>
      <button className="primary" onClick={onCreatePdf} disabled={pdfBusy}>
        <FileDown size={18} />
        {pdfBusy ? "作成中…" : "メンバー表作成"}
      </button>
    </div>
  );
}

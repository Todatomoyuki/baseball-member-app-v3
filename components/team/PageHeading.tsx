"use client";
import { FileDown } from "lucide-react";

/** 「メンバー表をつくる」見出しと PDF 作成ボタン（PC 向け表示） */
export function PageHeading({
  teamName,
  pdfBusy,
  onCreatePdf,
}: {
  teamName: string;
  pdfBusy: boolean;
  onCreatePdf: () => void;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">GAME DAY</p>
        <h1>メンバー表をつくる</h1>
        <p>
          {teamName} <span className="heading-separator">/</span> 公式戦オーダー
        </p>
      </div>
      <button className="primary" onClick={onCreatePdf} disabled={pdfBusy}>
        <FileDown size={19} />
        {pdfBusy ? "PDFを作成中…" : "メンバー表作成"}
      </button>
    </div>
  );
}

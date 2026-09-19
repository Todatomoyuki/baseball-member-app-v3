"use client";
import { FileDown } from "lucide-react";
import { Modal } from "../common/Modal";

/** PDF の生成が終わったあとの保存 / 印刷モーダル */
export function PdfReadyModal({
  url,
  name,
  onClose,
}: {
  /** 空文字なら閉じている */
  url: string;
  name: string;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!url}
      onClose={onClose}
      title="メンバー表ができました"
      description="A4横・提出用2枚と空欄1枚です。"
    >
      <div className="pdf-ready">
        <FileDown size={42} />
        <p>{name}</p>
      </div>
      <a className="primary full" href={url} download={name}>
        <FileDown size={18} />
        PDFを保存
      </a>
      <a className="secondary full" href={url} target="_blank" rel="noreferrer">
        PDFを開く・印刷する
      </a>
      <p className="modal-description">
        スマホではPDFを開き、共有メニューから保存・印刷できます。
      </p>
    </Modal>
  );
}

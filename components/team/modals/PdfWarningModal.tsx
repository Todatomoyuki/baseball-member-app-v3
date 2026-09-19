"use client";
import { Modal } from "../common/Modal";

/** 未入力項目があるときに、そのまま出力するか確認するモーダル */
export function PdfWarningModal({
  warnings,
  onClose,
  onForceCreate,
  onBackToInput,
}: {
  /** null なら閉じている */
  warnings: string[] | null;
  onClose: () => void;
  onForceCreate: () => void;
  /** 閉じて試合情報パネルを開く */
  onBackToInput: () => void;
}) {
  return (
    <Modal
      open={warnings !== null}
      onClose={onClose}
      title="未入力の項目があります"
      description="内容を確認してからメンバー表を作成してください。"
    >
      <ul className="warning-list">
        {warnings?.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <button className="primary" onClick={onForceCreate}>
        空欄のままPDFを作成
      </button>
      <button className="secondary" onClick={onBackToInput}>
        入力に戻る
      </button>
    </Modal>
  );
}

"use client";
import { ClipboardList, Users } from "lucide-react";
import { Modal } from "../common/Modal";

/**
 * ロゴから開くアプリランチャー。
 * 機能を増やすときはここに項目を足していきます。
 */
export function AppMenuModal({
  open,
  onClose,
  onOpenLineup,
}: {
  open: boolean;
  onClose: () => void;
  onOpenLineup: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="YG チームメニュー"
      description="使用する機能を選択してください。"
    >
      <div className="app-launcher-grid">
        <button className="app-launcher-item active" onClick={onOpenLineup}>
          <ClipboardList size={26} />
          <strong>選手用ツール</strong>
          <small>成績・登録情報等</small>
        </button>

        <button className="app-launcher-item" aria-disabled>
          <Users size={26} />
          <strong>ホームページ</strong>
          <small></small>
        </button>

        <button className="app-launcher-item" aria-disabled>
          <Users size={26} />
          <strong>後藤君のありがたいお話</strong>
          <small></small>
        </button>
      </div>
    </Modal>
  );
}

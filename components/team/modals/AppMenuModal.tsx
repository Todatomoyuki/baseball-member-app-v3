"use client";
import { BarChart3, ClipboardList, Users, Wrench } from "lucide-react";
import { Modal } from "../common/Modal";

/**
 * ロゴから開くアプリランチャー。
 * 機能を増やすときはここに項目を足していきます。
 */
export function AppMenuModal({
  open,
  onClose,
  onOpenLineup,
  onOpenEquipment,
  onOpenRoster,
  onOpenStats,
}: {
  open: boolean;
  onClose: () => void;
  onOpenLineup: () => void;
  onOpenEquipment: () => void;
  onOpenRoster: () => void;
  onOpenStats: () => void;
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
          <strong>メンバー表作成</strong>
          <small>試合のオーダーを作成</small>
        </button>

        <button className="app-launcher-item" onClick={onOpenEquipment}>
          <Wrench size={26} />
          <strong>チーム道具管理</strong>
          <small>道具・個数・保管状況</small>
        </button>

        <button className="app-launcher-item" onClick={onOpenStats}>
          <BarChart3 size={26} />
          <strong>成績入力</strong>
          <small>打撃成績</small>
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

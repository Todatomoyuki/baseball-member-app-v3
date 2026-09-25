"use client";
import type { Player } from "@/lib/model";
import { Modal } from "../common/Modal";
import { PlayerEditorForm } from "../roster/PlayerEditorForm";
import type { PlayerEditorTarget, PlayerLocation } from "../types";

/**
 * 選手の登録 / 編集モーダル。
 * target が "new" なら新規、Player オブジェクトなら編集です。
 */
export function PlayerEditorModal({
  canEditLineup,
  target,
  bench,
  absent,
  onClose,
  onSave,
  onDelete,
  onToggleAbsent,
}: {
  canEditLineup: boolean;
  target: PlayerEditorTarget;
  bench: Player[];
  absent: Player[];
  onClose: () => void;
  onSave: (player: Player) => void;
  onDelete: (player: Player) => void;
  onToggleAbsent: (player: Player) => void;
}) {
  const editing = target !== "new" && target !== null ? target : undefined;

  const location: PlayerLocation | undefined = !editing
    ? undefined
    : absent.some((a) => a.id === editing.id)
      ? "absent"
      : bench.some((b) => b.id === editing.id)
        ? "bench"
        : "active";

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title={target === "new" ? "選手を登録" : "選手を編集"}
      description="登録内容はチームの全端末に反映されます。"
    >
      {target !== null && (
        <PlayerEditorForm
          // 対象が変わったらフォームの入力状態をリセットする
          key={editing ? editing.id : "new"}
          player={editing}
          location={location}
          onClose={onClose}
          onSave={onSave}
          onMove={editing && canEditLineup ? () => onToggleAbsent(editing) : undefined}
          onDelete={editing && canEditLineup ? () => onDelete(editing) : undefined}
        />
      )}
    </Modal>
  );
}

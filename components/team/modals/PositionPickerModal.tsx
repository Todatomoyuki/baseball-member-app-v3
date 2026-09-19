"use client";
import { POSITIONS, type TeamData, type Position } from "@/lib/model";
import { Modal } from "../common/Modal";

/**
 * 守備位置の変更モーダル。
 * 守備位置は「9 枠を選手同士で交換する」方式なので、
 * 選んだ守備位置を持っている選手と入れ替わります。
 *
 * 9 人制では DH を、DH 制では「投」を候補から外します。
 */
export function PositionPickerModal({
  index,
  data,
  onClose,
  onSelect,
}: {
  /** 対象の打順インデックス。null なら閉じている */
  index: number | null;
  data: TeamData;
  onClose: () => void;
  onSelect: (position: Position) => void;
}) {
  const current = index !== null ? data.slots[index].position : null;

  return (
    <Modal
      open={index !== null}
      onClose={onClose}
      title="守備位置を変更"
      description="選んだ守備の選手と守備位置を交換します。"
    >
      <div className="position-grid">
        {POSITIONS.filter((p) =>
          data.mode === "normal" ? p !== "DH" : p !== "投",
        ).map((p) => (
          <button
            key={p}
            className={`position ${current === p ? "selected" : ""}`}
            onClick={() => onSelect(p)}
          >
            {p}
          </button>
        ))}
      </div>
    </Modal>
  );
}

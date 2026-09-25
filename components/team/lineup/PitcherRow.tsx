"use client";
import { GripVertical } from "lucide-react";
import type { Player } from "@/lib/model";
import { DragButton } from "../dnd/DragButton";

/** DH 制のときだけ打順の下に表示される投手の行（守備は「投」で固定） */
export function PitcherRow({
  pitcher,
  readOnly,
  onPick,
}: {
  pitcher?: Player;
  readOnly: boolean;
  onPick: () => void;
}) {
  return (
    <div className="player-row pitcher-row">
      <span className="pitcher-label">投</span>
      <DragButton
        item={{ kind: "player", key: "pitcher" }}
        className={`player-slot ${!pitcher ? "empty" : ""}`}
        label={readOnly ? `DH制の投手 ${pitcher?.name ?? "未設定"}` : "DH制の投手を選択"}
        onClick={onPick}
        disabled={readOnly}
      >
        {!readOnly && <GripVertical size={16} />}
        <span className="player-name">{pitcher?.name ?? (readOnly ? "未設定" : "投手を選択")}</span>
        <span className="jersey">{pitcher ? `#${pitcher.number}` : readOnly ? "—" : "＋"}</span>
      </DragButton>
      <span className="position fixed-position">投</span>
    </div>
  );
}

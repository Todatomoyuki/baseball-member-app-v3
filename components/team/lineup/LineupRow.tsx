"use client";
import { GripVertical } from "lucide-react";
import type { Player, Position } from "@/lib/model";
import { DragButton } from "../dnd/DragButton";

/**
 * スターティングオーダーの 1 行。
 * 「打順」「選手」「守備」の 3 つがそれぞれ独立したドラッグ対象になっています。
 */
export function LineupRow({
  index,
  readOnly,
  position,
  player,
  onPickPlayer,
  onPickPosition,
}: {
  /** 0 始まりの打順インデックス */
  index: number;
  readOnly: boolean;
  position: Position;
  player?: Player;
  onPickPlayer: () => void;
  onPickPosition: () => void;
}) {
  return (
    <div className="player-row">
      <DragButton
        item={{ kind: "order", key: String(index) }}
        className="order-number"
        label={readOnly ? `${index + 1}番` : `${index + 1}番の打順を移動`}
        disabled={readOnly}
      >
        <span>{index + 1}</span>
        {!readOnly && <GripVertical size={12} />}
      </DragButton>

      <DragButton
        item={{ kind: "player", key: `slot:${index}` }}
        className={`player-slot ${!player ? "empty" : ""}`}
        label={`${index + 1}番 ${player?.name ?? (readOnly ? "未設定" : "選手を選択")}`}
        onClick={onPickPlayer}
        disabled={readOnly}
      >
        {!readOnly && <GripVertical size={16} />}
        <span className="player-name">{player?.name ?? (readOnly ? "未設定" : "選手を選択")}</span>
        <span className="jersey">{player ? `#${player.number}` : readOnly ? "—" : "＋"}</span>
      </DragButton>

      <DragButton
        item={{ kind: "position", key: String(index) }}
        className="position"
        label={`${index + 1}番の守備 ${position}`}
        onClick={onPickPosition}
        disabled={readOnly}
      >
        {position}
      </DragButton>
    </div>
  );
}

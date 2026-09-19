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
  position,
  player,
  onPickPlayer,
  onPickPosition,
}: {
  /** 0 始まりの打順インデックス */
  index: number;
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
        label={`${index + 1}番の打順を移動`}
      >
        <span>{index + 1}</span>
        <GripVertical size={12} />
      </DragButton>

      <DragButton
        item={{ kind: "player", key: `slot:${index}` }}
        className={`player-slot ${!player ? "empty" : ""}`}
        label={`${index + 1}番 ${player?.name ?? "選手を選択"}`}
        onClick={onPickPlayer}
      >
        <GripVertical size={16} />
        <span className="player-name">{player?.name ?? "選手を選択"}</span>
        <span className="jersey">{player ? `#${player.number}` : "＋"}</span>
      </DragButton>

      <DragButton
        item={{ kind: "position", key: String(index) }}
        className="position"
        label={`${index + 1}番の守備 ${position}`}
        onClick={onPickPosition}
      >
        {position}
      </DragButton>
    </div>
  );
}

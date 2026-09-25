"use client";
import { GripVertical, Plus, Users } from "lucide-react";
import type { Player } from "@/lib/model";
import { DragButton } from "../dnd/DragButton";
import { PlayerZone } from "../dnd/PlayerZone";

/** 登録できる選手の上限 */
export const MAX_PLAYERS = 30;

/** ベンチ（控え選手）エリア。ここへドロップするとスタメンから外れます。 */
export function BenchSection({
  bench,
  readOnly,
  totalPlayers,
  onEditPlayer,
  onAddPlayer,
}: {
  bench: Player[];
  readOnly: boolean;
  totalPlayers: number;
  onEditPlayer: (player: Player) => void;
  onAddPlayer: () => void;
}) {
  return (
    <>
      <div className="section-title bench-title">
        <span>ベンチ</span>
        <span>{bench.length}人</span>
      </div>
      <PlayerZone zone="bench" disabled={readOnly}>
        {bench.length ? (
          <div className="bench-grid">
            {bench.map((p) => (
              <DragButton
                key={p.id}
                item={{ kind: "player", key: `bench:${p.id}` }}
                className="bench-player"
                label={`控え ${p.name}`}
                onClick={() => onEditPlayer(p)}
                disabled={readOnly}
              >
                {!readOnly && <GripVertical size={15} />}
                <span>{p.name}</span>
                <span className="jersey">#{p.number}</span>
              </DragButton>
            ))}
          </div>
        ) : (
          <div className="empty-bench">
            <Users size={25} />
            <p>
              {readOnly
                ? "ベンチの選手はいません"
                : totalPlayers
                ? "ここに移動するとベンチに戻せます"
                : "選手を登録してオーダーを組みましょう"}
            </p>
          </div>
        )}
        {!readOnly && (
          <button
            className="add-player-link"
            onClick={onAddPlayer}
            disabled={totalPlayers >= MAX_PLAYERS}
          >
            <Plus size={16} />
            選手を登録{" "}
            <span>
              {totalPlayers}/{MAX_PLAYERS}
            </span>
          </button>
        )}
      </PlayerZone>
    </>
  );
}

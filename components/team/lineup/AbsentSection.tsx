"use client";
import { GripVertical } from "lucide-react";
import type { Player } from "@/lib/model";
import { DragButton } from "../dnd/DragButton";
import { PlayerZone } from "../dnd/PlayerZone";

/** 不参加エリア。その試合に来ない選手を置いておく場所です。 */
export function AbsentSection({
  absent,
  readOnly,
  onEditPlayer,
}: {
  absent: Player[];
  readOnly: boolean;
  onEditPlayer: (player: Player) => void;
}) {
  return (
    <>
      <div className="section-title absent-title">
        <span>不参加</span>
        <span>{absent.length}人</span>
      </div>
      <PlayerZone zone="absent" disabled={readOnly}>
        {absent.length ? (
          <div className="bench-grid">
            {absent.map((p) => (
              <DragButton
                key={p.id}
                item={{ kind: "player", key: `absent:${p.id}` }}
                className="bench-player"
                label={`不参加 ${p.name}`}
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
          <div className="empty-absent">{readOnly ? "不参加の選手はいません" : "来ない選手をここに移動"}</div>
        )}
      </PlayerZone>
    </>
  );
}

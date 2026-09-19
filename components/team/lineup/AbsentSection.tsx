"use client";
import { GripVertical } from "lucide-react";
import type { Player } from "@/lib/model";
import { DragButton } from "../dnd/DragButton";
import { PlayerZone } from "../dnd/PlayerZone";

/** 不参加エリア。その試合に来ない選手を置いておく場所です。 */
export function AbsentSection({
  absent,
  onEditPlayer,
}: {
  absent: Player[];
  onEditPlayer: (player: Player) => void;
}) {
  return (
    <>
      <div className="section-title absent-title">
        <span>不参加</span>
        <span>{absent.length}人</span>
      </div>
      <PlayerZone zone="absent">
        {absent.length ? (
          <div className="bench-grid">
            {absent.map((p) => (
              <DragButton
                key={p.id}
                item={{ kind: "player", key: `absent:${p.id}` }}
                className="bench-player"
                label={`不参加 ${p.name}`}
                onClick={() => onEditPlayer(p)}
              >
                <GripVertical size={15} />
                <span>{p.name}</span>
                <span className="jersey">#{p.number}</span>
              </DragButton>
            ))}
          </div>
        ) : (
          <div className="empty-absent">来ない選手をここに移動</div>
        )}
      </PlayerZone>
    </>
  );
}

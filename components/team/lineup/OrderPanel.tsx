"use client";
import { useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { changeMode, type Player, type TeamData } from "@/lib/model";
import { useLineupSensors } from "../hooks/useLineupSensors";
import { countActive, dragEndUpdater } from "../lib/lineup-actions";
import { AbsentSection } from "./AbsentSection";
import { BenchSection } from "./BenchSection";
import { LineupRow } from "./LineupRow";
import { PitcherRow } from "./PitcherRow";
import { GotoMoveDialog, type GotoMoveDestination } from "./GotoMoveDialog";

type PendingMove = {
  source: TeamData;
  destination: GotoMoveDestination;
  updater: (data: TeamData) => TeamData;
};

function playerDestination(data: TeamData, playerId: string): GotoMoveDestination {
  if (data.absentIds.includes(playerId)) return "absent";
  if (data.slots.some((slot) => slot.playerId === playerId) ||
    (data.mode === "dh" && data.pitcher === playerId)) return "starter";
  return "bench";
}

// A drag records slot keys, so do not replay it against a different lineup
// if a remote update arrives while the confirmation is open.
function movementKey(data: TeamData) {
  return JSON.stringify([
    data.mode, data.slots, data.pitcher, data.benchOrder, data.absentIds,
    data.players.map((player) => [player.id, player.number]),
  ]);
}

/**
 * オーダー編集の本体。DndContext はここに 1 つだけ置きます。
 *
 * collisionDetection をカスタムしているのがポイントで、
 * 「打順は打順とだけ」「守備は守備とだけ」入れ替わるように、
 * ドラッグ中の kind と一致するドロップ先だけを候補に残しています。
 */
export function OrderPanel({
  data,
  edit,
  bench,
  absent,
  onPickPlayer,
  onPickPosition,
  onEditPlayer,
  onAddPlayer,
}: {
  data: TeamData;
  edit: (fn: (d: TeamData) => TeamData) => void;
  bench: Player[];
  absent: Player[];
  /** target は "pitcher" または "slot:<index>" */
  onPickPlayer: (target: string) => void;
  onPickPosition: (index: number) => void;
  onEditPlayer: (player: Player) => void;
  onAddPlayer: () => void;
}) {
  const sensors = useLineupSensors();
  const activeCount = countActive(data);
  const capacity = data.mode === "dh" ? 10 : 9;
  const pitcher = data.players.find((p) => p.id === data.pitcher);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const warningOpen = pendingMove !== null && pendingMove.source === data;

  function confirmMove() {
    const move = pendingMove;
    setPendingMove(null);
    if (!move || move.source !== data) return;
    edit((current) => movementKey(current) === movementKey(move.source)
      ? move.updater(current)
      : current);
  }

  return (
    <section className="order-panel">
      <div className="order-toolbar">
        <h2>オーダー</h2>
        <select
          className="mode-select"
          aria-label="試合のルール"
          value={data.mode}
          onChange={(e) =>
            edit((d) => changeMode(d, e.target.value as "normal" | "dh", 9))
          }
        >
          <option value="normal">9人制</option>
          <option value="dh">DH制（10人）</option>
        </select>
      </div>

      <p className="drag-help">
        <GripVertical size={14} />
        打順・選手・守備はドラッグで入れ替え
      </p>

      <GotoMoveDialog
        open={warningOpen}
        destination={pendingMove?.destination ?? "starter"}
        onConfirm={confirmMove}
        onCancel={() => setPendingMove(null)}
      />

      <DndContext
        sensors={sensors}
        onDragEnd={(event) => {
          const updater = dragEndUpdater(event);
          if (!updater) return;
          const next = updater(structuredClone(data));
          const warningPlayer = data.players.find((player) =>
            player.number === "11" &&
            playerDestination(data, player.id) !== playerDestination(next, player.id),
          );
          if (warningPlayer) {
            setPendingMove({
              source: data,
              destination: playerDestination(next, warningPlayer.id),
              updater,
            });
            return;
          }
          edit(updater);
        }}
        collisionDetection={(args) =>
          closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter(
              (c) => c.data.current?.kind === args.active.data.current?.kind,
            ),
          })
        }
      >
        <div className="section-title">
          <span>スターティングオーダー</span>
          <span>
            {activeCount} / {capacity}
          </span>
        </div>
        <div className="column-labels">
          <span>打順</span>
          <span>選手 / 背番号</span>
          <span>守備</span>
        </div>

        <div className="lineup-list">
          {data.slots.map((slot, i) => (
            <LineupRow
              key={i}
              index={i}
              position={slot.position}
              player={data.players.find((p) => p.id === slot.playerId)}
              onPickPlayer={() => onPickPlayer(`slot:${i}`)}
              onPickPosition={() => onPickPosition(i)}
            />
          ))}
          {data.mode === "dh" && (
            <PitcherRow pitcher={pitcher} onPick={() => onPickPlayer("pitcher")} />
          )}
        </div>

        <BenchSection
          bench={bench}
          totalPlayers={data.players.length}
          onEditPlayer={onEditPlayer}
          onAddPlayer={onAddPlayer}
        />
        <AbsentSection absent={absent} onEditPlayer={onEditPlayer} />
      </DndContext>
    </section>
  );
}

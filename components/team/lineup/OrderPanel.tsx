"use client";
import { useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { AlertTriangle, GripVertical } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { changeMode, type Player, type TeamData } from "@/lib/model";
import { useLineupSensors } from "../hooks/useLineupSensors";
import { countActive, dragEndUpdater } from "../lib/lineup-actions";
import { AbsentSection } from "./AbsentSection";
import { BenchSection } from "./BenchSection";
import { LineupRow } from "./LineupRow";
import { PitcherRow } from "./PitcherRow";

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
  const [warningPlayerId, setWarningPlayerId] = useState<string | null>(null);
  const warningPlayer = warningPlayerId
    ? data.players.find((p) => p.id === warningPlayerId)
    : undefined;
  const warningOpen = Boolean(warningPlayer);

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

      <AlertDialog
        open={warningOpen}
        onOpenChange={(open) => {
          if (!open) setWarningPlayerId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-2 inline-flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="size-5" />
            </div>
            <AlertDialogTitle>注意</AlertDialogTitle>
            <AlertDialogDescription>
              スターティングオーダーに{warningPlayer ? `${warningPlayer.name}` : ""}がいます。<br />
              本当によろしいでしょうか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setWarningPlayerId(null)}
            >
              確認
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DndContext
        sensors={sensors}
        onDragEnd={(event) => {
          const updater = dragEndUpdater(event);
          if (updater) {
            edit(updater);

            const from = event.active.data.current as
              | { kind?: string; key?: string }
              | undefined;
            const to = event.over?.data.current as
              | { kind?: string; key?: string }
              | undefined;
            if (
              from?.kind === "player" &&
              (from.key?.startsWith("bench:") || from.key?.startsWith("absent:")) &&
              to?.kind === "player" &&
              (to.key === "pitcher" || to.key?.startsWith("slot:"))
            ) {
              const playerId = from.key.slice(from.key.indexOf(":") + 1);
              if (data.players.find((p) => p.id === playerId)?.number === "11") {
                setWarningPlayerId(playerId);
              }
            }
          }
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

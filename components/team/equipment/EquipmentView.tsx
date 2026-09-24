"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";

import { ChevronDown, GripVertical } from "lucide-react";

import type { Player } from "@/lib/model";
import type { EquipmentItem } from "@/lib/equipment";
import type { SaveState } from "../types";
import { GotoMoveDialog } from "../lineup/GotoMoveDialog";

import { LoadingState } from "../common/LoadingState";
import { useEquipmentData } from "../hooks/useEquipmentData";

type Props = {
  players: Player[];
  appNavigation?: ReactNode;
  onSaveStateChange?: (state: SaveState) => void;
};

/* =========================================================
   ドラッグできる道具
========================================================= */

function DraggableEquipmentItem({
  id,
  name,
  note,
}: {
  id: string;
  name: string;
  note: string;
}) {
  const { setNodeRef, listeners, attributes, isDragging, transform } = useDraggable({
    id: `equipment:${id}`,
    data: {
      type: "equipment",
      equipmentId: id,
    },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      className={`equipment-item ${isDragging ? "dragging" : ""}`}
      style={{
        transform: transform
          ? `translate3d(
              ${transform.x}px,
              ${transform.y}px,
              0
            )`
          : undefined,
      }}
    >
      <GripVertical size={16} />

      <span>
        <strong>{name}</strong>

        {note && <small className="equipment-note">{note}</small>}
      </span>
    </button>
  );
}

/* =========================================================
   道具を持っているメンバー
========================================================= */

function EquipmentMember({
  player,
  items,
}: {
  player: Player;
  items: EquipmentItem[];
}) {
  const [open, setOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `member:${player.id}`,
    data: {
      type: "member",
      playerId: player.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`equipment-member ${isOver ? "drop-over" : ""}`}
    >
      <button
        type="button"
        className="equipment-member-header"
        onClick={() => setOpen((current) => !current)}
      >
        <div>
          <strong>{player.name}</strong>
          <small>#{player.number}</small>
        </div>

        <div className="equipment-member-meta">
          <span className="count-badge">{items.length}個</span>

          <ChevronDown size={18} className={open ? "open" : ""} />
        </div>
      </button>

      {open && (
        <div className="equipment-items">
          {items.map((item) => (
            <DraggableEquipmentItem
              key={item.id}
              id={item.id}
              name={item.name}
              note={item.note}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   道具を持っていないメンバー
========================================================= */

function EmptyEquipmentMember({ player }: { player: Player }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `member:${player.id}`,
    data: {
      type: "member",
      playerId: player.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`equipment-empty-member ${isOver ? "drop-over" : ""}`}
    >
      <div>
        <strong>{player.name}</strong>
        <small>#{player.number}</small>
      </div>

      <span>ここへドロップ</span>
    </div>
  );
}

/* =========================================================
   メイン
========================================================= */

export function EquipmentView({
  players,
  appNavigation,
  onSaveStateChange,
}: Props) {
  const equipment = useEquipmentData();
  const [pendingGotoEquipment, setPendingGotoEquipment] = useState<{
    equipmentId: string;
    playerId: string;
  } | null>(null);

  function moveEquipment(equipmentId: string, playerId: string) {
    equipment.edit((current) => ({
      ...current,

      items: current.items.map((item) =>
        item.id === equipmentId
          ? {
              ...item,
              holderId: playerId,
            }
          : item,
      ),
    }));
  }

  useEffect(() => {
    onSaveStateChange?.(equipment.saveState);
  }, [equipment.saveState, onSaveStateChange]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 7,
      },
    }),

    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 10,
      },
    }),

    useSensor(KeyboardSensor),
  );

  /* -------------------------
     Loading
  ------------------------- */

  if (equipment.loading) {
    return <LoadingState label="道具データを読み込んでいます…" />;
  }

  /* -------------------------
     Error
  ------------------------- */

  if (equipment.error) {
    return (
      <section className="panel">
        <p>{equipment.error}</p>

        <button
          type="button"
          className="secondary"
          onClick={() => void equipment.load()}
        >
          再読み込み
        </button>
      </section>
    );
  }

  /* -------------------------
     Drag & Drop
  ------------------------- */

  function dragEnd(event: DragEndEvent) {
    const equipmentId = event.active.data.current?.equipmentId as
      string | undefined;

    const playerId = event.over?.data.current?.playerId as string | undefined;

    if (!equipmentId || !playerId) return;

    const destinationPlayer = players.find((player) => player.id === playerId);

    // 背番号11 = 後藤
    if (destinationPlayer?.number === "11") {
      setPendingGotoEquipment({
        equipmentId,
        playerId,
      });

      return;
    }

    moveEquipment(equipmentId, playerId);
  }

  /* -------------------------
     表示用データ
  ------------------------- */

  const memberEntries = players.map((player) => ({
    player,

    items: equipment.data.items.filter((item) => item.holderId === player.id),
  }));

  const holders = memberEntries.filter((entry) => entry.items.length > 0);

  const noEquipmentMembers = memberEntries.filter(
    (entry) => entry.items.length === 0,
  );

  /* =========================================================
     Render
  ========================================================= */

  return (
    <>
      {/* =========================
          見出し
      ========================= */}

      <div className="page-heading">
        <div>
          <p className="eyebrow">TEAM EQUIPMENT</p>

          <h1>チーム道具管理</h1>

          <p>チーム道具の担当・受け渡しを管理します。</p>
        </div>
      </div>

      {appNavigation}

      <section className="panel">
        <div className="section-title">
          <span>道具担当</span>

          <span>{equipment.data.items.length}点</span>
        </div>

        <p className="drag-help">
          <GripVertical size={14} />
          道具をつかんで担当者へ移動
        </p>

        <GotoMoveDialog
          open={pendingGotoEquipment !== null}
          destination="equipment"
          onConfirm={() => {
            const pending = pendingGotoEquipment;

            setPendingGotoEquipment(null);

            if (!pending) return;

            moveEquipment(pending.equipmentId, pending.playerId);
          }}
          onCancel={() => setPendingGotoEquipment(null)}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={dragEnd}
        >
          {/* 道具を持っている人 */}

          <div className="equipment-member-list">
            {holders.map(({ player, items }) => (
              <EquipmentMember key={player.id} player={player} items={items} />
            ))}
          </div>

          {/* 道具なし */}

          <div className="section-title absent-title">
            <span>道具なしメンバー</span>

            <span>{noEquipmentMembers.length}人</span>
          </div>

          <p className="equipment-drop-help">
            道具を渡したい選手へ そのままドロップ
          </p>

          <div className="equipment-empty-members">
            {noEquipmentMembers.map(({ player }) => (
              <EmptyEquipmentMember key={player.id} player={player} />
            ))}
          </div>
        </DndContext>
      </section>
    </>
  );
}

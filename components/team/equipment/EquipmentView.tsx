"use client";

import { useState } from "react";

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

import { LoadingState } from "../common/LoadingState";
import { useEquipmentData } from "../hooks/useEquipmentData";

import { EquipmentTabNav, type EquipmentTab } from "./EquipmentTabNav";
import { EquipmentList } from "./EquipmentList";
import { EquipmentEditorModal } from "../modals/EquipmentEditorModal";

type Props = {
  players: Player[];
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
  const drag = useDraggable({
    id: `equipment:${id}`,
    data: {
      type: "equipment",
      equipmentId: id,
    },
  });

  return (
    <button
      ref={drag.setNodeRef}
      {...drag.listeners}
      {...drag.attributes}
      type="button"
      className={`equipment-item ${drag.isDragging ? "dragging" : ""}`}
      style={{
        transform: drag.transform
          ? `translate3d(
              ${drag.transform.x}px,
              ${drag.transform.y}px,
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
  items: {
    id: string;
    name: string;
    holderId: string | null;
    note: string;
  }[];
}) {
  const [open, setOpen] = useState(false);

  const drop = useDroppable({
    id: `member:${player.id}`,
    data: {
      type: "member",
      playerId: player.id,
    },
  });

  return (
    <div
      ref={drop.setNodeRef}
      className={`equipment-member ${drop.isOver ? "drop-over" : ""}`}
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
  const drop = useDroppable({
    id: `member:${player.id}`,
    data: {
      type: "member",
      playerId: player.id,
    },
  });

  return (
    <div
      ref={drop.setNodeRef}
      className={`equipment-empty-member ${drop.isOver ? "drop-over" : ""}`}
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

export function EquipmentView({ players }: Props) {
  const equipment = useEquipmentData();

  const [tab, setTab] = useState<EquipmentTab>("assignment");

  /*
   * 道具一覧編集用
   * EquipmentListを作る次の工程で使用
   */
  const [editorId, setEditorId] = useState<string | "new" | null>(null);

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

  const editorTarget =
    editorId === "new"
      ? "new"
      : editorId
        ? (equipment.data.items.find((item) => item.id === editorId) ?? null)
        : null;

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

      {/* =========================
          タブ
      ========================= */}

      <EquipmentTabNav
        tab={tab}
        onChange={setTab}
        itemCount={equipment.data.items.length}
        saveState={equipment.saveState}
      />

      {/* =====================================================
          担当タブ
      ===================================================== */}

      {tab === "assignment" && (
        <section className="panel">
          <div className="section-title">
            <span>道具担当</span>

            <span>{equipment.data.items.length}点</span>
          </div>

          <p className="drag-help">
            <GripVertical size={14} />
            道具をつかんで担当者へ移動
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={dragEnd}
          >
            {/* 道具を持っている人 */}

            <div className="equipment-member-list">
              {holders.map(({ player, items }) => (
                <EquipmentMember
                  key={player.id}
                  player={player}
                  items={items}
                />
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
      )}

      {/* =====================================================
          道具一覧タブ
      ===================================================== */}

      {tab === "items" && (
        <EquipmentList
          items={equipment.data.items}
          players={players}
          onAdd={() => setEditorId("new")}
          onEdit={(item) => setEditorId(item.id)}
        />
      )}

      {/* editorIdは次にEditorModalで使う */}
      <EquipmentEditorModal
        target={editorTarget}
        players={players}
        onClose={() => setEditorId(null)}
        onSave={(item) => {
          equipment.edit((current) => {
            const exists = current.items.some(
              (currentItem) => currentItem.id === item.id,
            );

            return {
              ...current,

              items: exists
                ? current.items.map((currentItem) =>
                    currentItem.id === item.id ? item : currentItem,
                  )
                : [...current.items, item],
            };
          });
        }}
        onDelete={(item) => {
          equipment.edit((current) => ({
            ...current,

            items: current.items.filter(
              (currentItem) => currentItem.id !== item.id,
            ),
          }));
        }}
      />
    </>
  );
}

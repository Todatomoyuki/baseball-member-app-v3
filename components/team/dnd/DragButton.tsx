"use client";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import type { DragKey } from "../types";

/**
 * 「ドラッグもできるし、ドロップ先にもなるボタン」。
 * 打順・選手・守備位置の 3 種類すべてでこのコンポーネントを使い回します。
 *
 * クリックすると onClick（モーダルを開く）、
 * ドラッグすると入れ替え、という二役をひとつの要素が担います。
 */
export function DragButton({
  item,
  children,
  onClick,
  className = "",
  label,
  disabled = false,
}: {
  item: DragKey;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  /** スクリーンリーダー向けのラベル（必須） */
  label: string;
  disabled?: boolean;
}) {
  const id = `${item.kind}:${item.key}`;
  const drag = useDraggable({ id, data: item, disabled });
  const drop = useDroppable({ id, data: item, disabled });

  return (
    <button
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      {...drag.listeners}
      {...drag.attributes}
      type="button"
      onClick={onClick}
      className={`${className} drag-button ${drag.isDragging ? "dragging" : ""} ${
        drop.isOver ? "drop-over" : ""
      }`}
      aria-label={label}
      style={{
        transform: drag.transform
          ? `translate3d(${drag.transform.x}px,${drag.transform.y}px,0)`
          : undefined,
        zIndex: drag.isDragging ? 40 : undefined,
      }}
    >
      {children}
    </button>
  );
}

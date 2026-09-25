"use client";
import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

/**
 * ベンチ / 不参加のドロップ領域。
 * ここに選手を落とすと、スタメンから外れてそのゾーンへ移動します。
 */
export function PlayerZone({
  zone,
  children,
  disabled = false,
}: {
  zone: "bench" | "absent";
  children: ReactNode;
  disabled?: boolean;
}) {
  const key = `${zone}-zone`;
  const { setNodeRef, isOver } = useDroppable({
    id: `player:${key}`,
    data: { kind: "player", key },
    disabled,
  });

  return (
    <div ref={setNodeRef} className={`bench-zone ${isOver ? "drop-over" : ""}`}>
      {children}
    </div>
  );
}

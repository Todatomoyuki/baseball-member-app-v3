"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

/**
 * ベンチ / 不参加のドロップ領域。
 * ここに選手を落とすと、スタメンから外れてそのゾーンへ移動します。
 */
export function PlayerZone({
  zone,
  label,
  children,
  footer,
  empty = false,
  disabled = false,
}: {
  zone: "bench" | "absent";
  label: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  empty?: boolean;
  disabled?: boolean;
}) {
  const key = `${zone}-zone`;

  const {
    setNodeRef: setLabelRef,
    isOver: isLabelOver,
  } = useDroppable({
    id: `player:${zone}-label`,
    data: { kind: "player", key },
    disabled,
  });

  const {
    setNodeRef: setEmptyRef,
    isOver: isEmptyOver,
  } = useDroppable({
    id: `player:${zone}-empty`,
    data: { kind: "player", key },
    disabled: disabled || !empty,
  });

  const {
    setNodeRef: setFooterRef,
    isOver: isFooterOver,
  } = useDroppable({
    id: `player:${zone}-footer`,
    data: { kind: "player", key },
    disabled: disabled || !footer,
  });

  const isOver = isLabelOver || isEmptyOver || isFooterOver;

  return (
    <>
      <div ref={setLabelRef}>
        {label}
      </div>

      <div className={`bench-zone ${isOver ? "drop-over" : ""}`}>
        <div ref={setEmptyRef}>
          {children}
        </div>

        {footer && (
          <div ref={setFooterRef}>
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
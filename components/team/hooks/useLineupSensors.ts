"use client";
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

/**
 * オーダー用の dnd-kit センサー設定。
 *
 * - マウスは 7px 動かすまでドラッグ扱いにしない（クリックと両立させるため）
 * - タッチは 240ms の長押しで開始（スクロールと両立させるため）
 */
export function useLineupSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 240, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  );
}

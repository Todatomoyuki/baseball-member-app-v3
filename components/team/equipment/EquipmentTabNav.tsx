"use client";

import {
  GripVertical,
  Package,
} from "lucide-react";

import type { SaveState } from "../types";
import { SaveStateLabel } from "../common/SaveStateLabel";

export type EquipmentTab =
  | "assignment"
  | "items";

export function EquipmentTabNav({
  tab,
  onChange,
  itemCount,
  saveState,
}: {
  tab: EquipmentTab;
  onChange: (tab: EquipmentTab) => void;
  itemCount: number;
  saveState: SaveState;
}) {
  const bad =
    saveState === "error" ||
    saveState === "conflict";

  return (
    <nav
      className="tabs"
      aria-label="道具管理画面切替"
    >
      <button
        className={
          tab === "assignment"
            ? "active"
            : ""
        }
        onClick={() =>
          onChange("assignment")
        }
      >
        <GripVertical size={17} />
        担当
      </button>

      <button
        className={
          tab === "items"
            ? "active"
            : ""
        }
        onClick={() =>
          onChange("items")
        }
      >
        <Package size={17} />

        道具一覧

        <span className="count-badge">
          {itemCount}
        </span>
      </button>

      <span
        className={`save-status ${
          bad ? "bad" : ""
        }`}
        role="status"
      >
        <SaveStateLabel
          state={saveState}
        />
      </span>
    </nav>
  );
}
"use client";

import { useState } from "react";
import {
  Package,
  Pencil,
  Plus,
  Search,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import type { Player } from "@/lib/model";
import type { EquipmentItem } from "@/lib/equipment";

type Props = {
  items: EquipmentItem[];
  players: Player[];

  onAdd: () => void;
  onEdit: (item: EquipmentItem) => void;
};

export function EquipmentList({
  items,
  players,
  onAdd,
  onEdit,
}: Props) {
  const [query, setQuery] = useState("");

  /*
   * holderId → 選手名
   */
  function getHolderName(
    holderId: string | null,
  ) {
    if (!holderId) return "担当者なし";

    return (
      players.find(
        (player) =>
          player.id === holderId,
      )?.name ?? "不明な選手"
    );
  }

  /*
   * 検索
   *
   * 道具名
   * 備考
   * 担当者名
   * で検索可能
   */
  const filteredItems = items.filter(
    (item) => {
      const holderName =
        getHolderName(item.holderId);

      const target = [
        item.name,
        item.note,
        holderName,
      ]
        .join(" ")
        .toLowerCase();

      return target.includes(
        query.trim().toLowerCase(),
      );
    },
  );

  return (
    <section className="panel roster-panel">
      {/* =========================
          見出し
      ========================= */}

      <div className="roster-heading">
        <div>
          <h2>道具一覧</h2>

          <p>
            チーム道具を登録・編集して、
            担当者を管理します。
          </p>
        </div>

        <button
          type="button"
          className="primary"
          onClick={onAdd}
        >
          <Plus size={17} />
          道具を登録
        </button>
      </div>

      {/* =========================
          検索
      ========================= */}

      <div className="search-field">
        <Search size={18} />

        <Input
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="道具名・担当者で検索"
          aria-label="道具を検索"
        />
      </div>

      {/* =========================
          0件
      ========================= */}

      {!items.length ? (
        <div className="roster-empty">
          <Package size={36} />

          <h3>
            まずは、チーム道具を登録
          </h3>

          <p>
            ボールや防具など、
            チームで管理する道具を登録できます。
          </p>

          <button
            type="button"
            className="secondary"
            onClick={onAdd}
          >
            <Plus size={16} />
            最初の道具を登録
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        /*
         * 道具はあるけど検索結果0件
         */
        <div className="roster-empty">
          <Search size={30} />

          <h3>
            該当する道具がありません
          </h3>

          <p>
            検索条件を変更してください。
          </p>
        </div>
      ) : (
        /*
         * 道具一覧
         */
        <div className="roster-list">
          {filteredItems.map((item) => {
            const holderName =
              getHolderName(
                item.holderId,
              );

            return (
              <button
                type="button"
                className="roster-row"
                key={item.id}
                onClick={() =>
                  onEdit(item)
                }
              >
                {/* 左アイコン */}
                <span className="roster-number">
                  <Package size={18} />
                </span>

                {/* 道具名 + 備考 */}
                <span>
                  <strong>
                    {item.name}
                  </strong>

                  <small>
                    {item.note ||
                      "備考なし"}
                  </small>
                </span>

                {/* 担当者 */}
                <span className="roster-status">
                  {holderName}
                </span>

                <Pencil size={16} />
              </button>
            );
          })}
        </div>
      )}

      {/* =========================
          件数
      ========================= */}

      <p className="roster-count">
        {items.length}個登録済み
      </p>
    </section>
  );
}
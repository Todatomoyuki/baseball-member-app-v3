"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Player } from "@/lib/model";
import type { PlayerLocation } from "../types";

/**
 * 選手の登録・編集フォーム（モーダルの中身）。
 *
 * player を渡さなければ新規登録モードになります。
 * 入力途中の値はこのコンポーネントのローカル state だけで持ち、
 * 保存を押したときにだけ親へ通知します。
 */
export function PlayerEditorForm({
  player,
  onSave,
  onDelete,
  onClose,
  onMove,
  location,
}: {
  player?: Player;
  onSave: (player: Player) => void;
  onDelete?: () => void;
  onClose: () => void;
  /** ベンチ ⇔ 不参加 の移動 */
  onMove?: () => void;
  location?: PlayerLocation;
}) {
  const [name, setName] = useState(player?.name ?? "");
  const [number, setNumber] = useState(player?.number ?? "");
  const [kana, setKana] = useState(player?.kana ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          id: player?.id ?? crypto.randomUUID(),
          name: name.trim(),
          number: number.trim(),
          kana: kana.trim(),
        });
        onClose();
      }}
    >
      <label>
        選手名
        <Input
          required
          maxLength={30}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="山田 太郎"
        />
      </label>

      <div className="form-two">
        <label>
          背番号
          <Input
            required
            inputMode="numeric"
            pattern="[0-9]{1,3}"
            maxLength={3}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="10"
          />
        </label>
        <label>
          ふりがな <span className="optional">任意</span>
          <Input
            maxLength={50}
            value={kana}
            onChange={(e) => setKana(e.target.value)}
            placeholder="やまだ たろう"
          />
        </label>
      </div>

      {/* 出場中の選手はここからは動かせない（オーダー画面で操作する） */}
      {onMove && location !== "active" && (
        <button type="button" className="secondary full" onClick={onMove}>
          {location === "absent" ? "ベンチに戻す" : "不参加へ移動"}
        </button>
      )}

      <div className="modal-actions">
        {onDelete && (
          <button type="button" className="danger-link" onClick={onDelete}>
            <Trash2 size={16} />
            削除
          </button>
        )}
        <button className="primary" disabled={!name.trim()}>
          {player ? "変更を反映" : "選手を登録"}
        </button>
      </div>
    </form>
  );
}

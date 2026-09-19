"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import type { Player } from "@/lib/model";
import type { EquipmentItem } from "@/lib/equipment";

type Props = {
  target: EquipmentItem | "new" | null;
  players: Player[];

  onClose: () => void;
  onSave: (item: EquipmentItem) => void;
  onDelete: (item: EquipmentItem) => void;
};

export function EquipmentEditorModal({
  target,
  players,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const item =
    target && target !== "new"
      ? target
      : undefined;

  const [name, setName] = useState("");
  const [holderId, setHolderId] =
    useState<string>("");
  const [note, setNote] = useState("");

  /*
   * 編集対象が変わったときに
   * フォーム内容を入れ直す
   */
  useEffect(() => {
    if (!target) return;

    if (target === "new") {
      setName("");
      setHolderId("");
      setNote("");
      return;
    }

    setName(target.name);
    setHolderId(target.holderId ?? "");
    setNote(target.note);
  }, [target]);

  function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!name.trim()) return;

    onSave({
      id:
        item?.id ??
        crypto.randomUUID(),

      name: name.trim(),

      holderId:
        holderId || null,

      note: note.trim(),
    });

    onClose();
  }

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent layout="app">
        <div className="team-dialog-header">
          <DialogTitle className="modal-title">
            {target === "new"
              ? "道具を登録"
              : "道具を編集"}
          </DialogTitle>

          <DialogDescription className="modal-description">
            チーム道具の情報と担当者を設定します。
          </DialogDescription>
        </div>

        <div className="team-dialog-body">
          <form onSubmit={submit}>
            {/* 道具名 */}

            <label>
              道具名

              <Input
                required
                maxLength={50}
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                placeholder="例：試合球"
              />
            </label>

            {/* 担当者 */}

            <label>
              担当者

              <select
                className="equipment-holder-select"
                value={holderId}
                onChange={(event) =>
                  setHolderId(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  担当者なし
                </option>

                {players.map(
                  (player) => (
                    <option
                      key={player.id}
                      value={player.id}
                    >
                      {player.name}
                      {" "}
                      #{player.number}
                    </option>
                  ),
                )}
              </select>
            </label>

            {/* 備考 */}

            <label>
              備考{" "}
              <span className="optional">
                任意
              </span>

              <Input
                maxLength={80}
                value={note}
                onChange={(event) =>
                  setNote(
                    event.target.value,
                  )
                }
                placeholder="例：公式戦の日"
              />
            </label>

            {/* ボタン */}

            <div className="modal-actions">
              {item && (
                <button
                  type="button"
                  className="danger-link"
                  onClick={() => {
                    if (
                      window.confirm(
                        `${item.name}を削除しますか？`,
                      )
                    ) {
                      onDelete(item);
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={16} />
                  削除
                </button>
              )}

              <button
                type="submit"
                className="primary"
                disabled={!name.trim()}
              >
                {item
                  ? "変更を反映"
                  : "道具を登録"}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
"use client";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
} from "@/components/ui/command";
import type { Player } from "@/lib/model";
import { Modal } from "../common/Modal";

/**
 * 打順 / 投手の枠をタップしたときに開く選手選択モーダル。
 * 出場中の選手を選ぶと、その選手と位置が入れ替わります（swapPlayer）。
 *
 * @param target "pitcher" または "slot:<index>"。null のときは閉じています。
 */
export function PlayerPickerModal({
  target,
  players,
  bench,
  absent,
  onClose,
  onSelect,
  onShiftOrder,
  onAddPlayer,
}: {
  target: string | null;
  players: Player[];
  bench: Player[];
  absent: Player[];
  onClose: () => void;
  /** playerId が null なら選択解除 */
  onSelect: (playerId: string | null) => void;
  onShiftOrder: (index: number, delta: number) => void;
  onAddPlayer: () => void;
}) {
  const isSlot = !!target?.startsWith("slot:");
  const slotIndex = isSlot ? Number(target!.slice(5)) : -1;

  const statusOf = (player: Player) =>
    absent.some((a) => a.id === player.id)
      ? "不参加"
      : bench.some((b) => b.id === player.id)
        ? "ベンチ"
        : "出場中";

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title={
        target === "pitcher" ? "投手を選択" : `${slotIndex + 1}番の選手を選択`
      }
      description="出場中の選手を選ぶと、その選手と入れ替わります。"
    >
      <Command>
        <CommandInput placeholder="名前・背番号で検索" />
        <CommandList>
          <CommandItem onSelect={() => onSelect(null)}>
            選択を解除してベンチへ戻す
          </CommandItem>
          {players.map((p) => (
            <CommandItem
              key={p.id}
              value={`${p.name} ${p.kana} ${p.number}`}
              onSelect={() => onSelect(p.id)}
            >
              <span>{p.name}</span>
              <span className="jersey">#{p.number}</span>
              <small>{statusOf(p)}</small>
            </CommandItem>
          ))}
        </CommandList>
      </Command>

      {isSlot && (
        <div className="move-actions">
          <button
            className="secondary"
            disabled={slotIndex === 0}
            onClick={() => {
              onShiftOrder(slotIndex, -1);
              onClose();
            }}
          >
            <ArrowUp size={16} />
            打順を上げる
          </button>
          <button
            className="secondary"
            disabled={slotIndex === 8}
            onClick={() => {
              onShiftOrder(slotIndex, 1);
              onClose();
            }}
          >
            <ArrowDown size={16} />
            打順を下げる
          </button>
        </div>
      )}

      {!players.length && (
        <button className="secondary" onClick={onAddPlayer}>
          選手を登録
        </button>
      )}
    </Modal>
  );
}

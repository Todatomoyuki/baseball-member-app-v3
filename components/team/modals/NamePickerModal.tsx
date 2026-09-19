"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Modal } from "../common/Modal";

/**
 * 「相手チーム名」と「大会名」で共通して使う検索 + 新規追加モーダル。
 *
 * 候補になければ入力した文字列をそのまま新規追加できます。
 * @param onSelect 第 2 引数 isNew が true なら候補リストにも追加する必要があります。
 */
export function NamePickerModal({
  open,
  onClose,
  title,
  description,
  placeholder,
  searchLabel,
  emptyMessage,
  options,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  placeholder: string;
  searchLabel: string;
  /** 候補が 1 件もないときの案内文 */
  emptyMessage: string;
  options: string[];
  onSelect: (name: string, isNew: boolean) => void;
}) {
  const [query, setQuery] = useState("");

  // 開くたびに検索欄をリセットする
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const trimmed = query.trim();
  const canAdd = !!trimmed && !options.includes(trimmed);

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="picker-body">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={searchLabel}
          maxLength={80}
        />
        <div className="picker-list">
          {options
            .filter((v) => v.toLowerCase().includes(query.toLowerCase()))
            .map((name) => (
              <button key={name} onClick={() => onSelect(name, false)}>
                {name}
              </button>
            ))}

          {canAdd && (
            <button onClick={() => onSelect(trimmed, true)}>
              <Plus size={16} />「{trimmed}」を追加
            </button>
          )}

          {!options.length && !query && <p className="picker-empty">{emptyMessage}</p>}
        </div>
      </div>
    </Modal>
  );
}

"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Modal } from "../common/Modal";

type NamePickerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  placeholder: string;
  searchLabel: string;
  /** 候補が 1 件もないときの案内文 */
  emptyMessage: string;
  options: string[];
  maxLength?: number;
  allowClear?: boolean;
  onSelect: (name: string, isNew: boolean) => void;
};

/** 大会名・対戦相手・場所で共通の検索と新規入力。閉じると検索内容をリセットする。 */
export function NamePickerModal(props: NamePickerProps) {
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.title} description={props.description}>
      {props.open && <NamePickerBody {...props} />}
    </Modal>
  );
}

function NamePickerBody({
  placeholder, searchLabel, emptyMessage, options, maxLength = 80, allowClear = false, onSelect,
}: NamePickerProps) {
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const canAdd = !!trimmed && !options.includes(trimmed);

  return (
      <div className="picker-body">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={searchLabel}
          maxLength={maxLength}
        />
        <div className="picker-list">
          {allowClear && <button type="button" onClick={() => onSelect("", false)}>未設定にする</button>}
          {options
            .filter((v) => v.toLowerCase().includes(trimmed.toLowerCase()))
            .map((name) => (
              <button type="button" key={name} onClick={() => onSelect(name, false)}>
                {name}
              </button>
            ))}

          {canAdd && (
            <button type="button" onClick={() => onSelect(trimmed, true)}>
              <Plus size={16} />「{trimmed}」を追加
            </button>
          )}

          {!options.length && !query && <p className="picker-empty">{emptyMessage}</p>}
        </div>
      </div>
  );
}

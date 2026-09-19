import { Check } from "lucide-react";
import type { SaveState } from "../types";

export function SaveStateLabel({
  state,
}: {
  state: SaveState;
}) {
  if (state === "saved") {
    return (
      <>
        <Check size={14} />
        保存済み
      </>
    );
  }

  if (state === "saving") return <>保存中…</>;
  if (state === "dirty") return <>変更あり</>;

  return <>未保存</>;
}
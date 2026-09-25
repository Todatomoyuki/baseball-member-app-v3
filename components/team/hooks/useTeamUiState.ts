"use client";
import { useState } from "react";
import type { AppView, PlayerEditorTarget, TeamTab } from "../types";

/**
 * 画面の開閉状態だけを集めたフック。
 * サーバー通信やドメインロジックは一切持ちません。
 *
 * 検索ボックスの文字列など「そのコンポーネントの中だけで完結する状態」は
 * ここには置かず、各コンポーネントの useState に持たせています。
 */
export function useTeamUiState() {
  /** アプリランチャーで選んだ画面 */
  const [appView, setAppView] = useState<AppView>("stats");
  /** オーダー / 登録情報 タブ */
  const [tab, setTab] = useState<TeamTab>("order");

  /** 選手編集モーダル（Player = 編集 / "new" = 新規 / null = 閉） */
  const [editor, setEditor] = useState<PlayerEditorTarget>(null);
  /** 選手選択モーダル（"pitcher" または "slot:<index>"） */
  const [pick, setPick] = useState<string | null>(null);
  /** 守備位置変更モーダル（対象の打順インデックス） */
  const [positionIndex, setPositionIndex] = useState<number | null>(null);

  const [settings, setSettings] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  /** スマホで試合情報パネルを開いているか */
  const [infoOpen, setInfoOpen] = useState(false);

  return {
    appView,
    setAppView,
    tab,
    setTab,
    editor,
    setEditor,
    pick,
    setPick,
    positionIndex,
    setPositionIndex,
    settings,
    setSettings,
    appMenuOpen,
    setAppMenuOpen,
    infoOpen,
    setInfoOpen,
  };
}

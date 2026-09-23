"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Player } from "@/lib/model";
import {
  emptyPlayerStats,
  gameKey,
  parseGameKey,
  PLATE_APPEARANCE_RESULTS,
  todayLocalDate,
  type PlateAppearanceResult,
  type PlayerStats,
  type StatsData,
} from "@/lib/stats";
import { useStatsData } from "../hooks/useStatsData";
import type { SaveState } from "../types";
import { LoadingState } from "../common/LoadingState";

const NUMBER_FIELDS = [
  ["rbis", "打点"],
  ["runs", "得点"],
  ["stolenBases", "盗塁"],
  ["caughtStealingAttempts", "盗塁死"],
  ["errors", "失策"],
  ["caughtStealing", "盗塁阻止"],
] as const;
const SAVE_LABELS: Record<string, string> = {
  saved: "保存済み",
  dirty: "変更あり",
  saving: "保存中…",
  error: "保存エラー",
  conflict: "競合あり",
};
const CONFIRMATION_PAGE_SIZE = 5;
const GAME_NUMBERS = [1, 2, 3] as const;
const STAT_NUMBER_OPTIONS = Array.from({ length: 11 }, (_, index) => index);
const RBIS_NUMBER_OPTIONS = Array.from({ length: 21 }, (_, index) => index);

const SUMMARY_FIRST_ROW = [
  ["plateAppearances", "打席"], ["atBats", "打数"], ["hits", "安打"], ["homeRuns", "本塁打"],
  ["rbis", "打点"], ["runs", "得点"], ["stolenBases", "盗塁"], ["doubles", "二塁打"],
  ["triples", "三塁打"], ["scoringAtBats", "得点圏打数"], ["scoringHits", "得点圏安打"],
] as const;
const SUMMARY_SECOND_ROW = [
  ["strikeouts", "三振"], ["walks", "四球"], ["hitByPitches", "死球"], ["sacrificeBunts", "犠打"],
  ["sacrificeFlies", "犠飛"], ["doublePlays", "併殺打"], ["opponentErrors", "敵失"], ["errors", "失策"],
  ["caughtStealingAttempts", "盗塁死"], ["caughtStealing", "盗塁阻止"],
] as const;

type SummaryValues = Record<(typeof SUMMARY_FIRST_ROW)[number][0] | (typeof SUMMARY_SECOND_ROW)[number][0], number>;

function summarizeStats(values: PlayerStats): SummaryValues {
  const results = values.plateAppearances;
  const completed = results.filter((result): result is PlateAppearanceResult => result !== null);
  const hits = ["安打", "二塁打", "三塁打", "本塁打"];
  const isHit = (result: PlateAppearanceResult) => hits.includes(result);
  const scoringResults = completed.filter((_, index) => values.scoringPosition[index] === true);
  const count = (result: PlateAppearanceResult, source = completed) => source.filter((item) => item === result).length;
  const atBats = completed.filter((result) => !["四球", "死球", "エンドラン", "犠打", "犠飛"].includes(result)).length;
  return {
    plateAppearances: completed.length,
    atBats,
    hits: completed.filter(isHit).length,
    homeRuns: count("本塁打"),
    rbis: values.rbis,
    runs: values.runs,
    stolenBases: values.stolenBases,
    doubles: count("二塁打"),
    triples: count("三塁打"),
    scoringAtBats: scoringResults.filter((result) => !["四球", "死球", "エンドラン", "犠打", "犠飛"].includes(result)).length,
    scoringHits: scoringResults.filter(isHit).length,
    strikeouts: count("三振"),
    walks: count("四球"),
    hitByPitches: count("死球"),
    sacrificeBunts: count("犠打"),
    sacrificeFlies: count("犠飛"),
    doublePlays: count("併殺打"),
    opponentErrors: count("敵失"),
    errors: values.errors,
    caughtStealingAttempts: values.caughtStealingAttempts,
    caughtStealing: values.caughtStealing,
  };
}

function StatsValues({ player, values, onEdit, onDelete }: { player: Player; values: PlayerStats; onEdit: () => void; onDelete: () => void }) {
  const summary = summarizeStats(values);
  const renderSummary = (fields: readonly (readonly [string, string])[]) => fields.map(([field, label]) => (
    <span key={field}><small>{label}</small><strong>{summary[field as keyof SummaryValues]}</strong></span>
  ));
  return (
    <div className="stats-confirm-player">
      <div className="stats-confirm-player-name"><strong>{player.name}</strong><small>#{player.number}</small></div>
      <div className="stats-confirm-summary">
        <div className="stats-summary-row first">{renderSummary(SUMMARY_FIRST_ROW)}</div>
        <div className="stats-summary-row second">{renderSummary(SUMMARY_SECOND_ROW)}<span className="stats-summary-empty" aria-hidden="true" /></div>
      </div>
      <div className="stats-confirm-actions"><button type="button" className="stats-edit-button" onClick={onEdit}>編集</button><button type="button" className="stats-delete-button" onClick={onDelete}>削除</button></div>
    </div>
  );
}

export function StatsView({
  players,
  appNavigation,
  onSaveStateChange,
}: {
  players: Player[];
  appNavigation?: ReactNode;
  onSaveStateChange?: (state: SaveState) => void;
}) {
  const stats = useStatsData();
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayLocalDate);
  const [selectedGameNumber, setSelectedGameNumber] = useState(1);
  const [statsTab, setStatsTab] = useState<"entry" | "confirmation">("entry");
  const [openPlate, setOpenPlate] = useState<number | null>(null);
  const [confirmationPage, setConfirmationPage] = useState(1);
  const [entryReset, setEntryReset] = useState(false);

  useEffect(() => {
    onSaveStateChange?.(stats.saveState);
  }, [stats.saveState, onSaveStateChange]);

  useEffect(() => {
    const hitResults = new Set(["安打", "二塁打", "三塁打", "本塁打"]);
    document.querySelectorAll<HTMLButtonElement>(".plate-square").forEach((button) => {
      button.classList.toggle("hit-result", hitResults.has(button.querySelector("strong")?.textContent ?? ""));
    });
  }, [selectedPlayerId, selectedDate, selectedGameNumber, stats.data]);

  useEffect(() => {
    if (openPlate === null) return;
    const closeOnOutsideInteraction = (event: FocusEvent | PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".plate-entry")) setOpenPlate(null);
    };
    document.addEventListener("focusin", closeOnOutsideInteraction);
    document.addEventListener("pointerdown", closeOnOutsideInteraction);
    return () => {
      document.removeEventListener("focusin", closeOnOutsideInteraction);
      document.removeEventListener("pointerdown", closeOnOutsideInteraction);
    };
  }, [openPlate]);

  if (stats.loading) return <LoadingState label="成績データを読み込んでいます…" />;
  if (stats.error && stats.saveState !== "error" && stats.saveState !== "conflict") {
    return <section className="panel stats-error"><p>{stats.error}</p><button type="button" className="secondary" onClick={() => void stats.load()}>再読み込み</button></section>;
  }

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId);
  const selectedGameKey = gameKey(selectedDate, selectedGameNumber);
  const currentPlayers = stats.data.games[selectedGameKey] ?? {};
  const selectedValues = selectedPlayer && !entryReset ? currentPlayers[selectedPlayer.id] ?? emptyPlayerStats() : emptyPlayerStats();
  const canRegister = Boolean(selectedPlayer && selectedValues.plateAppearances.some((result) => result !== null));
  const sortByNumber = (a: Player, b: Player) => {
    const numberDiff = Number(a.number) - Number(b.number);
    return Number.isNaN(numberDiff) ? a.number.localeCompare(b.number, "ja") : numberDiff;
  };
  const selectablePlayers = [...players].sort(sortByNumber);
  const editPlayer = (updater: (current: PlayerStats) => PlayerStats) => {
    if (!selectedPlayer) return;
    setEntryReset(false);
    stats.edit((current: StatsData) => ({
      ...current,
      games: {
        ...current.games,
        [selectedGameKey]: {
          ...(current.games[selectedGameKey] ?? {}),
          [selectedPlayer.id]: updater(current.games[selectedGameKey]?.[selectedPlayer.id] ?? emptyPlayerStats()),
        },
      },
    }));
  };
  const updatePlate = (index: number, result: PlateAppearanceResult) => {
    editPlayer((current) => {
      const plateAppearances = [...current.plateAppearances];
      plateAppearances[index] = result;
      return { ...current, plateAppearances };
    });
    setOpenPlate(null);
  };
  const addPlate = () => editPlayer((current) => ({ ...current, plateAppearances: [...current.plateAppearances, null], scoringPosition: [...current.scoringPosition, false] }));
  const updateScoringPosition = (index: number, checked: boolean) => editPlayer((current) => {
    const scoringPosition = [...current.scoringPosition];
    scoringPosition[index] = checked;
    return { ...current, scoringPosition };
  });
  const updateNumber = (field: (typeof NUMBER_FIELDS)[number][0], value: string) => editPlayer((current) => ({ ...current, [field]: Math.max(0, Number.parseInt(value, 10) || 0) }));
  const registeredGames = Object.keys(stats.data.games).map((key) => ({ key, game: parseGameKey(key) })).filter((entry): entry is { key: string; game: { date: string; number: number } } => entry.game !== null).sort((a, b) => b.game.date.localeCompare(a.game.date) || a.game.number - b.game.number);
  const confirmationPageCount = Math.max(1, Math.ceil(registeredGames.length / CONFIRMATION_PAGE_SIZE));
  const currentConfirmationPage = Math.min(confirmationPage, confirmationPageCount);
  const visibleRegisteredGames = registeredGames.slice(
    (currentConfirmationPage - 1) * CONFIRMATION_PAGE_SIZE,
    currentConfirmationPage * CONFIRMATION_PAGE_SIZE,
  );
  const changeConfirmationPage = (page: number) => {
    setConfirmationPage(page);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const editRegistration = (game: { date: string; number: number }, playerId: string) => {
    setSelectedDate(game.date);
    setSelectedGameNumber(game.number);
    setSelectedPlayerId(playerId);
    setOpenPlate(null);
    setEntryReset(false);
    setStatsTab("entry");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const registerAndReset = () => { setSelectedPlayerId(""); setOpenPlate(null); setEntryReset(false); setStatsTab("entry"); };
  const resetEntry = () => {
    if (!selectedPlayer) return;
    setEntryReset(true);
    setOpenPlate(null);
  };
  const deleteRegistration = (gameKeyToDelete: string, playerId: string) => {
    stats.edit((current: StatsData) => {
      const game = { ...(current.games[gameKeyToDelete] ?? {}) };
      delete game[playerId];
      const games = { ...current.games };
      if (Object.keys(game).length === 0) delete games[gameKeyToDelete];
      else games[gameKeyToDelete] = game;
      return { ...current, games };
    });
  };

  return (
    <section className="stats-page">
      <header className="stats-heading"><div><p className="eyebrow">GAME STATS</p><h1>{statsTab === "confirmation" ? "成績登録確認" : "成績登録"}</h1><p>{statsTab === "confirmation" ? "試合ごとの成績を確認できます。" : "試合日・試合番号・選手を選択して成績を入力してください。"}</p></div></header>
      {appNavigation}
      <nav className="tabs stats-tabs" aria-label="成績画面切替"><button className={statsTab === "entry" ? "active" : ""} type="button" onClick={() => setStatsTab("entry")}>成績入力</button><button className={statsTab === "confirmation" ? "active" : ""} type="button" onClick={() => setStatsTab("confirmation")}>成績登録確認</button></nav>
      {statsTab === "confirmation" ? (
        <><div className="stats-confirm-list">{registeredGames.length === 0 ? <div className="panel"><p className="stats-empty">まだ成績が登録されていません。</p></div> : visibleRegisteredGames.map(({ key, game }) => <section className="stats-game-group" key={key}><h2>{game.number === 1 ? game.date : `${game.date}・${game.number}試合目`}</h2><div className="panel">{players.filter((player) => stats.data.games[key]?.[player.id]).sort(sortByNumber).map((player) => <StatsValues key={player.id} player={player} values={stats.data.games[key][player.id]} onEdit={() => editRegistration(game, player.id)} onDelete={() => deleteRegistration(key, player.id)} />)}</div></section>)}</div>{confirmationPageCount > 1 && <nav className="stats-pagination" aria-label="成績登録確認ページ"><button type="button" className="secondary" disabled={currentConfirmationPage === 1} onClick={() => changeConfirmationPage(currentConfirmationPage - 1)}>前へ</button><span>{currentConfirmationPage} / {confirmationPageCount}</span><button type="button" className="secondary" disabled={currentConfirmationPage === confirmationPageCount} onClick={() => changeConfirmationPage(currentConfirmationPage + 1)}>次へ</button></nav>}<div className="stats-actions"><button type="button" className="secondary" onClick={() => setStatsTab("entry")}>成績を追加登録</button></div></>
      ) : (
        <div className="stats-entry-card panel"><div className="stats-game-fields"><div><label htmlFor="stats-game-date">試合日</label><input id="stats-game-date" type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedPlayerId(""); setEntryReset(false); setOpenPlate(null); }} /></div><div className="stats-game-number-field"><div className="stats-game-number-control"><select aria-label="試合番号" className="stats-game-number-input" id="stats-game-number" value={selectedGameNumber} onChange={(event) => { setSelectedGameNumber(Number.parseInt(event.target.value, 10)); setSelectedPlayerId(""); setEntryReset(false); setOpenPlate(null); }}>{GAME_NUMBERS.map((number) => <option key={number} value={number}>{number}</option>)}</select><span>試合目</span></div></div></div><div className="stats-player-field"><label htmlFor="stats-player">選手を選択</label><select className="stats-player-select" id="stats-player" value={selectedPlayerId} onChange={(event) => { setSelectedPlayerId(event.target.value); setEntryReset(false); setOpenPlate(null); }}><option value="">選手を選択してください</option>{selectablePlayers.map((player) => <option key={player.id} value={player.id}>#{player.number} {player.name}</option>)}</select></div>
          {selectedPlayer ? <><h2 className="stats-section-heading">打席結果</h2><div className="plate-entry-grid">{selectedValues.plateAppearances.map((result: PlateAppearanceResult | null, index: number) => <div className="plate-entry" key={index} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenPlate(null); }}><button type="button" className={`plate-square ${result ? "filled" : ""}`} onClick={() => setOpenPlate(openPlate === index ? null : index)}><small>{index + 1}打席目</small><strong>{result ?? "選択"}</strong></button>{openPlate === index && <div className="plate-result-menu">{PLATE_APPEARANCE_RESULTS.map((option) => <button type="button" key={option} onPointerDown={(event) => event.preventDefault()} onClick={() => updatePlate(index, option)}>{option}</button>)}</div>}<label className="scoring-position-field"><span>得点圏</span><input type="checkbox" aria-label={`${index + 1}打席目の得点圏`} checked={selectedValues.scoringPosition[index] === true} onChange={(event) => updateScoringPosition(index, event.target.checked)} /></label></div>)}<button type="button" className="plate-add-button" onClick={addPlate} aria-label="打席を追加">＋<small>打席追加</small></button></div><h2 className="stats-section-heading">その他の成績</h2><div className="stats-number-grid">{NUMBER_FIELDS.map(([field, label]) => <label key={field} htmlFor={`stat-${field}`}><span>{label}</span><select id={`stat-${field}`} value={selectedValues[field]} onChange={(event) => updateNumber(field, event.target.value)}>{(field === "rbis" ? RBIS_NUMBER_OPTIONS : STAT_NUMBER_OPTIONS).map((number) => <option key={number} value={number}>{number}</option>)}</select></label>)}</div></> : <p className="stats-entry-placeholder">試合日・試合番号・選手を選択すると成績入力欄が表示されます。</p>}<div className="stats-actions"><button type="button" className="primary" disabled={!canRegister} onClick={registerAndReset}>登録する</button><button type="button" className="secondary" disabled={!selectedPlayer} onClick={resetEntry}>入力をリセット</button></div></div>
      )}
    </section>
  );
}

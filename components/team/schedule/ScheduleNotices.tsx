"use client";

import { useEffect, useState } from "react";
import { japanDate, type ScheduleGame, type ScheduleResponse } from "@/lib/schedule";
import { Modal } from "../common/Modal";
import { SaveStateLabel } from "../common/SaveStateLabel";
import type { SaveState } from "../types";

type Notice = { changed: boolean; games: { id: string; version: number }[] };
const answers = [
  { status: "undecided", label: "未定" },
  { status: "attending", label: "参加" },
  { status: "absent", label: "不参加" },
] as const;

function changedGames(games: ScheduleGame[], memberId: string, dismissed: Record<string, number>) {
  return games.filter((game) => game.date >= japanDate() && game.responses[memberId]
    && game.responses[memberId].confirmedRevision < game.detailsRevision
    && (dismissed[game.id] ?? 0) < game.detailsRevision);
}

function noticeFor(games: ScheduleGame[], changed: boolean): Notice | null {
  return games.length ? { changed, games: games.map((game) => ({ id: game.id, version: game.detailsRevision })) } : null;
}

/** 回答中も対象一覧を保持し、保存失敗をポップアップ内で確認できるようにする。 */
export function ScheduleNotices({ games, initialGames, memberId, suspended, saveState, error, onResponse, onRetry, onOpenSchedule }: {
  games: ScheduleGame[];
  initialGames: ScheduleGame[];
  memberId: string;
  suspended: boolean;
  saveState: SaveState;
  error: string;
  onResponse: (gameId: string, response: Pick<ScheduleResponse, "status" | "comment">) => void;
  onRetry: () => void;
  onOpenSchedule: (gameId: string) => void;
}) {
  const [dismissed, setDismissed] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState<Notice | null>(() => {
    const changed = changedGames(initialGames, memberId, {});
    const unanswered = initialGames.filter((game) => game.date >= japanDate() && !game.responses[memberId]);
    // 初回は変更された試合と未回答の試合をまとめて案内する。
    return noticeFor([...changed, ...unanswered], changed.length > 0);
  });
  const rows = notice?.games.flatMap((entry) => {
    const game = games.find((game) => game.id === entry.id && game.date >= japanDate());
    return game ? [game] : [];
  }) ?? [];

  useEffect(() => {
    if (notice || suspended || saveState !== "saved" || error) return;
    const next = noticeFor(changedGames(games, memberId, dismissed), true);
    // 外部から取得した試合の更新に応じて、未確認の変更だけを通知する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (next) setNotice(next);
  }, [games, memberId, dismissed, notice, suspended, saveState, error]);

  const close = () => {
    if (notice) setDismissed((current) => ({ ...current, ...Object.fromEntries(notice.games.map((game) => [game.id, game.version])) }));
    setNotice(null);
  };

  return <Modal
    open={notice !== null && !suspended}
    onClose={close}
    title={notice?.changed ? "予定が変更された試合があります！" : "出欠が未入力の試合があります！"}
    description={notice?.changed ? "参加状況に変わりがあれば入力してください。変更がなくても同じ回答を押すと確認済みになります。" : "この画面から回答できます。予定が決まっていなければ「未定」を選んでください。"}
  >
    <ul className="schedule-reminder-list">
      {rows.map((game) => {
        const response = game.responses[memberId];
        return <li key={game.id}>
          <strong>{game.date.replaceAll("-", "/")} {game.startTime || "時刻未定"}</strong>
          <span>{game.title || "大会名未設定"}{game.opponent && ` ／ ${game.opponent}`}</span>
          {game.location && <span>{game.location}</span>}
          {response && response.confirmedRevision < game.detailsRevision && <small className="schedule-changed-label">予定が変更されています</small>}
          <div className="schedule-attendance-buttons" role="group" aria-label={`${game.date} ${game.title || "試合"}の出欠`}>
            {answers.map(({ status, label }) => <button key={status} type="button" className={`schedule-attendance-button ${status}`} aria-pressed={response?.status === status} disabled={saveState === "conflict"} onClick={() => onResponse(game.id, { status, comment: response?.comment ?? "" })}>{label}</button>)}
          </div>
        </li>;
      })}
    </ul>
    {!rows.length && <p>案内する試合はありません。</p>}
    <p className={`schedule-form-save-state ${saveState}`} role="status"><SaveStateLabel state={saveState} /></p>
    {error && <div className="schedule-form-error" role="alert"><p>{error}</p>{saveState === "error" && <button className="secondary" type="button" onClick={onRetry}>保存を再試行</button>}</div>}
    <div className="schedule-form-actions">
      <button type="button" className="secondary" onClick={() => { const id = rows[0]?.id; close(); if (id) onOpenSchedule(id); }}>スケジュールを見る</button>
      <button type="button" className="primary" onClick={close}>あとで・閉じる</button>
    </div>
  </Modal>;
}

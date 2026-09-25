"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, Check, Clock3, ExternalLink, MapPin, Pencil, Plus, Users } from "lucide-react";
import type { AuthMember } from "@/lib/auth-types";
import type { Player } from "@/lib/model";
import {
  japanDate,
  mapLinks,
  SCHEDULE_LIMITS,
  upcomingSaturday,
  type ScheduleGame,
  type ScheduleResponse,
} from "@/lib/schedule";
import { LoadingState } from "../common/LoadingState";
import { Modal } from "../common/Modal";
import { SaveStateLabel } from "../common/SaveStateLabel";
import { useScheduleData } from "../hooks/useScheduleData";
import type { SaveState } from "../types";

const ATTENDANCE = [
  { status: "attending", label: "参加", symbol: "○" },
  { status: "absent", label: "不参加", symbol: "×" },
  { status: "undecided", label: "未定", symbol: "△" },
] as const;

const weekday = new Intl.DateTimeFormat("ja-JP", { weekday: "short", timeZone: "Asia/Tokyo" });

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${year}年${Number(month)}月${Number(day)}日（${weekday.format(new Date(`${date}T12:00:00+09:00`))}）`;
}

function useUnsavedWarning(unsaved: boolean) {
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);
}

function ResponseEditor({
  gameId, player, response, disabled, onChange,
}: {
  gameId: string;
  player: Pick<Player, "id" | "name">;
  response?: ScheduleResponse;
  disabled: boolean;
  onChange: (response: ScheduleResponse) => void;
}) {
  const commentId = `schedule-comment-${gameId}-${player.id}`;
  return (
    <div className="schedule-response-editor">
      <div className="schedule-attendance-buttons" role="group" aria-label={`${player.name}の出欠`}>
        {ATTENDANCE.map(({ status, label, symbol }) => (
          <button
            key={status}
            type="button"
            className={`schedule-attendance-button ${status}`}
            aria-pressed={response?.status === status}
            disabled={disabled}
            onClick={() => onChange({ status, comment: response?.comment ?? "" })}
          >
            <span aria-hidden="true">{symbol}</span>{label}
            {response?.status === status && <Check size={14} aria-hidden="true" />}
          </button>
        ))}
      </div>
      <label htmlFor={commentId}>コメント <span>任意・全員に表示</span></label>
      <textarea
        id={commentId}
        rows={2}
        maxLength={SCHEDULE_LIMITS.comment}
        placeholder="例：30分ほど遅れます"
        value={response?.comment ?? ""}
        readOnly={disabled}
        onChange={(event) => onChange({
          status: response?.status ?? "undecided",
          comment: event.target.value,
        })}
      />
      <p className="schedule-autosave-note">出欠・コメントは自動保存されます。</p>
    </div>
  );
}

function GameCard({ game, players, member, featured, disabled, onEdit, onResponse }: {
  game: ScheduleGame;
  players: Player[];
  member: AuthMember;
  featured: boolean;
  disabled: boolean;
  onEdit?: () => void;
  onResponse: (playerId: string, response: ScheduleResponse) => void;
}) {
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const maps = mapLinks(game);
  const ownPlayer = players.find((player) => player.id === member.id);
  const counts = { attending: 0, absent: 0, undecided: 0, unanswered: 0 };
  for (const player of players) counts[game.responses[player.id]?.status ?? "unanswered"] += 1;

  return (
    <article className={`panel schedule-game-card${featured ? " featured" : ""}`}>
      <header className="schedule-game-heading">
        <div className="schedule-game-heading-copy">
          {featured && <p className="schedule-featured-label">次の土曜日</p>}
          <p className="schedule-game-date"><CalendarDays size={17} aria-hidden="true" /><time dateTime={game.date}>{formatDate(game.date)}</time></p>
          <h2>{game.title || (game.opponent ? `${game.opponent}との試合` : "試合予定")}</h2>
        </div>
        {onEdit && (
          <button type="button" className="schedule-edit-button" disabled={disabled} onClick={onEdit} aria-label={`${formatDate(game.date)} ${game.title || "試合予定"}を編集`}>
            <Pencil size={16} aria-hidden="true" /><span>編集</span>
          </button>
        )}
      </header>
      <div className="schedule-game-info">
        <p><Clock3 size={16} aria-hidden="true" /><span>{game.startTime ? `${game.startTime} 開始` : "開始時間は未定"}</span></p>
        {game.opponent && <p><Users size={16} aria-hidden="true" /><span>対戦相手：{game.opponent}</span></p>}
        <p><MapPin size={16} aria-hidden="true" /><span>{game.location || "場所は未定"}</span></p>
      </div>
      {(maps || game.mapUrl) && (
        <div className="schedule-map-links" aria-label="試合会場の地図">
          {maps && <>
            <a href={maps.google} target="_blank" rel="noopener noreferrer">Googleマップ<ExternalLink size={13} aria-hidden="true" /><span className="sr-only">（新しいタブで開く）</span></a>
            <a href={maps.apple} target="_blank" rel="noopener noreferrer">Appleマップ<ExternalLink size={13} aria-hidden="true" /><span className="sr-only">（新しいタブで開く）</span></a>
          </>}
          {game.mapUrl && <a href={game.mapUrl} target="_blank" rel="noopener noreferrer">共有された地図<ExternalLink size={13} aria-hidden="true" /><span className="sr-only">（新しいタブで開く）</span></a>}
        </div>
      )}
      {ownPlayer && (
        <section className="schedule-own-response" aria-label="自分の出欠回答">
          <h3>あなたの出欠 <span>{ownPlayer.name}</span></h3>
          <ResponseEditor gameId={game.id} player={ownPlayer} response={game.responses[member.id]} disabled={disabled} onChange={(response) => onResponse(member.id, response)} />
        </section>
      )}
      <div className="schedule-response-counts" aria-label="出欠の集計">
        {ATTENDANCE.map(({ status, label }) => <span key={status} className={status}>{label}<strong>{counts[status]}</strong></span>)}
        <span>未回答<strong>{counts.unanswered}</strong></span>
      </div>
      <details className="schedule-members">
        <summary>全員の出欠・コメント <span>{players.length}人</span></summary>
        <ul>
          {players.map((player) => {
            const response = game.responses[player.id];
            const label = ATTENDANCE.find(({ status }) => status === response?.status)?.label ?? "未回答";
            const canEditOther = member.isAdmin && player.id !== member.id;
            return (
              <li key={player.id}>
                <div className="schedule-member-heading">
                  <span className="schedule-member-name"><small>#{player.number}</small>{player.name}{player.id === member.id && <small>あなた</small>}</span>
                  <span className={`schedule-status-badge ${response?.status ?? "unanswered"}`}>{label}</span>
                  {canEditOther && <button type="button" className="schedule-member-edit" disabled={disabled} aria-expanded={editingPlayerId === player.id} aria-label={`${player.name}の回答を編集`} onClick={() => setEditingPlayerId(editingPlayerId === player.id ? null : player.id)}><Pencil size={14} aria-hidden="true" /><span>{editingPlayerId === player.id ? "閉じる" : "編集"}</span></button>}
                </div>
                {editingPlayerId === player.id && canEditOther ? (
                  <ResponseEditor gameId={game.id} player={player} response={response} disabled={disabled} onChange={(next) => onResponse(player.id, next)} />
                ) : response?.comment ? <p className="schedule-member-comment">{response.comment}</p> : null}
              </li>
            );
          })}
        </ul>
      </details>
    </article>
  );
}

type GameFields = Pick<ScheduleGame, "date" | "startTime" | "title" | "opponent" | "location" | "mapUrl">;

function gameFields(game: GameFields): GameFields {
  return { date: game.date, startTime: game.startTime, title: game.title, opponent: game.opponent, location: game.location, mapUrl: game.mapUrl };
}

function GameEditor({ game, defaultDate, visible, saveState, saveError, onSave, onClose }: {
  game?: ScheduleGame;
  defaultDate: string;
  visible: boolean;
  saveState: SaveState;
  saveError: string;
  onSave: (id: string, values: GameFields) => void;
  onClose: () => void;
}) {
  const [id] = useState(() => game?.id ?? crypto.randomUUID());
  const [draft, setDraft] = useState<GameFields>(() => game ? gameFields(game) : {
    date: defaultDate, startTime: "", title: "", opponent: "", location: "", mapUrl: "",
  });
  const [initial] = useState(() => JSON.stringify(draft));
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const draftJson = JSON.stringify(draft);
  const hasLocalChanges = draftJson !== (submitted ?? initial);
  const pending = saveState === "dirty" || saveState === "saving";
  const blocked = saveState === "conflict";
  useUnsavedWarning(hasLocalChanges);

  const close = () => {
    if (hasLocalChanges && !window.confirm("保存していない予定の入力を破棄して閉じますか？")) return;
    onClose();
  };
  const update = (field: keyof GameFields, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError("");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (blocked || pending) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || draft.date.startsWith("0000-") || !Number.isFinite(Date.parse(draft.date)) || new Date(draft.date).toISOString().slice(0, 10) !== draft.date) {
      setFormError("試合日を入力してください。");
      return;
    }
    const values = { ...draft, title: draft.title.trim(), opponent: draft.opponent.trim(), location: draft.location.trim(), mapUrl: draft.mapUrl.trim() };
    if (values.mapUrl) {
      try {
        const url = new URL(values.mapUrl);
        if (!/^https?:\/\//i.test(values.mapUrl) || !["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error();
      } catch {
        setFormError("地図リンクには https:// または http:// で始まるURLを入力してください。");
        return;
      }
    }
    setFormError("");
    setDraft(values);
    setSubmitted(JSON.stringify(values));
    onSave(id, values);
  };

  return (
    <Modal open={visible} onClose={close} title={game ? "予定を編集" : "予定を追加"} description="試合日だけで登録できます。同じ日に複数の予定も追加できます。">
      <form className="schedule-game-form" onSubmit={submit}>
        <div className="schedule-date-time-fields">
          <label htmlFor="schedule-date">試合日 <span className="schedule-required">必須</span><input id="schedule-date" type="date" required value={draft.date} onChange={(event) => update("date", event.target.value)} /></label>
          <label htmlFor="schedule-time">開始時間 <span>任意</span><input id="schedule-time" type="time" value={draft.startTime} onChange={(event) => update("startTime", event.target.value)} /></label>
        </div>
        <label htmlFor="schedule-title">予定名 <span>任意</span><input id="schedule-title" maxLength={SCHEDULE_LIMITS.title} placeholder="例：練習試合・第1試合" value={draft.title} onChange={(event) => update("title", event.target.value)} /></label>
        <label htmlFor="schedule-opponent">対戦相手 <span>任意</span><input id="schedule-opponent" maxLength={SCHEDULE_LIMITS.opponent} placeholder="相手チーム名" value={draft.opponent} onChange={(event) => update("opponent", event.target.value)} /></label>
        <label htmlFor="schedule-location">場所 <span>任意</span><input id="schedule-location" maxLength={SCHEDULE_LIMITS.location} placeholder="球場名・住所" value={draft.location} onChange={(event) => update("location", event.target.value)} /><small>球場名や住所から地図を開けます。</small></label>
        <label htmlFor="schedule-map-url">地図リンク <span>任意</span><input id="schedule-map-url" type="url" inputMode="url" maxLength={SCHEDULE_LIMITS.mapUrl} placeholder="https://…" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={draft.mapUrl} onChange={(event) => update("mapUrl", event.target.value)} /><small>地図アプリで共有したリンクを貼り付けられます。</small></label>
        {formError && <p className="schedule-form-error" role="alert">{formError}</p>}
        {saveError && <div className="schedule-form-error" role="alert"><p>{saveError}</p><p>入力内容はこの画面に残っています。{blocked ? "閉じて再読み込みの案内を確認してください。" : "もう一度「予定を保存」を押してください。"}</p></div>}
        {submitted && !hasLocalChanges && <p className={`schedule-form-save-state ${saveState}`} role="status"><SaveStateLabel state={saveState} /></p>}
        <div className="schedule-form-actions">
          <button type="submit" className="primary" disabled={blocked || pending || (submitted === draftJson && saveState === "saved")}>{pending ? "保存中…" : "予定を保存"}</button>
          <button type="button" className="secondary" onClick={close}>閉じる</button>
        </div>
      </form>
    </Modal>
  );
}

export function ScheduleView({ players, member, appNavigation, onSaveStateChange, onSaved, onOpenSchedule, remoteRevision, isVisible = true }: {
  players: Player[];
  member: AuthMember;
  appNavigation?: ReactNode;
  onSaveStateChange?: (state: SaveState) => void;
  onSaved?: () => void;
  onOpenSchedule: () => void;
  remoteRevision: number;
  isVisible?: boolean;
}) {
  const schedule = useScheduleData();
  const [editor, setEditor] = useState<ScheduleGame | "new" | null>(null);
  const [defaultDate, setDefaultDate] = useState(upcomingSaturday);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const requestedRevision = useRef(-1);
  const previousSaveState = useRef<SaveState>("saved");
  const saturday = upcomingSaturday();
  const today = japanDate();
  const blocked = schedule.loading || schedule.saveState === "conflict";
  const saveFailed = schedule.saveState === "error" || schedule.saveState === "conflict";

  useEffect(() => {
    onSaveStateChange?.(schedule.saveState);
    if (previousSaveState.current !== "saved" && schedule.saveState === "saved") onSaved?.();
    previousSaveState.current = schedule.saveState;
  }, [schedule.saveState, onSaveStateChange, onSaved]);
  useUnsavedWarning(schedule.saveState !== "saved");

  const refreshSchedule = schedule.refreshIfIdle;
  useEffect(() => {
    if (schedule.loading || schedule.error || schedule.saveState !== "saved" || editor || remoteRevision <= schedule.revision || requestedRevision.current === remoteRevision) return;
    requestedRevision.current = remoteRevision;
    void refreshSchedule();
  }, [remoteRevision, schedule.revision, schedule.loading, schedule.error, schedule.saveState, editor, refreshSchedule]);

  const sortedPlayers = [...players].sort((a, b) => a.number.localeCompare(b.number, "ja", { numeric: true }) || a.name.localeCompare(b.name, "ja"));
  const sortedGames = [...schedule.data.games].sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "99:99").localeCompare(b.startTime || "99:99") || a.id.localeCompare(b.id));
  const unansweredGames = sortedGames.filter((game) => game.date >= today && !game.responses[member.id] && schedule.loginGames?.some((initial) => initial.id === game.id && !initial.responses[member.id]));
  const saturdayGames = sortedGames.filter((game) => game.date === saturday);
  const upcomingGames = sortedGames.filter((game) => game.date >= today && game.date !== saturday);
  const pastGames = sortedGames.filter((game) => game.date < today).reverse();
  const addGame = (date = saturday) => { setDefaultDate(date); setEditor("new"); };
  const reload = () => {
    if (schedule.saveState === "saving") return;
    if (schedule.saveState !== "saved" && !window.confirm("この画面の未保存の出欠・コメント・予定の変更を破棄して、最新の内容を読み込みますか？必要な入力内容は先に控えてください。")) return;
    void schedule.load();
  };
  const saveGame = (id: string, values: GameFields) => {
    if (!member.canEditLineup || blocked) return;
    schedule.edit((current) => {
      const index = current.games.findIndex((game) => game.id === id);
      if (index >= 0) current.games[index] = { ...current.games[index], ...values };
      else current.games.push({ id, ...values, responses: {} });
      return current;
    });
  };
  const updateResponse = (gameId: string, playerId: string, response: ScheduleResponse) => {
    if (blocked || (!member.isAdmin && playerId !== member.id)) return;
    schedule.edit((current) => {
      const game = current.games.find((item) => item.id === gameId);
      if (game) game.responses[playerId] = response;
      return current;
    });
  };
  const card = (game: ScheduleGame) => <GameCard key={game.id} game={game} players={sortedPlayers} member={member} featured={game.date === saturday} disabled={blocked} onEdit={member.canEditLineup ? () => setEditor(game) : undefined} onResponse={(playerId, response) => updateResponse(game.id, playerId, response)} />;

  return (
    <section className="schedule-page">
      <Modal
        open={!reminderDismissed && !schedule.loading && !schedule.error && unansweredGames.length > 0}
        onClose={() => setReminderDismissed(true)}
        title="出欠が未入力の試合があります！"
        description={`${unansweredGames.length}件の試合が未回答です。予定が決まっていない場合も「未定」で回答できます。`}
      >
        <ul className="schedule-reminder-list">
          {unansweredGames.slice(0, 3).map((game) => <li key={game.id}><strong>{formatDate(game.date)} {game.startTime}</strong><span>{game.title || "試合予定"}{game.opponent && ` ／ ${game.opponent}`}</span></li>)}
        </ul>
        <div className="schedule-form-actions">
          <button type="button" className="primary" onClick={() => { setReminderDismissed(true); onOpenSchedule(); }}>出欠を入力する</button>
          <button type="button" className="secondary" onClick={() => setReminderDismissed(true)}>あとで</button>
        </div>
      </Modal>
      <header className="page-heading schedule-page-heading">
        <div><p className="eyebrow">TEAM SCHEDULE</p><h1>スケジュール</h1><p>試合の予定を確認して、出欠を回答しましょう。</p></div>
      </header>
      {appNavigation}
      {schedule.loading ? <LoadingState label="スケジュールを読み込んでいます…" /> : schedule.error && schedule.saveState === "saved" ? (
        <div className="panel schedule-error" role="alert"><p>{schedule.error}</p><button type="button" className="secondary" onClick={reload}>再読み込み</button></div>
      ) : <>
        <div className="schedule-toolbar">
          <span className="schedule-toolbar-count">これからの予定 {sortedGames.filter((game) => game.date >= today).length}件</span>
          {member.canEditLineup && <button type="button" className="primary" disabled={blocked} onClick={() => addGame()}><Plus size={17} aria-hidden="true" />予定を追加</button>}
        </div>
        {schedule.error && saveFailed && <div className="panel schedule-error" role="alert">
          <p>{schedule.error}</p>
          <p>変更した内容はこの画面に残っています。{schedule.saveState === "conflict" ? "他の更新があるため、入力内容を控えてから再読み込みしてください。" : "通信を確認して、保存を再試行してください。"}</p>
          <div className="schedule-error-actions">{schedule.saveState === "error" && <button type="button" className="primary" onClick={schedule.retrySave}>保存を再試行</button>}<button type="button" className="secondary" onClick={reload}>変更を破棄して再読み込み</button></div>
        </div>}
        <div className="schedule-game-list">
          {saturdayGames.length ? saturdayGames.map(card) : <div className="panel schedule-saturday-empty">
            <span className="schedule-empty-icon"><CalendarDays size={25} aria-hidden="true" /></span><p className="schedule-featured-label">次の土曜日</p><h2>{formatDate(saturday)}</h2><p>まだ予定が登録されていません。</p>
            {member.canEditLineup ? <button type="button" className="secondary" disabled={blocked} onClick={() => addGame(saturday)}><Plus size={16} aria-hidden="true" />この日の予定を追加</button> : <p className="schedule-empty-help">予定が追加されると、ここから出欠を回答できます。</p>}
          </div>}
          {upcomingGames.length > 0 && <><h2 className="schedule-section-title">これからの予定</h2>{upcomingGames.map(card)}</>}
        </div>
        {pastGames.length > 0 && <details className="schedule-past"><summary>過去の予定 <span>{pastGames.length}件</span></summary><div className="schedule-game-list">{pastGames.map(card)}</div></details>}
      </>}
      {editor !== null && <GameEditor key={editor === "new" ? "new" : editor.id} game={editor === "new" ? undefined : editor} defaultDate={defaultDate} visible={isVisible} saveState={schedule.saveState} saveError={saveFailed ? schedule.error : ""} onSave={saveGame} onClose={() => setEditor(null)} />}
    </section>
  );
}

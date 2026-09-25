"use client";
import { CalendarDays, ChevronDown, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { TeamData } from "@/lib/model";
import type { ScheduleGame } from "@/lib/schedule";
import { setFieldUpdater } from "../lib/lineup-actions";

type ScheduleOption = Omit<ScheduleGame, "responses">;

function addCandidate(values: string[], value: string): string[] {
  return !value || values.includes(value) ? values : [...values, value].slice(-200);
}

function applySchedule(data: TeamData, game: ScheduleOption): TeamData {
  return {
    ...data,
    scheduleId: game.id,
    date: game.date,
    tournament: game.title,
    opponent: game.opponent,
    startTime: game.startTime,
    location: game.location,
    mapUrl: game.mapUrl,
    tournaments: addCandidate(data.tournaments, game.title),
    opponents: addCandidate(data.opponents, game.opponent),
  };
}

function compareSchedules(a: ScheduleOption, b: ScheduleOption): number {
  return (a.startTime || "99:99").localeCompare(b.startTime || "99:99") || a.id.localeCompare(b.id);
}

/**
 * 左側（スマホでは折りたたみ）の試合情報パネル。
 * 対象試合を選び、試合情報の編集はスケジュールに引き継ぎます。
 */
export function MatchInfoPanel({
  data,
  scheduleOptions,
  onOpenSchedule,
  readOnly,
  edit,
  infoOpen,
  onToggleInfo,
}: {
  data: TeamData;
  scheduleOptions: ScheduleOption[];
  onOpenSchedule: () => void;
  readOnly: boolean;
  edit: (fn: (d: TeamData) => TeamData) => void;
  infoOpen: boolean;
  onToggleInfo: () => void;
}) {
  const schedules = scheduleOptions.filter((game) => game.date === data.date).sort(compareSchedules);

  const changeDate = (date: string) => {
    if (!date) return;
    const firstSchedule = scheduleOptions.filter((game) => game.date === date).sort(compareSchedules)[0];
    edit((current) => firstSchedule ? applySchedule(current, firstSchedule) : {
      ...current,
      date,
      scheduleId: null,
      startTime: "",
      location: "",
      mapUrl: "",
    });
  };

  return (
    <aside className={`panel match-panel ${infoOpen ? "info-open" : ""}`}>
      <button
        className="mobile-info-toggle"
        onClick={onToggleInfo}
        aria-expanded={infoOpen}
      >
        <CalendarDays size={19} />
        <span>
          {data.date.replaceAll("-", " / ")}
          <small>{data.opponent ? `vs ${data.opponent}` : readOnly ? "試合情報" : "試合情報を入力"}</small>
        </span>
        <ChevronDown size={18} />
      </button>

      <div className="match-fields">
        <h2>試合情報</h2>

        <label>
          日付
          <Input
            type="date"
            disabled={readOnly}
            value={data.date}
            onChange={(e) => changeDate(e.target.value)}
          />
        </label>

        <label>
          この日の予定
          <select
            className="combobox-trigger min-w-0 w-full"
            value={data.scheduleId ?? ""}
            disabled={readOnly || schedules.length === 0}
            onChange={(e) => {
              const game = schedules.find((candidate) => candidate.id === e.target.value);
              if (game) edit((current) => applySchedule(current, game));
            }}
          >
            <option value="" disabled>{schedules.length ? "予定を選択" : "予定はありません"}</option>
            {schedules.map((game) => (
              <option key={game.id} value={game.id}>
                {game.startTime || "時刻未定"} · {game.title || "試合"}{game.opponent ? ` vs ${game.opponent}` : ""}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="secondary mb-5 w-full" onClick={onOpenSchedule}>
          <CalendarDays size={17} />
          {readOnly ? "スケジュールを見る" : "スケジュールで編集"}
        </button>

        <label>
          自チーム名
          <Input
            maxLength={80}
            value={data.teamName}
            disabled={readOnly}
            onChange={(e) => edit(setFieldUpdater("teamName", e.target.value))}
          />
        </label>

        <label>
          監督名
          <Input
            maxLength={80}
            value={data.manager}
            disabled={readOnly}
            onChange={(e) => edit(setFieldUpdater("manager", e.target.value))}
            placeholder={readOnly ? "未設定" : "監督名を入力"}
          />
        </label>

        <div className="paper-note">
          <FileDown size={21} />
          <div>
            <strong>A4横・3枚綴り</strong>
            <p>提出用2枚と空欄1枚を出力</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

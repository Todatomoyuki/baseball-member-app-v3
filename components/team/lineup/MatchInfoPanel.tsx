"use client";
import { useState } from "react";
import { CalendarDays, ChevronDown, FileDown, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { TeamData } from "@/lib/model";
import { mapLinks, type ScheduleGame } from "@/lib/schedule";
import { setFieldUpdater } from "../lib/lineup-actions";
import { NamePickerModal } from "../modals/NamePickerModal";
import { scheduleNameOptions } from "../lib/schedule-options";

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
 * 大会名と相手チーム名は候補から選ぶ方式なので、押されたらモーダルを開くだけにしています。
 */
export function MatchInfoPanel({
  data,
  scheduleOptions,
  onOpenSchedule,
  readOnly,
  edit,
  infoOpen,
  onToggleInfo,
  tournamentPickerOpen,
  onOpenTournamentPicker,
  teamPickerOpen,
  onOpenTeamPicker,
}: {
  data: TeamData;
  scheduleOptions: ScheduleOption[];
  onOpenSchedule: () => void;
  readOnly: boolean;
  edit: (fn: (d: TeamData) => TeamData) => void;
  infoOpen: boolean;
  onToggleInfo: () => void;
  tournamentPickerOpen: boolean;
  onOpenTournamentPicker: () => void;
  teamPickerOpen: boolean;
  onOpenTeamPicker: () => void;
}) {
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const schedules = scheduleOptions.filter((game) => game.date === data.date).sort(compareSchedules);
  const linked = data.scheduleId !== null;
  const detailsReadOnly = readOnly || linked;
  const links = mapLinks(data);
  const locations = scheduleNameOptions(scheduleOptions, { title: [], opponent: [], location: [data.location] }).location;

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
            <option value="" disabled>{schedules.length ? "予定を選択" : "予定はありません（手入力）"}</option>
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
          大会名
          <button
            className="combobox-trigger"
            aria-haspopup="dialog"
            aria-expanded={!detailsReadOnly && tournamentPickerOpen}
            disabled={detailsReadOnly}
            onClick={onOpenTournamentPicker}
          >
            <span className={!data.tournament ? "placeholder" : ""}>
              {data.tournament || (detailsReadOnly ? "未設定" : "大会を検索・追加")}
            </span>
            {!detailsReadOnly && <ChevronDown size={16} />}
          </button>
        </label>

        <label>
          相手チーム名
          <button
            className="combobox-trigger"
            aria-haspopup="dialog"
            aria-expanded={!detailsReadOnly && teamPickerOpen}
            disabled={detailsReadOnly}
            onClick={onOpenTeamPicker}
          >
            <span className={!data.opponent ? "placeholder" : ""}>
              {data.opponent || (detailsReadOnly ? "未設定" : "チームを検索・追加")}
            </span>
            {!detailsReadOnly && <ChevronDown size={16} />}
          </button>
        </label>

        <label>
          開始時刻
          <Input
            type="time"
            value={data.startTime}
            disabled={detailsReadOnly}
            onChange={(e) => edit(setFieldUpdater("startTime", e.target.value))}
          />
        </label>

        <label>
          場所
          <button
            type="button"
            className="combobox-trigger"
            aria-haspopup="dialog"
            aria-expanded={!detailsReadOnly && locationPickerOpen}
            disabled={detailsReadOnly}
            onClick={() => setLocationPickerOpen(true)}
          >
            <span className={data.location ? "" : "placeholder"}>{data.location || (detailsReadOnly ? "未設定" : "場所を検索・追加")}</span>
            {!detailsReadOnly && <ChevronDown size={16} />}
          </button>
        </label>

        {(links || data.mapUrl) && (
          <div className="mb-5 flex flex-wrap gap-3 text-sm text-[#0876c9]" aria-label="会場の地図">
            {data.mapUrl && /^https?:\/\//i.test(data.mapUrl) && (
              <a href={data.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                <MapPin size={15} />登録した地図
              </a>
            )}
            {links && <>
              <a href={links.google} target="_blank" rel="noopener noreferrer" className="underline">Google マップ</a>
              <a href={links.apple} target="_blank" rel="noopener noreferrer" className="underline">Apple マップ</a>
            </>}
          </div>
        )}

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
      <NamePickerModal
        open={!detailsReadOnly && locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        title="場所を選択"
        description="登録済みの場所を検索、または新しい球場名・住所を追加できます。"
        placeholder="球場名・住所を検索・入力"
        searchLabel="場所を検索"
        emptyMessage="球場名や住所を入力すると追加できます。"
        options={locations}
        maxLength={200}
        allowClear
        onSelect={(name) => { edit(setFieldUpdater("location", name)); setLocationPickerOpen(false); }}
      />
    </aside>
  );
}

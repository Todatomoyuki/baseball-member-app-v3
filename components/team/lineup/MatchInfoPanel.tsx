"use client";
import { CalendarDays, ChevronDown, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { TeamData } from "@/lib/model";
import { setFieldUpdater } from "../lib/lineup-actions";

/**
 * 左側（スマホでは折りたたみ）の試合情報パネル。
 * 大会名と相手チーム名は候補から選ぶ方式なので、押されたらモーダルを開くだけにしています。
 */
export function MatchInfoPanel({
  data,
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
  readOnly: boolean;
  edit: (fn: (d: TeamData) => TeamData) => void;
  infoOpen: boolean;
  onToggleInfo: () => void;
  tournamentPickerOpen: boolean;
  onOpenTournamentPicker: () => void;
  teamPickerOpen: boolean;
  onOpenTeamPicker: () => void;
}) {
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
          大会名
          <button
            className="combobox-trigger"
            role="combobox"
            aria-expanded={!readOnly && tournamentPickerOpen}
            disabled={readOnly}
            onClick={onOpenTournamentPicker}
          >
            <span className={!data.tournament ? "placeholder" : ""}>
              {data.tournament || (readOnly ? "未設定" : "大会を検索・追加")}
            </span>
            {!readOnly && <ChevronDown size={16} />}
          </button>
        </label>

        <label>
          日付
          <Input
            type="date"
            disabled={readOnly}
            value={data.date}
            onChange={(e) => edit(setFieldUpdater("date", e.target.value))}
          />
        </label>

        <label>
          相手チーム名
          <button
            className="combobox-trigger"
            role="combobox"
            aria-expanded={!readOnly && teamPickerOpen}
            disabled={readOnly}
            onClick={onOpenTeamPicker}
          >
            <span className={!data.opponent ? "placeholder" : ""}>
              {data.opponent || (readOnly ? "未設定" : "チームを検索・追加")}
            </span>
            {!readOnly && <ChevronDown size={16} />}
          </button>
        </label>

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

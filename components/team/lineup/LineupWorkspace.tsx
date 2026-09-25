"use client";
import type { Player, TeamData } from "@/lib/model";
import type { ScheduleGame, ScheduleResponse } from "@/lib/schedule";
import { MatchInfoPanel } from "./MatchInfoPanel";
import { OrderPanel } from "./OrderPanel";

/**
 * 「オーダー」タブのレイアウト。
 * 試合情報とオーダー編集を並べ、出欠は各選手の行に表示します。
 */
export function LineupWorkspace({
  data,
  scheduleOptions,
  attendance,
  attendanceScheduleId,
  onOpenSchedule,
  readOnly,
  edit,
  bench,
  absent,
  infoOpen,
  onToggleInfo,
  tournamentPickerOpen,
  onOpenTournamentPicker,
  teamPickerOpen,
  onOpenTeamPicker,
  onPickPlayer,
  onPickPosition,
  onEditPlayer,
  onAddPlayer,
}: {
  data: TeamData;
  scheduleOptions: Array<Omit<ScheduleGame, "responses">>;
  attendance: Record<string, ScheduleResponse>;
  attendanceScheduleId: string | null;
  onOpenSchedule: () => void;
  readOnly: boolean;
  edit: (fn: (d: TeamData) => TeamData) => void;
  bench: Player[];
  absent: Player[];
  infoOpen: boolean;
  onToggleInfo: () => void;
  tournamentPickerOpen: boolean;
  onOpenTournamentPicker: () => void;
  teamPickerOpen: boolean;
  onOpenTeamPicker: () => void;
  onPickPlayer: (target: string) => void;
  onPickPosition: (index: number) => void;
  onEditPlayer: (player: Player) => void;
  onAddPlayer: () => void;
}) {
  return (
    <div className={`workspace lineup-workspace ${readOnly ? "lineup-readonly" : ""}`}>
      <MatchInfoPanel
        data={data}
        scheduleOptions={scheduleOptions}
        onOpenSchedule={onOpenSchedule}
        readOnly={readOnly}
        edit={edit}
        infoOpen={infoOpen}
        onToggleInfo={onToggleInfo}
        tournamentPickerOpen={tournamentPickerOpen}
        onOpenTournamentPicker={onOpenTournamentPicker}
        teamPickerOpen={teamPickerOpen}
        onOpenTeamPicker={onOpenTeamPicker}
      />
      <OrderPanel
        data={data}
        attendance={data.scheduleId !== null && data.scheduleId === attendanceScheduleId ? attendance : null}
        readOnly={readOnly}
        edit={edit}
        bench={bench}
        absent={absent}
        onPickPlayer={onPickPlayer}
        onPickPosition={onPickPosition}
        onEditPlayer={onEditPlayer}
        onAddPlayer={onAddPlayer}
      />
    </div>
  );
}

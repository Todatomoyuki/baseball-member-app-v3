"use client";
import type { Player, TeamData } from "@/lib/model";
import { MatchInfoPanel } from "./MatchInfoPanel";
import { OrderPanel } from "./OrderPanel";

/**
 * 「オーダー」タブのレイアウト。
 * 左に試合情報、右にオーダー編集を並べるだけのコンポーネントです。
 */
export function LineupWorkspace({
  data,
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
    <div className="workspace">
      <MatchInfoPanel
        data={data}
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

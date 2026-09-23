"use client";
import { useCallback, useMemo } from "react";
import {
  absentPlayers,
  benchPlayers,
  type Player,
  type Position,
} from "@/lib/model";

import { useTeamData } from "./hooks/useTeamData";
import { useTeamUiState } from "./hooks/useTeamUiState";
import { usePdfExport } from "./hooks/usePdfExport";
import { useLineupTool } from "./hooks/useLineupTool";
import { EquipmentView } from "./equipment/EquipmentView";
import { StatsView } from "./stats/StatsView";

import {
  pickOpponentUpdater,
  pickTournamentUpdater,
  removePlayerUpdater,
  selectPlayerUpdater,
  setPositionUpdater,
  shiftOrderUpdater,
  toggleAbsentUpdater,
  upsertPlayerUpdater,
} from "./lib/lineup-actions";

import { LoginScreen } from "./LoginScreen";
import { TopBar } from "./TopBar";
import { PageHeading } from "./PageHeading";
import { TabNav } from "./TabNav";
import { ErrorBanner } from "./ErrorBanner";
import { MobileBottomBar } from "./MobileBottomBar";
import { LineupWorkspace } from "./lineup/LineupWorkspace";
import { RosterPanel } from "./roster/RosterPanel";

import { PlayerEditorModal } from "./modals/PlayerEditorModal";
import { PlayerPickerModal } from "./modals/PlayerPickerModal";
import { PositionPickerModal } from "./modals/PositionPickerModal";
import { NamePickerModal } from "./modals/NamePickerModal";
import { SettingsModal } from "./modals/SettingsModal";
import { ReauthModal } from "./modals/ReauthModal";
import { PdfWarningModal } from "./modals/PdfWarningModal";
import { PdfReadyModal } from "./modals/PdfReadyModal";
import { AppMenuModal } from "./modals/AppMenuModal";

/**
 * メンバー表アプリのルートコンポーネント。
 *
 * ここは「状態を集めて、子コンポーネントに配る」係に徹しています。
 *  - サーバー同期        → useTeamData
 *  - モーダルの開閉など  → useTeamUiState
 *  - PDF 出力            → usePdfExport
 *  - データ変換ロジック  → lib/lineup-actions.ts
 *
 * 新しい画面を足すときは components/team/ 配下にコンポーネントを作り、
 * ここから呼び出してください。
 */
export function TeamApp() {
  const team = useTeamData();
  const ui = useTeamUiState();
  const pdf = usePdfExport(team.data, team.setError);

  useLineupTool(team.data, team.auth);

  const { data, edit } = team;
  const { pick, setPick, positionIndex, setPositionIndex, setEditor } = ui;

  const bench = useMemo(() => benchPlayers(data), [data]);
  const absent = useMemo(() => absentPlayers(data), [data]);

  /* ---------------- オーダー操作 ---------------- */

  const selectPlayer = useCallback(
    (playerId: string | null) => {
      if (pick === null) return;
      edit(selectPlayerUpdater(pick, playerId));
      setPick(null);
    },
    [edit, pick, setPick],
  );

  const changePosition = useCallback(
    (position: Position) => {
      if (positionIndex === null) return;
      edit(setPositionUpdater(positionIndex, position));
      setPositionIndex(null);
    },
    [edit, positionIndex, setPositionIndex],
  );

  /* ---------------- 名簿操作 ---------------- */

  const savePlayer = useCallback(
    (player: Player) => edit(upsertPlayerUpdater(player)),
    [edit],
  );

  const deletePlayer = useCallback(
    (player: Player) => {
      if (!window.confirm(`${player.name}さんを名簿から削除しますか？`)) return;
      edit(removePlayerUpdater(player.id));
      setEditor(null);
    },
    [edit, setEditor],
  );

  const toggleAbsent = useCallback(
    (player: Player) => {
      edit(toggleAbsentUpdater(player.id));
      setEditor(null);
    },
    [edit, setEditor],
  );

  /* ---------------- ログアウト ---------------- */

  const requestLogout = useCallback(async () => {
    if (
      team.saveState !== "saved" &&
      !window.confirm("未保存の変更があります。ログアウトしますか？")
    )
      return;
    await team.logout();
    ui.setSettings(false);
    pdf.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.saveState, team.logout, ui.setSettings, pdf.clear]);

  /* ---------------- 未ログイン ---------------- */

  if (team.auth !== "ready") {
    return (
      <LoginScreen
        auth={team.auth}
        password={team.password}
        onPasswordChange={team.setPassword}
        onSubmit={team.login}
        busy={team.loginBusy}
        error={team.loginError}
        onBrandClick={() => ui.setAppMenuOpen(true)}
      />
    );
  }

  /* ---------------- 本画面 ---------------- */

  return (
    <main className="app-shell">
      <TopBar
        onBrandClick={() => ui.setAppMenuOpen(true)}
        onSettingsClick={() => ui.setSettings(true)}
      />

      {ui.appView === "equipment" ? (
        <EquipmentView players={data.players} />
      ) : ui.appView === "stats" ? (
        <StatsView players={data.players} />
      ) : (
        <>
          <PageHeading
            teamName={data.teamName}
            pdfBusy={pdf.busy}
            onCreatePdf={() => void pdf.create()}
          />

          <TabNav
            tab={ui.tab}
            onChange={ui.setTab}
            playerCount={data.players.length}
            saveState={team.saveState}
          />

          <ErrorBanner
            message={team.error}
            saveState={team.saveState}
            onReload={() => {
              if (
                window.confirm(
                  "画面上の未保存の変更を破棄し、最新データに置き換えますか？",
                )
              )
                void team.load().catch((e: Error) => team.setError(e.message));
            }}
            onRetry={() => {
              team.setError("");
              if (team.saveState === "error") team.setSaveState("dirty");
            }}
          />

          {ui.tab === "order" ? (
            <LineupWorkspace
              data={data}
              edit={edit}
              bench={bench}
              absent={absent}
              infoOpen={ui.infoOpen}
              onToggleInfo={() => ui.setInfoOpen(!ui.infoOpen)}
              tournamentPickerOpen={ui.tournamentPicker}
              onOpenTournamentPicker={() => ui.setTournamentPicker(true)}
              teamPickerOpen={ui.teamPicker}
              onOpenTeamPicker={() => ui.setTeamPicker(true)}
              onPickPlayer={ui.setPick}
              onPickPosition={ui.setPositionIndex}
              onEditPlayer={ui.setEditor}
              onAddPlayer={() => ui.setEditor("new")}
            />
          ) : (
            <RosterPanel
              players={data.players}
              bench={bench}
              absent={absent}
              onAddPlayer={() => ui.setEditor("new")}
              onEditPlayer={ui.setEditor}
            />
          )}

          <footer>{data.teamName} · メンバー表</footer>

          <MobileBottomBar
            tab={ui.tab}
            onToggleTab={() =>
              ui.setTab(ui.tab === "order" ? "players" : "order")
            }
            pdfBusy={pdf.busy}
            onCreatePdf={() => void pdf.create()}
          />
        </>
      )}

      {/* ------------------------- モーダル群 ------------------------- */}

      <ReauthModal
        open={team.reauth}
        onClose={() => team.setReauth(false)}
        onSuccess={team.resumeAfterReauth}
      />

      <PlayerEditorModal
        target={ui.editor}
        bench={bench}
        absent={absent}
        onClose={() => ui.setEditor(null)}
        onSave={savePlayer}
        onDelete={deletePlayer}
        onToggleAbsent={toggleAbsent}
      />

      <PlayerPickerModal
        target={ui.pick}
        players={data.players}
        bench={bench}
        absent={absent}
        onClose={() => ui.setPick(null)}
        onSelect={selectPlayer}
        onShiftOrder={(index, delta) => edit(shiftOrderUpdater(index, delta))}
        onAddPlayer={() => {
          ui.setPick(null);
          ui.setEditor("new");
        }}
      />

      <PositionPickerModal
        index={ui.positionIndex}
        data={data}
        onClose={() => ui.setPositionIndex(null)}
        onSelect={changePosition}
      />

      <NamePickerModal
        open={ui.teamPicker}
        onClose={() => ui.setTeamPicker(false)}
        title="相手チームを選択"
        description="登録済みのチームを検索、または新しく追加できます。"
        placeholder="チーム名を検索・入力"
        searchLabel="チーム名を検索"
        emptyMessage="チーム名を入力すると追加できます。"
        options={data.opponents}
        onSelect={(name, isNew) => {
          edit(pickOpponentUpdater(name, isNew));
          ui.setTeamPicker(false);
        }}
      />

      <NamePickerModal
        open={ui.tournamentPicker}
        onClose={() => ui.setTournamentPicker(false)}
        title="大会名を選択"
        description="過去の大会名を検索、または新しく追加できます。"
        placeholder="大会名を検索・入力"
        searchLabel="大会名を検索"
        emptyMessage="大会名を入力すると追加できます。"
        options={data.tournaments}
        onSelect={(name, isNew) => {
          edit(pickTournamentUpdater(name, isNew));
          ui.setTournamentPicker(false);
        }}
      />

      <SettingsModal
        open={ui.settings}
        onClose={() => ui.setSettings(false)}
        onRequestLogout={requestLogout}
      />

      <PdfWarningModal
        warnings={pdf.warnings}
        onClose={pdf.dismissWarnings}
        onForceCreate={() => void pdf.create(true)}
        onBackToInput={() => {
          pdf.dismissWarnings();
          ui.setInfoOpen(true);
        }}
      />

      <PdfReadyModal url={pdf.url} name={pdf.name} onClose={pdf.closePreview} />

      <AppMenuModal
        open={ui.appMenuOpen}
        onClose={() => ui.setAppMenuOpen(false)}
        onOpenLineup={() => {
          ui.setAppMenuOpen(false);
          ui.setAppView("lineup");
        }}
        onOpenEquipment={() => {
          ui.setAppView("equipment");
          ui.setAppMenuOpen(false);
        }}
        onOpenRoster={() => {
          ui.setAppMenuOpen(false);
          ui.setTab("players");
        }}
        onOpenStats={() => {
          ui.setAppView("stats");
          ui.setAppMenuOpen(false);
        }}
      />
    </main>
  );
}

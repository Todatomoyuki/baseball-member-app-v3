import type { Player } from "@/lib/model";
import type { PlayerStats } from "@/lib/stats";
import { SUMMARY_FIRST_ROW, SUMMARY_SECOND_ROW, summarizeStats, type SummaryValues } from "./stats-summary";

export function StatsValues({
  player,
  values,
  canEdit,
  onEdit,
  onDelete,
}: {
  player: Player;
  values: PlayerStats;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const summary = summarizeStats(values);
  const renderSummary = (fields: readonly (readonly [string, string])[]) =>
    fields.map(([field, label]) => (
      <span key={field}>
        <small>{label}</small>
        <strong>{summary[field as keyof SummaryValues]}</strong>
      </span>
    ));
  return (
    <div className="stats-confirm-player">
      <div className="stats-confirm-player-name">
        <strong>{player.name}</strong>
        <small>#{player.number}</small>
      </div>
      <div className="stats-confirm-summary">
        <div className="stats-summary-row first">
          {renderSummary(SUMMARY_FIRST_ROW)}
        </div>
        <div className="stats-summary-row second">
          {renderSummary(SUMMARY_SECOND_ROW)}
          <span className="stats-summary-empty" aria-hidden="true" />
        </div>
      </div>
      {canEdit && (
        <div className="stats-confirm-actions">
          <button type="button" className="stats-edit-button" onClick={onEdit}>
            編集
          </button>
          <button
            type="button"
            className="stats-delete-button"
            onClick={onDelete}
          >
            削除
          </button>
        </div>
      )}
    </div>
  );
}

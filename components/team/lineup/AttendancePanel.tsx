"use client";

import { CalendarCheck2 } from "lucide-react";
import type { Player } from "@/lib/model";
import type { ScheduleResponse } from "@/lib/schedule";

const groups = [
  { status: "attending", label: "参加" },
  { status: "absent", label: "不参加" },
  { status: "undecided", label: "未定" },
  { status: "unanswered", label: "未入力" },
] as const;

/** 出欠回答はオーダーの配置とは別に表示する。未定・未入力からは配置を推測しない。 */
export function AttendancePanel({ players, responses, linked, pending, onOpenSchedule }: {
  players: Player[];
  responses: Record<string, ScheduleResponse>;
  linked: boolean;
  pending: boolean;
  onOpenSchedule: () => void;
}) {
  return (
    <aside className="panel lineup-attendance-panel" aria-label="選択中の試合の出欠">
      <h2><CalendarCheck2 size={19} aria-hidden="true" />この試合の出欠</h2>
      {!linked ? <p className="lineup-attendance-help">予定を登録・選択すると、みんなの回答が表示されます。</p> : pending ? (
        <p className="lineup-attendance-help" role="status">選択した試合の保存後に出欠を表示します。</p>
      ) : (
        <div className="lineup-attendance-groups">
          {groups.map(({ status, label }) => {
            const members = players.filter((player) => (responses[player.id]?.status ?? "unanswered") === status);
            return <section key={status} className={`lineup-attendance-group ${status}`}>
              <h3>{label}<span>{members.length}人</span></h3>
              {members.length ? <ul>{members.map((player) => <li key={player.id}>
                <span><small>#{player.number}</small>{player.name}</span>
                {responses[player.id]?.comment && <p>{responses[player.id].comment}</p>}
              </li>)}</ul> : <p className="lineup-attendance-empty">なし</p>}
            </section>;
          })}
        </div>
      )}
      <button type="button" className="secondary" onClick={onOpenSchedule}>出欠を確認・入力</button>
    </aside>
  );
}

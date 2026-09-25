import type { ScheduleResponse } from "@/lib/schedule";

const labels = {
  attending: "参加",
  absent: "不参加",
  undecided: "未定",
  unanswered: "未入力",
} as const;

/** null は未連携・取得待ち、undefined は連携済みの試合への未回答。 */
export type PlayerAttendance = ScheduleResponse | null | undefined;

export function attendanceDescription(response: PlayerAttendance) {
  return response === null ? "" : `、出欠：${labels[response?.status ?? "unanswered"]}`;
}

export function AttendanceBadge({ response }: { response: PlayerAttendance }) {
  if (response === null) return null;
  const status = response?.status ?? "unanswered";
  const label = labels[status];
  return (
    <span
      className={`lineup-attendance-badge ${status}`}
      title={response?.comment ? `${label}：${response.comment}` : label}
    >
      {label}
    </span>
  );
}

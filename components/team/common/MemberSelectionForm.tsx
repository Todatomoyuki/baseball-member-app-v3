"use client";
import type { LoginMember } from "@/lib/auth-types";

/** 共通パスワードの確認後、この端末で利用する登録メンバーを選ぶ。 */
export function MemberSelectionForm({
  members,
  selectedMemberId,
  onMemberChange,
  onSubmit,
  busy,
  error,
}: {
  members: LoginMember[];
  selectedMemberId: string;
  onMemberChange: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
  error: string;
}) {
  return (
    <form onSubmit={onSubmit}>
      <label>
        あなたの名前を教えてください
        <select
          required
          value={selectedMemberId}
          onChange={(e) => onMemberChange(e.target.value)}
          disabled={busy || members.length === 0}
        >
          <option value="" disabled>登録メンバーから選択</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}{member.number ? `（背番号 ${member.number}）` : ""}
            </option>
          ))}
        </select>
      </label>
      <p className="modal-description">
        {members.length === 0
          ? "登録メンバーがいません。管理者にメンバー登録を依頼してください。"
          : "選んだ名前をこの端末に保存します。ご本人の名前を選んでください。"}
      </p>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="primary full" disabled={busy || !selectedMemberId}>
        {busy ? "確認中…" : "この名前で利用する"}
      </button>
    </form>
  );
}

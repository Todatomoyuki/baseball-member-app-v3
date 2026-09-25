"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { AuthMember } from "@/lib/auth-types";
import { Modal } from "../common/Modal";
import { SaveStateLabel } from "../common/SaveStateLabel";
import { api } from "../lib/api";
import type { SaveState } from "../types";

type TeamInfo = { teamName: string; manager: string };

function TeamInfoForm({
  teamName,
  manager,
  onUpdateTeamInfo,
  saveState,
  error,
}: TeamInfo & {
  onUpdateTeamInfo: (values: TeamInfo) => void;
  saveState: SaveState;
  error: string;
}) {
  const [values, setValues] = useState({ teamName, manager });
  const [submitted, setSubmitted] = useState(false);
  const changed = values.teamName.trim() !== teamName || values.manager.trim() !== manager;
  const saving = saveState === "saving" || saveState === "dirty";

  return (
    <form
      className="mb-6"
      onSubmit={(event) => {
        event.preventDefault();
        const next = { teamName: values.teamName.trim(), manager: values.manager.trim() };
        if (!next.teamName || !next.manager || saving || saveState === "conflict") return;
        onUpdateTeamInfo(next);
        setSubmitted(true);
      }}
    >
      <label>
        自チーム名
        <Input
          required
          maxLength={80}
          value={values.teamName}
          onChange={(event) => setValues((current) => ({ ...current, teamName: event.target.value }))}
        />
      </label>
      <label>
        監督名
        <Input
          required
          maxLength={80}
          value={values.manager}
          onChange={(event) => setValues((current) => ({ ...current, manager: event.target.value }))}
        />
      </label>
      <button
        type="submit"
        className="primary full"
        disabled={saving || saveState === "conflict" || !values.teamName.trim() || !values.manager.trim() || (!changed && saveState !== "error")}
      >
        チーム情報を保存
      </button>
      {submitted && !changed && <p className={`schedule-form-save-state ${saveState}`} role="status"><SaveStateLabel state={saveState} /></p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {saveState === "conflict" && <p className="modal-description">この画面を閉じ、オーダー画面で最新データを読み込んでから再度編集してください。</p>}
    </form>
  );
}

/**
 * チーム設定モーダル（管理者のチーム情報・共通パスワード変更 + ログアウト）。
 * フォームの状態はこの中だけで完結させています。
 *
 * @param onRequestLogout 失敗時は throw してください。メッセージをここで表示します。
 */
export function SettingsModal({
  open,
  onClose,
  onRequestLogout,
  member,
  teamName,
  manager,
  onUpdateTeamInfo,
  saveState,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onRequestLogout: () => Promise<void>;
  member: AuthMember | null;
  teamName: string;
  manager: string;
  onUpdateTeamInfo: (values: TeamInfo) => void;
  saveState: SaveState;
  error: string;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!member?.isAdmin) return;
    if (newPassword !== confirmPassword) {
      setMessage("新しいパスワードが一致しません。");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth", "PUT", {
        current: oldPassword,
        password: newPassword,
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(
        "パスワードを変更しました。チームに新しいパスワードをお知らせください。",
      );
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await onRequestLogout();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="チームの設定"
      description={member?.isAdmin
        ? "共通パスワードを変更すると、ほかの端末は再ログインが必要です。"
        : "チーム情報・共通パスワードの変更は管理者のみ行えます。"}
    >
      {member && (
        <p className="modal-description">
          この端末のメンバー：{member.name}{member.isAdmin ? "（管理者）" : ""}
        </p>
      )}
      {open && member?.isAdmin && (
        <TeamInfoForm
          key={member.id}
          teamName={teamName}
          manager={manager}
          onUpdateTeamInfo={onUpdateTeamInfo}
          saveState={saveState}
          error={error}
        />
      )}
      {member?.isAdmin && (
        <form onSubmit={submit}>
          <label>
            現在のパスワード
            <Input
              required
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              maxLength={128}
            />
          </label>
          <label>
            新しいパスワード（12文字以上）
            <Input
              required
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label>
            新しいパスワード（確認）
            <Input
              required
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          <button className="primary full" disabled={busy}>
            パスワードを変更
          </button>
        </form>
      )}

      {message && <p role="status">{message}</p>}

      <button className="logout-button" onClick={() => void logout()}>
        <LogOut size={17} />
        この端末からログアウト
      </button>
      <p className="modal-description">
        ログイン状態は利用時に延長します。ブラウザーのデータ削除やパスワード変更後は再ログインが必要です。
      </p>
    </Modal>
  );
}

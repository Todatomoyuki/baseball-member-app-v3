"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Modal } from "../common/Modal";
import { api } from "../lib/api";

/**
 * チーム設定モーダル（共通パスワードの変更 + ログアウト）。
 * フォームの状態はこの中だけで完結させています。
 *
 * @param onRequestLogout 失敗時は throw してください。メッセージをここで表示します。
 */
export function SettingsModal({
  open,
  onClose,
  onRequestLogout,
}: {
  open: boolean;
  onClose: () => void;
  onRequestLogout: () => Promise<void>;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
      description="共通パスワードを変更すると、ほかの端末は再ログインが必要です。"
    >
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
        {message && <p role="status">{message}</p>}
        <button className="primary full" disabled={busy}>
          パスワードを変更
        </button>
      </form>

      <button className="logout-button" onClick={() => void logout()}>
        <LogOut size={17} />
        この端末からログアウト
      </button>
      <p className="modal-description">
        ログイン状態は180日間保持し、利用時に延長します。ブラウザーのデータを消去した場合は再ログインが必要です。
      </p>
    </Modal>
  );
}

"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Modal } from "../common/Modal";
import { api } from "../lib/api";

/**
 * 保存中にセッションが切れた（401）ときに出る再ログインモーダル。
 * 編集中の内容は画面に残したまま、ログインし直して保存を再開します。
 */
export function ReauthModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  /** ログイン成功時。保存状態を "dirty" に戻して自動保存を再開させる */
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth", "POST", { password });
      setPassword("");
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="再ログイン"
      description="編集内容を残したままログインし直します。"
    >
      <form onSubmit={submit}>
        <label>
          チーム共通パスワード
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="primary full" disabled={busy}>
          ログインして保存を再開
        </button>
      </form>
    </Modal>
  );
}

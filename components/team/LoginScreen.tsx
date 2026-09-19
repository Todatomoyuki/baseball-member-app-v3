"use client";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BrandButton } from "./common/BrandButton";
import type { AuthState } from "./types";

/**
 * 未ログイン時に表示する画面。
 * auth === "loading" のあいだは確認中メッセージだけを出します。
 */
export function LoginScreen({
  auth,
  password,
  onPasswordChange,
  onSubmit,
  busy,
  error,
  onBrandClick,
}: {
  auth: AuthState;
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
  error: string;
  onBrandClick: () => void;
}) {
  return (
    <main className="login-page">
      <div className="login-brand">
        <BrandButton onClick={onBrandClick} />
      </div>
      <section className="login-card">
        <div className="lock-icon">
          <LockKeyhole size={28} />
        </div>
        <p className="eyebrow">TEAM MEMBERS ONLY</p>
        <h1>チームのメンバー表</h1>
        <p className="login-intro">
          共通パスワードでログインして、
          <br />
          試合のオーダーを準備しましょう。
        </p>

        {auth === "loading" ? (
          <p role="status">ログイン状態を確認しています…</p>
        ) : (
          <form onSubmit={onSubmit}>
            <label>
              チーム共通パスワード
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="パスワードを入力"
                maxLength={128}
              />
            </label>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy ? "確認中…" : "ログイン"}
            </button>
          </form>
        )}

        <p className="login-note">
          <ShieldCheck size={16} />
          この端末のログイン状態を保持します
        </p>
      </section>
      <p className="login-footer">草野球の試合準備を、もっとスムーズに。</p>
    </main>
  );
}

/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation releases game animations. */
import type { ReactNode } from "react";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import styles from "./Games.module.css";

export function GameShell({ children, memberName, isGame = false }: { children: ReactNode; memberName?: string; isGame?: boolean }) {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.nav}>
          <a href={isGame ? "/game" : "/"} className={styles.back}><ArrowLeft size={16} aria-hidden="true" />{isGame ? "ゲーム一覧" : "チームに戻る"}</a>
          {memberName && <span className={styles.member}><span aria-hidden="true">●</span>{memberName}</span>}
        </header>
        {children}
        <footer className={styles.footer}><Gamepad2 size={16} aria-hidden="true" />YG MINI GAMES<span>チームで遊ぶ、小さなゲームセンター。</span></footer>
      </div>
    </main>
  );
}

export function GameAccessState({ loading, unauthorized, error, onRetry }: { loading: boolean; unauthorized: boolean; error: string; onRetry: () => void }) {
  return (
    <div className={styles.accessState}>
      <Gamepad2 size={38} aria-hidden="true" />
      {loading ? <p role="status">ゲームを準備しています…</p> : unauthorized ? <><h1>YG ミニゲーム</h1><p>ログインして、チームのみんなと記録を競おう。</p><a href="/" className={styles.primary}>チーム画面でログイン</a></> : <><p role="alert">{error || "ゲームを読み込めませんでした。"}</p><button type="button" className={styles.primary} onClick={onRetry}>再読み込み</button></>}
    </div>
  );
}

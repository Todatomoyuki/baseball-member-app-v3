"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { initialData, type TeamData } from "@/lib/model";
import { api, type ApiError, type TeamPollResponse } from "../lib/api";
import type { AuthState, SaveState } from "../types";

/**
 * チームデータのロード・自動保存・ログイン状態をまとめて扱うフック。
 *
 * ここが担当するのは「サーバーとの同期」だけで、画面の見た目には関与しません。
 *  - 起動時の認証チェック + 初回ロード
 *  - 変更から 650ms 後のデバウンス自動保存（楽観ロック: revision）
 *  - 60 秒ごとの条件付きポーリング（自分が編集中でないときだけ最新を取り込む）
 *  - 未保存のままページを離れようとしたときの警告
 */
export function useTeamData() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [data, setData] = useState<TeamData>(initialData);
  const [revision, setRevision] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState("");
  const [reauth, setReauth] = useState(false);

  // ログインフォーム
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  /** 最後にサーバーへ保存できた内容（JSON 文字列） */
  const saved = useRef("");
  /** 保存リクエストが飛んでいる最中かどうか */
  const saving = useRef(false);
  /** 取得後に編集・保存などが始まった場合、古いポーリング応答を破棄する。 */
  const syncVersion = useRef(0);
  /** 画面が今持っている内容。ポーリングの判定で参照する */
  const currentDraft = useRef("");
  currentDraft.current = JSON.stringify(data);

  /* ---------------- ロード ---------------- */

  const load = useCallback(async () => {
    syncVersion.current += 1;
    const result = await api("/api/team");
    saved.current = JSON.stringify(result.data);
    setData(result.data);
    setRevision(result.revision);
    setSaveState("saved");
    setError("");
    setAuth("ready");
  }, []);

  useEffect(() => {
    void api("/api/auth")
      .then((r) => (r.authenticated ? load() : setAuth("login")))
      .catch((e: Error) => {
        setLoginError(e.message);
        setAuth("login");
      });
  }, [load]);

  /* ---------------- 編集 ---------------- */

  /** TeamData を書き換える唯一の入口。複製済みの draft を渡すので破壊的に触ってよい */
  const edit = useCallback((fn: (d: TeamData) => TeamData) => {
    syncVersion.current += 1;
    setData((current) => fn(structuredClone(current)));
    setSaveState((v) => (v === "conflict" ? v : "dirty"));
  }, []);

  /* ---------------- 自動保存 ---------------- */

  useEffect(() => {
    if (
      auth !== "ready" ||
      saveState !== "dirty" ||
      saving.current ||
      JSON.stringify(data) === saved.current
    )
      return;
    const timer = setTimeout(async () => {
      const payload = JSON.stringify(data);
      syncVersion.current += 1;
      saving.current = true;
      setSaveState("saving");
      try {
        const result = await api("/api/team", "PUT", { data, revision });
        saved.current = payload;
        setRevision(result.revision);
        setSaveState(currentDraft.current === payload ? "saved" : "dirty");
        setError("");
      } catch (e) {
        const err = e as ApiError;
        setError(err.message);
        if (err.status === 401) setReauth(true);
        setSaveState(err.status === 409 ? "conflict" : "error");
      } finally {
        saving.current = false;
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [data, revision, auth, saveState]);

  /** 保存済みの内容と一致したら "保存済み" 表示に戻す */
  useEffect(() => {
    if (
      saveState === "dirty" &&
      !saving.current &&
      JSON.stringify(data) === saved.current
    )
      setSaveState("saved");
  }, [data, saveState, revision]);

  /* ---------------- ポーリング ---------------- */

  useEffect(() => {
    if (auth !== "ready") return;
    let active = true;
    let polling = false;
    const id = setInterval(() => {
      if (
        polling ||
        saving.current ||
        currentDraft.current !== saved.current ||
        document.visibilityState !== "visible"
      )
        return;
      const requestVersion = syncVersion.current;
      polling = true;
      void api<TeamPollResponse>(`/api/team?revision=${revision}`)
        .then((r) => {
          if (
            active &&
            !r.unchanged &&
            !saving.current &&
            requestVersion === syncVersion.current &&
            r.revision !== revision &&
            currentDraft.current === saved.current &&
            document.visibilityState === "visible"
          ) {
            saved.current = JSON.stringify(r.data);
            setData(r.data);
            setRevision(r.revision);
          }
        })
        .catch(() => {})
        .finally(() => { polling = false; });
    }, 60000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [auth, data, revision]);

  /* ---------------- 離脱警告 ---------------- */

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (
        (saving.current || JSON.stringify(data) !== saved.current) &&
        auth === "ready"
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [data, auth]);

  /* ---------------- 認証 ---------------- */

  const login = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginBusy(true);
      setLoginError("");
      try {
        await api("/api/auth", "POST", { password });
        setPassword("");
        await load();
      } catch (err) {
        setLoginError((err as Error).message);
      } finally {
        setLoginBusy(false);
      }
    },
    [password, load],
  );

  /** ログアウト。失敗した場合は呼び出し側で catch してメッセージを出す */
  const logout = useCallback(async () => {
    syncVersion.current += 1;
    await api("/api/auth", "DELETE");
    saved.current = "";
    setData(initialData());
    setAuth("login");
    setError("");
  }, []);

  /** 再ログイン成功後、保存を再開する */
  const resumeAfterReauth = useCallback(() => {
    setReauth(false);
    setSaveState("dirty");
    setError("");
  }, []);

  return {
    // データ
    auth,
    data,
    edit,
    revision,
    load,
    // 保存状態
    saveState,
    setSaveState,
    error,
    setError,
    // 認証
    password,
    setPassword,
    loginBusy,
    loginError,
    login,
    logout,
    reauth,
    setReauth,
    resumeAfterReauth,
  };
}

export type TeamDataStore = ReturnType<typeof useTeamData>;

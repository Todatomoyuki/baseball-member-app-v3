"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { initialStatsData, type StatsData } from "@/lib/stats";
import type { SaveState } from "../types";

type StatsResponse = { data: StatsData; revision: number; error?: string };
async function statsApi(method = "GET", body?: unknown): Promise<StatsResponse> {
  const response = await fetch("/api/stats", { method, credentials: "same-origin", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const value = (await response.json()) as StatsResponse;
  if (!response.ok) throw Object.assign(new Error(value.error ?? "成績データを処理できませんでした。"), { status: response.status });
  return value;
}

export function useStatsData() {
  const [data, setData] = useState<StatsData>(initialStatsData());
  const [revision, setRevision] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const saved = useRef("");
  const saving = useRef(false);
  const currentDraft = useRef("");
  currentDraft.current = JSON.stringify(data);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await statsApi();
      setData(result.data); setRevision(result.revision); saved.current = JSON.stringify(result.data); setSaveState("saved");
    }
    catch (e) { setError(e instanceof Error ? e.message : "成績データを読み込めませんでした。"); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const edit = useCallback((updater: StatsData | ((current: StatsData) => StatsData)) => {
    setData((current) => typeof updater === "function" ? updater(structuredClone(current)) : updater);
    setSaveState((current) => current === "conflict" ? current : "dirty");
  }, []);
  useEffect(() => {
    if (loading || saveState !== "dirty" || saving.current || JSON.stringify(data) === saved.current) return;
    const timer = window.setTimeout(async () => {
      const payload = JSON.stringify(data); saving.current = true; setSaveState("saving");
      try {
        const previous = saved.current ? JSON.parse(saved.current) as StatsData : initialStatsData();
        const games = Object.fromEntries(
          Object.entries(data.games).filter(([key, game]) =>
            JSON.stringify(game) !== JSON.stringify(previous.games[key]),
          ),
        );
        const removedGames = Object.keys(previous.games).filter((key) => !Object.hasOwn(data.games, key));
        const result = await statsApi("PUT", { data: { games }, removedGames, partial: true, revision });
        saved.current = payload;
        setRevision(result.revision);
        setSaveState(currentDraft.current === payload ? "saved" : "dirty");
        setError("");
      }
      catch (e) { const error = e as Error & { status?: number }; setError(error.message); setSaveState(error.status === 409 ? "conflict" : "error"); }
      finally { saving.current = false; }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [data, revision, saveState, loading]);
  useEffect(() => {
    if (saveState === "dirty" && !saving.current && JSON.stringify(data) === saved.current) {
      setSaveState("saved");
    }
  }, [data, revision, saveState]);
  return { data, loading, error, setError, saveState, edit, load };
}

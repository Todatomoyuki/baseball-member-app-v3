"use client";
import { useEffect } from "react";
import { absentPlayers, benchPlayers, type TeamData } from "@/lib/model";
import type { AuthState } from "../types";

type ModelContext = {
  registerTool: (tool: unknown, options: unknown) => unknown;
};

/**
 * ブラウザーの document.modelContext に「現在のメンバー表を読み取る」ツールを登録する。
 * 対応していないブラウザーでは何もしません（読み取り専用・保存はしない）。
 */
export function useLineupTool(data: TeamData, auth: AuthState) {
  useEffect(() => {
    const ctx = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!ctx || auth !== "ready") return;

    const life = new AbortController();
    try {
      void Promise.resolve(
        ctx.registerTool(
          {
            name: "get_baseball_lineup",
            title: "現在のメンバー表を確認",
            description:
              "ログイン済みの画面に表示中の打順・守備・控え選手・試合情報を読み取る。保存や変更はしません。",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: {
              readOnlyHint: true,
              untrustedContentHint: true,
            },
            execute: () => ({
              team: data.teamName,
              date: data.date,
              opponent: data.opponent,
              mode: data.mode,
              starters: data.slots.map((s, i) => ({
                order: i + 1,
                position: s.position,
                player: data.players.find((p) => p.id === s.playerId) ?? null,
              })),
              pitcher: data.players.find((p) => p.id === data.pitcher) ?? null,
              bench: benchPlayers(data),
              absent: absentPlayers(data),
            }),
          },
          { signal: life.signal },
        ),
      ).catch(() => {});
    } catch {
      /* 登録に失敗しても画面の動作には影響させない */
    }
    return () => life.abort();
  }, [data, auth]);
}

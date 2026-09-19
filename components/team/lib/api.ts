import type { TeamData } from "@/lib/model";

/** サーバーから返ってくる共通レスポンス */
export type ApiResponse = {
  error?: string;
  data: TeamData;
  revision: number;
  authenticated: boolean;
};

/** HTTP ステータスを持たせたエラー（401 / 409 の分岐に使用） */
export type ApiError = Error & { status?: number };

/**
 * /api/* への共通フェッチャー。
 * 失敗時はサーバーの error メッセージと status を持つ Error を throw します。
 */
export async function api(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown,
): Promise<ApiResponse> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = (await res.json()) as ApiResponse;
  if (!res.ok) {
    throw Object.assign(new Error(value.error || "通信できませんでした。"), {
      status: res.status,
    });
  }
  return value;
}

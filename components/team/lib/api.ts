import type { TeamData } from "@/lib/model";
import type { AuthMember } from "@/lib/auth-types";

/** サーバーから返ってくる共通レスポンス */
export type ApiResponse = {
  error?: string;
  data: TeamData;
  revision: number;
  authenticated: boolean;
};

export type TeamLoadResponse = {
  data: TeamData;
  revision: number;
  member: AuthMember;
};

/** revision を指定したチーム取得だけが返す、変更有無のレスポンス。 */
export type TeamPollResponse =
  | { revision: number; unchanged: true; member: AuthMember }
  | (TeamLoadResponse & { unchanged?: false });

/** HTTP ステータスを持たせたエラー（401 / 409 の分岐に使用） */
export type ApiError = Error & { status?: number };

/**
 * /api/* への共通フェッチャー。
 * 失敗時はサーバーの error メッセージと status を持つ Error を throw します。
 */
export async function api<T = ApiResponse>(
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
  errorMessage = "通信できませんでした。",
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw Object.assign(new Error(value.error || errorMessage), {
      status: res.status,
    });
  }
  return value;
}

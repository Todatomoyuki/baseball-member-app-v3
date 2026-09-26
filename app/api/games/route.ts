import { json, readBody, renewSessionHeaders, sameOrigin } from "@/lib/server";
import { gameEngine } from "@/lib/games/registry";
import { GameInputError, gameSnapshot, parseGameRequest, playGame, readGameContext } from "@/lib/games/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gameId = new URL(req.url).searchParams.get("game") ?? "";
  if (!gameEngine(gameId)) return json({ error: "ゲームが見つかりません。" }, 404);
  try {
    const context = await readGameContext(req, gameId);
    if (!context) return json({ error: "チーム画面でログインしてから遊んでください。" }, 401);
    return json(gameSnapshot(context, gameId), 200, renewSessionHeaders(req));
  } catch (error) {
    console.error("[games:GET]", error);
    return json({ error: "ゲームを読み込めませんでした。時間をおいて再試行してください。" }, 503);
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "リクエストを確認できません。" }, 403);
  try {
    let request;
    try { request = parseGameRequest(await readBody(req)); }
    catch (error) { return json({ error: error instanceof GameInputError ? error.message : "ゲームの操作を確認してください。" }, 400); }
    const context = await readGameContext(req, request.gameId);
    if (!context) return json({ error: "チーム画面でログインし直してください。" }, 401);
    const result = await playGame(context, request);
    if (!result) return json({ error: "ゲームが別の画面で進んでいます。最新の状態を読み込んでください。" }, 409);
    return json(result, 200, renewSessionHeaders(req));
  } catch (error) {
    if (error instanceof GameInputError) return json({ error: error.message }, 400);
    console.error("[games:POST]", error);
    return json({ error: "保存結果を確認できませんでした。同じ操作を再試行してください。" }, 503);
  }
}

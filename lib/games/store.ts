import type { AuthMember } from "../auth-types";
import { db, digest, token, validToken } from "../server";
import type { GameRequest, GameRun, GameSnapshot, LeaderboardEntry } from "./api-types";
import { gameEngine } from "./registry";

type Score = Omit<LeaderboardEntry, "rank">;
type GameContext = { member: AuthMember; sessionHash: string; run: GameRun | null; scores: Score[] };
type ContextRow = {
  id: string; name: string; number: string; is_admin: number; can_edit_lineup: number;
  run_json: string | null; scores_json: string;
};

export class GameInputError extends Error {}

// A single SELECT authenticates the member and reads their resumable run and
// indexed best scores. Only active roster members appear in the ranking.
export async function readGameContext(req: Request, gameId: string): Promise<GameContext | null> {
  const value = token(req);
  if (!validToken(value)) return null;
  const sessionHash = await digest(value);
  const row = await db().prepare(`
    SELECT p.id,p.name,p.number,p.is_admin,p.can_edit_lineup,
      (SELECT json_object('id',r.run_id,'gameId',r.game_id,'turn',r.turn,'balance',r.balance,
        'status',r.status,'lastRequestId',r.last_request_id,'lastResult',json(r.result_json))
       FROM mini_game_runs r WHERE r.game_id=? AND r.player_id=p.id) AS run_json,
      (SELECT json_group_array(json_object('playerId',scores.player_id,'name',scores.name,
        'number',scores.number,'score',scores.score,'achievedAt',scores.achieved_at))
       FROM (SELECT s.player_id,s.score,s.achieved_at,players.name,players.number
         FROM mini_game_scores s JOIN players ON players.id=s.player_id AND players.sort_order IS NOT NULL
         WHERE s.game_id=? ORDER BY s.score DESC,s.achieved_at,s.player_id) scores) AS scores_json
    FROM sessions session JOIN member_devices device ON device.hash=session.device_hash
    JOIN players p ON p.id=device.player_id AND p.sort_order IS NOT NULL
    WHERE session.hash=? AND (session.expires=0 OR session.expires>?)
  `).bind(gameId, gameId, sessionHash, Date.now()).first<ContextRow>();
  if (!row) return null;
  return {
    member: { id: row.id, name: row.name, number: row.number, isAdmin: row.is_admin === 1, canEditLineup: row.can_edit_lineup === 1 },
    sessionHash, run: row.run_json ? JSON.parse(row.run_json) as GameRun : null,
    scores: JSON.parse(row.scores_json) as Score[],
  };
}

export function gameSnapshot(context: GameContext, gameId: string): GameSnapshot {
  const scores = [...context.scores].sort((a, b) => b.score - a.score || a.achievedAt - b.achievedAt || (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0));
  const ranked = scores.map((score, index) => ({ ...score, rank: index + 1 }));
  return { member: context.member, gameId, run: context.run, leaderboard: ranked.slice(0, 10), personalBest: ranked.find((score) => score.playerId === context.member.id) ?? null };
}

function isId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}

export function parseGameRequest(value: unknown): GameRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new GameInputError("ゲームの操作を確認してください。");
  const body = value as Record<string, unknown>;
  if (typeof body.gameId !== "string" || !gameEngine(body.gameId) || !isId(body.requestId)
    || (body.runId !== null && !isId(body.runId)) || !Number.isSafeInteger(body.turn) || (body.turn as number) < 0) {
    throw new GameInputError("ゲームの操作を確認してください。");
  }
  if (body.action === "start") return { action: "start", gameId: body.gameId, requestId: body.requestId, runId: body.runId as string | null, turn: body.turn as number };
  if (body.action === "turn" && isId(body.runId) && Number.isSafeInteger(body.bet) && (body.bet as number) > 0) {
    return { action: "turn", gameId: body.gameId, requestId: body.requestId, runId: body.runId, turn: body.turn as number, bet: body.bet as number };
  }
  throw new GameInputError("賭け金とゲームの操作を確認してください。");
}

const authGuard = `EXISTS (SELECT 1 FROM sessions s
  JOIN member_devices d ON d.hash=s.device_hash JOIN players p ON p.id=d.player_id
  WHERE s.hash=? AND (s.expires=0 OR s.expires>?) AND p.id=? AND p.sort_order IS NOT NULL)`;

/** Each click resolves one whole turn on the server (at most six throws).
 * Duplicate clicks/retries cannot spend twice or submit an arbitrary score.
 */
export async function playGame(context: GameContext, request: GameRequest): Promise<GameSnapshot | null> {
  const engine = gameEngine(request.gameId)!;
  const current = context.run;
  if ((request.action === "start" && current?.id === request.requestId)
    || (request.action === "turn" && current?.id === request.runId && current.lastRequestId === request.requestId)) {
    return gameSnapshot(context, request.gameId);
  }
  if ((current?.id ?? null) !== request.runId || (current?.turn ?? 0) !== request.turn) return null;
  const database = db();
  const now = Date.now();
  const authValues = [context.sessionHash, now, context.member.id];
  if (request.action === "start") {
    const run: GameRun = { id: request.requestId, gameId: request.gameId, turn: 0, balance: engine.initialBalance, status: "playing", lastRequestId: request.requestId, lastResult: null };
    const saved = await database.prepare(`
      INSERT INTO mini_game_runs(game_id,player_id,run_id,turn,balance,status,last_request_id,result_json,started_at,updated_at)
      SELECT ?,?,?,0,?,'playing',?,'null',?,? WHERE ${authGuard}
        AND (? IS NULL OR EXISTS (SELECT 1 FROM mini_game_runs WHERE game_id=? AND player_id=? AND run_id=? AND turn=?))
      ON CONFLICT(game_id,player_id) DO UPDATE SET run_id=excluded.run_id,turn=0,balance=excluded.balance,
        status='playing',last_request_id=excluded.last_request_id,result_json='null',started_at=excluded.started_at,updated_at=excluded.updated_at
      WHERE mini_game_runs.run_id=? AND mini_game_runs.turn=? RETURNING run_id
    `).bind(request.gameId, context.member.id, run.id, run.balance, request.requestId, now, now, ...authValues,
      request.runId, request.gameId, context.member.id, request.runId, request.turn, request.runId, request.turn).first<{ run_id: string }>();
    return saved ? gameSnapshot({ ...context, run }, request.gameId) : null;
  }
  if (!current || current.status !== "playing" || current.turn >= engine.maxTurns || current.balance <= 0) return null;
  if (request.bet > current.balance) throw new GameInputError("持ち金以内の賭け金を入力してください。");
  // Crypto is only called on the server; the client never provides dice/results.
  const result = engine.play(current.balance, request.bet, () => crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000);
  const run: GameRun = { ...current, turn: current.turn + 1, balance: result.balanceAfter, lastRequestId: request.requestId, lastResult: result, status: current.turn + 1 >= engine.maxTurns || result.balanceAfter === 0 ? "finished" : "playing" };
  const statements = [database.prepare(`
    UPDATE mini_game_runs SET turn=?,balance=?,status=?,last_request_id=?,result_json=?,updated_at=?
    WHERE game_id=? AND player_id=? AND run_id=? AND turn=? AND status='playing' AND ${authGuard}
    RETURNING run_id
  `).bind(run.turn, run.balance, run.status, request.requestId, JSON.stringify(result), now,
    request.gameId, context.member.id, current.id, current.turn, ...authValues)];
  if (run.status === "finished") {
    // Read the committed balance from the run, not the candidate calculation.
    // Even concurrent retries of the same request can only record that result.
    statements.push(database.prepare(`
      INSERT INTO mini_game_scores(game_id,player_id,score,achieved_at)
      SELECT game_id,player_id,balance,updated_at FROM mini_game_runs
      WHERE game_id=? AND player_id=? AND run_id=? AND last_request_id=? AND status='finished'
        AND ${authGuard}
      ON CONFLICT(game_id,player_id) DO UPDATE SET score=excluded.score,achieved_at=excluded.achieved_at
      WHERE excluded.score>mini_game_scores.score
    `).bind(request.gameId, context.member.id, run.id, request.requestId, ...authValues));
  }
  const committed = await database.batch<{ run_id: string }>(statements);
  if (!committed[0].results.length) return null;
  let scores = context.scores;
  if (run.status === "finished") {
    const best = scores.find((score) => score.playerId === context.member.id);
    if (!best || run.balance > best.score) scores = [...scores.filter((score) => score.playerId !== context.member.id), { playerId: context.member.id, name: context.member.name, number: context.member.number, score: run.balance, achievedAt: now }];
  }
  return gameSnapshot({ ...context, run, scores }, request.gameId);
}

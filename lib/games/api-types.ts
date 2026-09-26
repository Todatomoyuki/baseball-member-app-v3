import type { AuthMember } from "../auth-types";
import type { TurnResult } from "./chinchiro";

export type GameRun = {
  id: string;
  gameId: string;
  turn: number;
  balance: number;
  status: "playing" | "finished";
  lastRequestId: string;
  lastResult: TurnResult | null;
};

export type LeaderboardEntry = {
  rank: number;
  playerId: string;
  name: string;
  number: string;
  score: number;
  achievedAt: number;
};

export type GameSnapshot = {
  member: AuthMember;
  gameId: string;
  run: GameRun | null;
  leaderboard: LeaderboardEntry[];
  personalBest: LeaderboardEntry | null;
};

export type StartGameRequest = {
  action: "start";
  gameId: string;
  requestId: string;
  runId: string | null;
  turn: number;
};

export type PlayTurnRequest = {
  action: "turn";
  gameId: string;
  requestId: string;
  runId: string;
  turn: number;
  bet: number;
};

export type GameRequest = StartGameRequest | PlayTurnRequest;

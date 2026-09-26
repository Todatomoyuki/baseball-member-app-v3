import { INITIAL_BANKROLL, MAX_TURNS, resolveTurn, type TurnResult } from "./chinchiro";

/** Server-only play adapters. The catalog controls presentation; each adapter
 * owns its game's rules, score and completion condition.
 */
type GameEngine = {
  initialBalance: number;
  maxTurns: number;
  play: (balance: number, bet: number, random: () => number) => TurnResult;
};

const engines: Record<string, GameEngine> = {
  "kawataka-chinchiro": { initialBalance: INITIAL_BANKROLL, maxTurns: MAX_TURNS, play: resolveTurn },
};

export function gameEngine(id: string): GameEngine | undefined {
  return Object.hasOwn(engines, id) ? engines[id] : undefined;
}

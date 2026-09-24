export type SymbolId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Heat = "normal" | "chance" | "hot";
export type Phase =
  | "idle"
  | "chance"
  | "varying"
  | "left-stop"
  | "right-stop"
  | "reach"
  | "super-intro"
  | "pitch"
  | "swing"
  | "push"
  | "freeze"
  | "miss"
  | "revival"
  | "jackpot"
  | "bonus";

export interface Ball {
  id: number;
  path: 0 | 1 | 2;
  enters: boolean;
  heat: Heat;
}

export interface Hold {
  id: number;
  heat: Heat;
}

export type Symbols = [SymbolId, SymbolId, SymbolId];

// All odds are local play-demo settings. There are no stakes or rewards.
// JACKPOT_RATE is the chance per NORMAL start. Chance/hot multiply that
// probability by 1.7/2.7. Heat is selected before the start enters the queue.
export const JACKPOT_RATE = 0.18;
// Conditional chance of reach among LOSING starts. All wins must reach.
export const REACH_RATE = 0.48;
// Conditional chance of super reach among non-revival reaches; heat adds
// 0.15/0.30. A revival always uses the super-reach presentation.
export const SUPER_REACH_RATE = 0.55;
// Fraction of preselected wins presented as a miss followed by revival.
// This is a presentation rate, not an extra draw that changes win odds.
export const REVIVAL_RATE = 0.1;
// Chance of a colored hold; 30% of these colored holds are hot.
export const CHANCE_UP_RATE = 0.28;
// Chance of entry per launched ball, except the first ball always enters.
export const START_ENTRY_RATE = 0.8;

export const HOLD_CAPACITY = 4;
export const MAX_BALLS_IN_FLIGHT = 4;

export const TIMINGS = {
  launchCooldown: 450,
  entryBall: 2200,
  missedBall: 2400,
  reducedBall: 450,
  chance: 650,
  symbolTick: 150,
  slowSymbolTick: 450,
  leftStop: 1400,
  rightStop: 2300,
  reachAnnouncement: 320,
  noReachFinish: 480,
  normalReach: 2700,
  superReachLead: 1200,
  superIntro: 900,
  pitch: 900,
  swing: 700,
  pushTimeout: 8000,
  freeze: 400,
  miss: 1400,
  revivalMiss: 1500,
  revival: 1200,
  jackpot: 3200,
  sevenJackpot: 4500,
  bonusRound: 1100,
} as const;

export interface GamePlan {
  heat: Heat;
  win: boolean;
  reach: boolean;
  superReach: boolean;
  revival: boolean;
  finalSymbols: Symbols;
  missSymbols: Symbols;
}

export function randomSymbol(random: () => number = Math.random): SymbolId {
  return (Math.floor(random() * 9) + 1) as SymbolId;
}

export function neighborSymbol(symbol: SymbolId, direction: -1 | 1): SymbolId {
  return (((symbol - 1 + direction + 9) % 9) + 1) as SymbolId;
}

export function chooseHeat(random: () => number = Math.random): Heat {
  if (random() >= CHANCE_UP_RATE) return "normal";
  return random() < 0.3 ? "hot" : "chance";
}

export function jackpotRate(heat: Heat): number {
  const multiplier = heat === "hot" ? 2.7 : heat === "chance" ? 1.7 : 1;
  return Math.min(1, JACKPOT_RATE * multiplier);
}

/** Select the whole result once. Animation ticks and PUSH cannot change it. */
export function createGamePlan(
  heat: Heat,
  random: () => number = Math.random,
): GamePlan {
  const win = random() < jackpotRate(heat);
  const reach = win || random() < REACH_RATE;
  const heatBonus = heat === "hot" ? 0.3 : heat === "chance" ? 0.15 : 0;
  const revival = win && random() < REVIVAL_RATE;
  const superReach = reach && (revival || random() < SUPER_REACH_RATE + heatBonus);
  const left = randomSymbol(random);
  // Non-reach sides always differ, including across the 9 -> 1 boundary.
  const right = reach
    ? left
    : ((((left - 1 + 1 + Math.floor(random() * 8)) % 9) + 1) as SymbolId);
  const missedCenter = reach
    ? neighborSymbol(left, random() < 0.5 ? -1 : 1)
    : randomSymbol(random);
  return {
    heat,
    win,
    reach,
    superReach,
    revival,
    finalSymbols: [left, win ? left : missedCenter, right],
    missSymbols: [left, missedCenter, right],
  };
}

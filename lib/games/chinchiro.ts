/** The rules engine has no browser, storage, or random-number side effects. */
export const INITIAL_BANKROLL = 1_000_000;
export const MAX_TURNS = 5;
export const MAX_ROLLS = 3;
export const MIN_BET = 1;
export const SPILL_RATE = 0.001;

export type RandomSource = () => number;
export type Dice = [number, number, number];
export type HandKind = "pinzoro" | "arashi" | "shigoro" | "point" | "hifumi" | "none" | "spill";

export type DiceRoll = {
  dice: Dice;
  spilled: boolean;
};

export type Hand = {
  kind: HandKind;
  /** The remaining die for a point hand, or the matching face for arashi. */
  point: number;
  label: string;
  multiplier: number;
};

export type HandResult = {
  rolls: DiceRoll[];
  hand: Hand;
};

export type TurnResult = {
  balanceBefore: number;
  balanceAfter: number;
  bet: number;
  /** Actual change in the bankroll, after limiting a loss to the available funds. */
  delta: number;
  outcome: "win" | "loss" | "draw";
  dealer: HandResult;
  player: HandResult | null;
  reason: string;
  payoutMultiplier: number;
};

function assertDice(dice: readonly number[]): void {
  if (dice.length !== 3 || dice.some((face) => !Number.isInteger(face) || face < 1 || face > 6)) {
    throw new Error("サイコロの目は1〜6の整数を3個指定してください。");
  }
}

export function classifyHand(dice: readonly [number, number, number], spilled = false): Hand {
  assertDice(dice);
  if (spilled) return { kind: "spill", point: 0, label: "ションベン", multiplier: 1 };

  const [first, second, third] = [...dice].sort((a, b) => a - b);
  if (first === third) {
    return first === 1
      ? { kind: "pinzoro", point: 0, label: "ピンゾロ", multiplier: 5 }
      : { kind: "arashi", point: first, label: `アラシ・${first}ゾロ`, multiplier: 3 };
  }
  if (first === 1 && second === 2 && third === 3) {
    return { kind: "hifumi", point: 0, label: "ヒフミ", multiplier: 2 };
  }
  if (first === 4 && second === 5 && third === 6) {
    return { kind: "shigoro", point: 0, label: "シゴロ", multiplier: 2 };
  }
  const point = first === second ? third : second === third ? first : 0;
  return point
    ? { kind: "point", point, label: `${point}の目`, multiplier: 1 }
    : { kind: "none", point: 0, label: "目なし", multiplier: 1 };
}

function handStrength(hand: Hand): number {
  switch (hand.kind) {
    case "pinzoro": return 400;
    case "arashi": return 300 + hand.point;
    case "shigoro": return 200;
    case "point": return 100 + hand.point;
    case "hifumi":
    case "none":
    case "spill": return 0;
  }
}

/** Positive when the first hand is stronger; matching roles and points draw. */
export function compareHands(first: Hand, second: Hand): number {
  return Math.sign(handStrength(first) - handStrength(second));
}

function sample(rng: RandomSource): number {
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error("乱数は0以上1未満である必要があります。");
  }
  return value;
}

function rollHand(rng: RandomSource): HandResult {
  const rolls: DiceRoll[] = [];
  let hand: Hand = { kind: "none", point: 0, label: "目なし", multiplier: 1 };
  for (let attempt = 0; attempt < MAX_ROLLS; attempt += 1) {
    // One spill check per throw, independently of the three die faces.
    const spilled = sample(rng) < SPILL_RATE;
    const dice: Dice = [
      Math.floor(sample(rng) * 6) + 1,
      Math.floor(sample(rng) * 6) + 1,
      Math.floor(sample(rng) * 6) + 1,
    ];
    rolls.push({ dice, spilled });
    hand = classifyHand(dice, spilled);
    if (hand.kind !== "none") break;
  }
  return { rolls, hand };
}

function isLosingHand(hand: Hand): boolean {
  return hand.kind === "none" || hand.kind === "hifumi" || hand.kind === "spill";
}

/**
 * Resolve one complete turn on the server using its injected secure RNG.
 * The dealer throws first. A dealer bust settles immediately without a player throw.
 * Winnings/losses use the winning hand's multiplier, or 2 for a hifumi bust.
 * Multipliers never stack; a draw leaves the stake with its owner.
 */
export function resolveTurn(balance: number, bet: number, rng: RandomSource): TurnResult {
  if (!Number.isSafeInteger(balance) || balance <= 0) {
    throw new Error("持ち金がないためゲームを続けられません。");
  }
  if (!Number.isSafeInteger(bet) || bet < MIN_BET || bet > balance) {
    throw new Error("掛け金は1円以上、持ち金以下の整数で指定してください。");
  }
  const dealer = rollHand(rng);
  const player = isLosingHand(dealer.hand) ? null : rollHand(rng);
  let outcome: TurnResult["outcome"];
  let payoutMultiplier: number;
  let reason: string;

  if (!player) {
    outcome = "win";
    payoutMultiplier = dealer.hand.multiplier;
    reason = `川高が${dealer.hand.label}！あなたの勝ち！`;
  } else if (isLosingHand(player.hand)) {
    outcome = "loss";
    payoutMultiplier = player.hand.multiplier;
    reason = `${player.hand.label}であなたの負け。`;
  } else {
    const comparison = compareHands(player.hand, dealer.hand);
    outcome = comparison > 0 ? "win" : comparison < 0 ? "loss" : "draw";
    payoutMultiplier = comparison > 0 ? player.hand.multiplier : comparison < 0 ? dealer.hand.multiplier : 0;
    reason = comparison > 0
      ? `あなたの${player.hand.label}が勝ち！`
      : comparison < 0
        ? `川高の${dealer.hand.label}が勝ち。`
        : "同じ役で引き分け。持ち金は変わりません。";
  }

  const change = bet * payoutMultiplier * (outcome === "win" ? 1 : outcome === "loss" ? -1 : 0);
  const balanceAfter = Math.max(0, balance + change);
  if (!Number.isSafeInteger(balanceAfter)) throw new Error("持ち金が計算可能な範囲を超えています。");

  return {
    balanceBefore: balance,
    balanceAfter,
    bet,
    delta: balanceAfter - balance,
    outcome,
    dealer,
    player,
    reason,
    payoutMultiplier,
  };
}

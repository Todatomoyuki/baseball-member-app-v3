"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  chooseHeat,
  createGamePlan,
  HOLD_CAPACITY,
  MAX_BALLS_IN_FLIGHT,
  neighborSymbol,
  randomSymbol,
  START_ENTRY_RATE,
  TIMINGS,
  type Ball,
  type GamePlan,
  type Heat,
  type Hold,
  type Phase,
  type Symbols,
} from "./pachinko-game";

interface GameOptions {
  ready: boolean;
  reducedMotion: boolean;
}

interface GameView {
  phase: Phase;
  symbols: Symbols;
  moving: [boolean, boolean, boolean];
  balls: Ball[];
  holds: Hold[];
  heat: Heat;
  gameId: number;
  entryId: number;
  completed: number;
  jackpots: number;
  bonusRound: number;
  isSeven: boolean;
  revived: boolean;
  canLaunch: boolean;
  status: string;
}

interface OwnedTimer {
  handle: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
  callback: () => void;
}

interface GameController {
  launchBall: () => void;
  push: () => void;
  refresh: () => void;
  dispose: () => void;
}

function initialView(): GameView {
  return {
    phase: "idle",
    symbols: [7, 2, 7],
    moving: [false, false, false],
    balls: [],
    holds: [],
    heat: "normal",
    gameId: 0,
    entryId: 0,
    completed: 0,
    jackpots: 0,
    bonusRound: 0,
    isSeven: false,
    revived: false,
    canLaunch: false,
    status: "玉を打ち出して、スタート入賞を狙おう。",
  };
}

/**
 * One controller owns every timeout and every synchronous input guard.
 * Backgrounding the page pauses remaining time, preserving the whole result
 * sequence and the FIFO queue. Disposing it makes all later callbacks inert.
 */
function createController(
  onChange: (view: GameView) => void,
  getOptions: () => GameOptions,
): GameController {
  let view = initialView();
  let alive = true;
  let hidden = document.visibilityState === "hidden";
  let nextBallId = 0;
  let cooldown = false;
  let plan: GamePlan | null = null;
  let symbolTimer: OwnedTimer | null = null;
  let pushTimer: OwnedTimer | null = null;
  let centerSlow = false;
  let centerTicks = 0;
  let slowStep = 0;
  const timers = new Set<OwnedTimer>();

  function arm(timer: OwnedTimer) {
    if (!alive || hidden) return;
    timer.startedAt = Date.now();
    timer.handle = setTimeout(() => {
      timers.delete(timer);
      timer.handle = null;
      if (alive) timer.callback();
    }, timer.remaining);
  }

  function after(delay: number, callback: () => void): OwnedTimer {
    const timer: OwnedTimer = {
      handle: null,
      remaining: delay,
      startedAt: 0,
      callback,
    };
    if (alive) {
      timers.add(timer);
      arm(timer);
    }
    return timer;
  }

  function cancel(timer: OwnedTimer | null) {
    if (!timer) return;
    if (timer.handle !== null) clearTimeout(timer.handle);
    timer.handle = null;
    timers.delete(timer);
  }

  function launchAllowed() {
    // Reserve the active slot and all four queue slots while balls are in
    // flight; an accepted entering ball can therefore never be discarded.
    const reserved =
      (plan ? 1 : 0) +
      view.holds.length +
      view.balls.filter((ball) => ball.enters).length;
    return (
      alive &&
      getOptions().ready &&
      !hidden &&
      !cooldown &&
      view.balls.length < MAX_BALLS_IN_FLIGHT &&
      reserved < HOLD_CAPACITY + 1
    );
  }

  function update(patch: Partial<GameView> = {}) {
    if (!alive) return;
    view = { ...view, ...patch };
    view = { ...view, canLaunch: launchAllowed() };
    onChange(view);
  }

  function stopSymbolTicks() {
    cancel(symbolTimer);
    symbolTimer = null;
  }

  function tickSymbols() {
    if (!plan || !view.moving.some(Boolean)) return;
    const symbols: Symbols = [...view.symbols];
    const reduced = getOptions().reducedMotion;
    const tickInterval = reduced ? TIMINGS.slowSymbolTick : TIMINGS.symbolTick;
    centerTicks += tickInterval;
    for (const index of [0, 1, 2] as const) {
      if (!view.moving[index]) continue;
      if (index === 1 && centerSlow) {
        if (centerTicks < TIMINGS.slowSymbolTick) continue;
        // The central picture hesitates immediately beside the matching
        // number. This is discrete picture replacement, never a reel strip.
        const target = plan.finalSymbols[0];
        const neighbors = [
          neighborSymbol(target, -1),
          target,
          neighborSymbol(target, 1),
          target,
        ];
        symbols[1] = neighbors[slowStep % neighbors.length];
        slowStep += 1;
        centerTicks = 0;
      } else {
        symbols[index] = randomSymbol();
      }
    }
    update({ symbols });
    symbolTimer = after(tickInterval, tickSymbols);
  }

  function finishGame() {
    stopSymbolTicks();
    cancel(pushTimer);
    pushTimer = null;
    plan = null;
    const [next, ...rest] = view.holds;
    if (next) {
      // Dequeue and start synchronously so a newly entering ball cannot
      // jump ahead of an existing hold between two games.
      view = { ...view, holds: rest };
      startGame(next);
      return;
    }
    update({
      phase: "idle",
      moving: [false, false, false],
      bonusRound: 0,
      status: "次の一球で、もう一度。スタート入賞を狙おう。",
    });
  }

  function beginBonus(round: number) {
    if (round > 3) {
      finishGame();
      return;
    }
    update({
      phase: "bonus",
      bonusRound: round,
      status: `ボーナスラウンド ${round} / 3`,
    });
    after(TIMINGS.bonusRound, () => beginBonus(round + 1));
  }

  function showJackpot() {
    if (!plan) return;
    const isSeven = plan.finalSymbols[0] === 7;
    update({
      phase: "jackpot",
      symbols: [...plan.finalSymbols],
      moving: [false, false, false],
      completed: view.completed + 1,
      jackpots: view.jackpots + 1,
      isSeven,
      status: isSeven ? "777！スーパーカイリキー！" : "図柄が揃った！大当たり！",
    });
    after(isSeven ? TIMINGS.sevenJackpot : TIMINGS.jackpot, () => beginBonus(1));
  }

  function showResult() {
    if (!plan) return;
    if (plan.win && !plan.revival) {
      showJackpot();
      return;
    }
    const revival = plan.revival;
    update({
      phase: "miss",
      symbols: [...plan.missSymbols],
      moving: [false, false, false],
      completed: view.completed + (revival ? 0 : 1),
      status: "残念…あと一歩！",
    });
    if (revival) {
      after(TIMINGS.revivalMiss, () => {
        update({ phase: "revival", revived: true, status: "まだ終わらない！逆転の一打！" });
        after(TIMINGS.revival, showJackpot);
      });
    } else {
      after(TIMINGS.miss, finishGame);
    }
  }

  function freezeResult() {
    if (!plan) return;
    cancel(pushTimer);
    pushTimer = null;
    stopSymbolTicks();
    update({
      phase: "freeze",
      symbols: [...(plan.revival ? plan.missSymbols : plan.finalSymbols)],
      moving: [false, false, false],
      status: "運命の一瞬…",
    });
    after(TIMINGS.freeze, showResult);
  }

  function push() {
    // Phase changes before returning: even several input events in one
    // React render can only resolve the preselected result once.
    if (!alive || view.phase !== "push") return;
    freezeResult();
  }

  function beginSuperReach() {
    update({ phase: "super-intro", status: "一球入魂！逆転ホームランリーチ！" });
    after(TIMINGS.superIntro, () => {
      update({ phase: "pitch", status: "投手、渾身の一球！" });
      after(TIMINGS.pitch, () => {
        update({ phase: "swing", status: "捉えろ！勝負のフルスイング！" });
        after(TIMINGS.swing, () => {
          update({ phase: "push", status: "PUSH！想いを一打に込めろ！" });
          // Waiting forever would strand holds; the timeout reveals the
          // exact same plan as pressing PUSH at any earlier moment.
          pushTimer = after(TIMINGS.pushTimeout, push);
        });
      });
    });
  }

  function announceReach() {
    if (!plan) return;
    centerSlow = true;
    centerTicks = 0;
    slowStep = 0;
    update({ phase: "reach", status: "リーチ！中央の図柄に注目！" });
    after(
      plan.superReach ? TIMINGS.superReachLead : TIMINGS.normalReach,
      plan.superReach ? beginSuperReach : freezeResult,
    );
  }

  function beginVariation() {
    if (!plan) return;
    update({ phase: "varying", moving: [true, true, true], status: "入賞！図柄変動スタート。" });
    tickSymbols();
    after(TIMINGS.leftStop, () => {
      if (!plan) return;
      update({
        phase: "left-stop",
        symbols: [plan.finalSymbols[0], view.symbols[1], view.symbols[2]],
        moving: [false, true, true],
        status: "左図柄、停止。次は右！",
      });
    });
    after(TIMINGS.rightStop, () => {
      if (!plan) return;
      update({
        phase: "right-stop",
        symbols: [plan.finalSymbols[0], view.symbols[1], plan.finalSymbols[2]],
        moving: [false, true, false],
        status: "右図柄、停止。中央の図柄が勝負を決める！",
      });
      after(
        plan.reach ? TIMINGS.reachAnnouncement : TIMINGS.noReachFinish,
        plan.reach ? announceReach : freezeResult,
      );
    });
  }

  function startGame(hold: Hold) {
    plan = createGamePlan(hold.heat);
    centerSlow = false;
    centerTicks = 0;
    slowStep = 0;
    update({
      gameId: view.gameId + 1,
      heat: hold.heat,
      isSeven: false,
      revived: false,
      bonusRound: 0,
      moving: [false, false, false],
      phase: hold.heat === "normal" ? "varying" : "chance",
      status: hold.heat === "hot" ? "金保留！期待が高まる！" : "チャンス！勝負の入賞！",
    });
    if (hold.heat === "normal") beginVariation();
    else after(TIMINGS.chance, beginVariation);
  }

  function enterStartChucker(ball: Ball) {
    const hold: Hold = { id: ball.id, heat: ball.heat };
    view = {
      ...view,
      balls: view.balls.filter((current) => current.id !== ball.id),
      entryId: view.entryId + 1,
    };
    if (!plan) {
      startGame(hold);
    } else {
      // launchAllowed reserves this slot before launch. Never clip/slice:
      // every accepted entering ball is one real pending variation.
      update({ holds: [...view.holds, hold] });
    }
  }

  function launchBall() {
    if (!launchAllowed()) return;
    cooldown = true;
    const id = ++nextBallId;
    const enters = id === 1 || Math.random() < START_ENTRY_RATE;
    const ball: Ball = {
      id,
      path: (Math.floor(Math.random() * 3) as 0 | 1 | 2),
      enters,
      heat: enters ? chooseHeat() : "normal",
    };
    update({
      balls: [...view.balls, ball],
      ...(view.phase === "idle" ? { status: "発射！玉の行方を見守ろう。" } : {}),
    });
    const travelTime = getOptions().reducedMotion
      ? TIMINGS.reducedBall
      : enters ? TIMINGS.entryBall : TIMINGS.missedBall;
    after(travelTime, () => {
      if (ball.enters) {
        enterStartChucker(ball);
      } else {
        update({
          balls: view.balls.filter((current) => current.id !== ball.id),
          ...(view.phase === "idle" ? { status: "入賞ならず。次の一球を打ち出そう！" } : {}),
        });
      }
    });
    after(TIMINGS.launchCooldown, () => {
      cooldown = false;
      update();
    });
  }

  function onVisibilityChange() {
    const nextHidden = document.visibilityState === "hidden";
    if (hidden === nextHidden) return;
    hidden = nextHidden;
    if (hidden) {
      const now = Date.now();
      for (const timer of timers) {
        if (timer.handle === null) continue;
        clearTimeout(timer.handle);
        timer.handle = null;
        timer.remaining = Math.max(0, timer.remaining - (now - timer.startedAt));
      }
    } else {
      for (const timer of timers) arm(timer);
    }
    update();
  }

  document.addEventListener("visibilitychange", onVisibilityChange);
  return {
    launchBall,
    push,
    refresh: () => update(),
    dispose: () => {
      alive = false;
      for (const timer of timers) {
        if (timer.handle !== null) clearTimeout(timer.handle);
      }
      timers.clear();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}

export function usePachinkoGame({ ready, reducedMotion }: GameOptions) {
  const [view, setView] = useState<GameView>(initialView);
  const optionsRef = useRef<GameOptions>({ ready, reducedMotion });
  const controllerRef = useRef<GameController | null>(null);

  useEffect(() => {
    optionsRef.current = { ready, reducedMotion };
    controllerRef.current?.refresh();
  }, [ready, reducedMotion]);

  useEffect(() => {
    const controller = createController(setView, () => optionsRef.current);
    controllerRef.current = controller;
    controller.refresh();
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  const launchBall = useCallback(() => controllerRef.current?.launchBall(), []);
  const push = useCallback(() => controllerRef.current?.push(), []);

  return { ...view, canLaunch: ready && view.canLaunch, launchBall, push };
}

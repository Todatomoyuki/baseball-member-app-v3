"use client";

/* eslint-disable @next/next/no-img-element -- The dealer is the team's supplied local artwork. */
import { useEffect, useState } from "react";
import { ChevronDown, Dice3, RotateCcw, Trophy } from "lucide-react";
import { createEntityId } from "@/lib/entity-id";
import { classifyHand, INITIAL_BANKROLL, MAX_ROLLS, MAX_TURNS, type Dice, type TurnResult } from "@/lib/games/chinchiro";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { GameLeaderboard, formatGameMoney } from "./GameLeaderboard";
import { GameAccessState, GameShell } from "./GameShell";
import { useGameApi, type GameAction } from "./useGameApi";
import styles from "./Games.module.css";

const GAME_ID = "kawataka-chinchiro";
type Phase = "dealer-roll" | "dealer-reveal" | "player-ready" | "player-roll" | "player-reveal" | "done";
type Playback = { result: TurnResult; phase: Phase; index: number };
const PIPS: Record<number, readonly number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function DiceFaces({ dice, rolling = false, spilled = false, small = false }: { dice: Dice; rolling?: boolean; spilled?: boolean; small?: boolean }) {
  return (
    <div className={small ? styles.smallDice : styles.dice} data-rolling={rolling} data-spilled={spilled} role="img" aria-label={rolling ? "サイコロを振っています" : `${dice.join("・")}${spilled ? "、丼の外にこぼれました" : ""}`}>
      {dice.map((face, index) => <div className={styles.die} data-face={face} key={index} aria-hidden="true">{Array.from({ length: 9 }, (_, pip) => <i key={pip} data-dot={PIPS[face].includes(pip)} />)}</div>)}
    </div>
  );
}

function Rules() {
  return (
    <details className={styles.rules}>
      <summary>役・遊び方を見る<ChevronDown size={17} aria-hidden="true" /></summary>
      <div className={styles.rulesBody}>
        <p>持ち金 100 万円から全 5 回勝負。0 円になったらその時点で終了。毎回掛け金を決め、親の川高 → あなたの順で振ります。</p>
        <dl><div><dt>ピンゾロ</dt><dd>1・1・1 ／ 5 倍</dd></div><div><dt>アラシ</dt><dd>2〜6 のゾロ目 ／ 3 倍</dd></div><div><dt>シゴロ</dt><dd>4・5・6 ／ 2 倍</dd></div><div><dt>通常の目</dt><dd>2 個が同じ → 残りの数字で勝負 ／ 1 倍</dd></div><div><dt>ヒフミ</dt><dd>1・2・3 ／ 2 倍負け</dd></div><div><dt>目なし</dt><dd>3 回振っても役なし ／ 負け</dd></div><div><dt>ションベン</dt><dd>丼からこぼれる ／ 負け（約 0.1%）</dd></div></dl>
        <p>役は上から順に強く、アラシ・通常の目は数字が大きい方の勝ち。同じ役・数字は引き分けです。川高が負け役なら、その場であなたの勝ちになります。</p>
        <p>勝敗で掛け金 × 倍率が増減します（倍率は重複せず、持ち金は 0 円まで）。円表示はゲーム内の持ち金です。</p>
      </div>
    </details>
  );
}

export function ChinchiroPage() {
  const api = useGameApi(GAME_ID);
  const reducedMotion = useReducedMotion();
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [betText, setBetText] = useState("100000");
  const run = api.snapshot?.run;
  const result = playback?.result || run?.lastResult || null;
  const animating = Boolean(playback && playback.phase !== "done");
  const balance = animating && result ? result.balanceBefore : run?.balance ?? INITIAL_BANKROLL;
  const turn = run?.turn ?? 0;
  const currentTurn = Math.min(MAX_TURNS, animating ? turn : turn + 1);
  const bet = Number(betText);
  const validBet = Number.isSafeInteger(bet) && bet >= 1 && bet <= balance;

  useEffect(() => {
    if (!playback || playback.phase === "done" || playback.phase === "player-ready") return;
    const { phase, index, result: activeResult } = playback;
    const isRoll = phase === "dealer-roll" || phase === "player-roll";
    const timer = window.setTimeout(() => {
      if (phase === "dealer-roll") setPlayback({ ...playback, phase: "dealer-reveal" });
      else if (phase === "player-roll") setPlayback({ ...playback, phase: "player-reveal" });
      else if (phase === "dealer-reveal") {
        if (index + 1 < activeResult.dealer.rolls.length) setPlayback({ ...playback, phase: "dealer-roll", index: index + 1 });
        else setPlayback({ ...playback, phase: activeResult.player ? "player-ready" : "done", index: 0 });
      } else if (phase === "player-reveal") {
        if (activeResult.player && index + 1 < activeResult.player.rolls.length) setPlayback({ ...playback, phase: "player-ready", index: index + 1 });
        else setPlayback({ ...playback, phase: "done" });
      }
    }, reducedMotion ? 100 : isRoll ? 600 : 1050);
    return () => window.clearTimeout(timer);
  }, [playback, reducedMotion]);

  async function request(action?: GameAction) {
    const next = await api.act(action);
    if (!next?.run) return;
    setBetText(String(Math.max(1, Math.min(100_000, next.run.balance))));
    if (next.run.lastResult && (next.run.id !== run?.id || next.run.turn !== run?.turn)) setPlayback({ result: next.run.lastResult, phase: "dealer-roll", index: 0 });
    else if (!next.run.lastResult) setPlayback(null);
  }

  function start() {
    void request({ gameId: GAME_ID, action: "start", requestId: createEntityId(), runId: run?.id ?? null, turn: run?.turn ?? 0 });
  }

  function takeTurn() {
    if (!run || !validBet || animating || api.busy) return;
    void request({ gameId: GAME_ID, action: "turn", requestId: createEntityId(), runId: run.id, turn: run.turn, bet });
  }

  if (api.loading || api.unauthorized || !api.snapshot) return <GameShell isGame><GameAccessState loading={api.loading} unauthorized={api.unauthorized} error={api.error} onRetry={() => { void api.read(); }} /></GameShell>;

  const playerStage = playback?.phase.startsWith("player") ?? false;
  const rolling = playback?.phase === "dealer-roll" || playback?.phase === "player-roll";
  const roll = playback && playback.phase !== "done"
    ? (playerStage ? playback.result.player?.rolls[playback.index] : playback.result.dealer.rolls[playback.index])
    : null;
  const visibleRoll = playback?.phase === "player-ready" ? null : roll;
  const revealedResult = !animating ? result : null;
  const settledHand = revealedResult?.player ?? revealedResult?.dealer;
  const dealerKnown = Boolean(playback && (playerStage || playback.phase === "done")) || Boolean(!playback && result);
  const finished = run?.status === "finished" && !animating;

  return (
    <GameShell isGame memberName={api.snapshot.member.name}>
      <div className={styles.gameHeading}><p>KAWATAKA’S DICE CLUB</p><h1>川高の振れ！<span>チンチロ！</span></h1><small>100 万円、5 回勝負。</small></div>
      <section className={styles.machine} aria-label="チンチロゲーム">
        <div className={styles.scoreboard}><div><span>持ち金</span><strong>{balance.toLocaleString("ja-JP")}<small>円</small></strong></div><div className={styles.round}><span>{finished ? "FINISH" : "ROUND"}</span><strong>{finished ? turn : currentTurn}<small>/ {MAX_TURNS}</small></strong></div></div>
        <div className={styles.table}>
          <div className={styles.dealer}><img src="/game/kawataka.PNG" alt="親の川高" /><div><span>親・川高</span><strong>{dealerKnown && result ? result.dealer.hand.label : animating ? "さあ、勝負だ。" : "振れ！チンチロ！"}</strong></div>{dealerKnown && result && <DiceFaces dice={result.dealer.rolls.at(-1)!.dice} small />}</div>
          <div className={styles.bowlArea}>
            <div className={styles.bowlLabel}>{animating ? playerStage ? "YOUR THROW" : "KAWATAKA’S THROW" : finished ? "GAME SET" : "CHINCHIRO"}</div>
            <div className={styles.bowl}>
              {visibleRoll ? <DiceFaces dice={rolling ? [2, 4, 6] : visibleRoll.dice} rolling={rolling} spilled={!rolling && visibleRoll.spilled} /> : settledHand ? <DiceFaces dice={settledHand.rolls.at(-1)!.dice} spilled={settledHand.hand.kind === "spill"} /> : <DiceFaces dice={[1, 3, 5]} />}
              <span className={styles.bowlMark} aria-hidden="true">YG</span>
            </div>
            <div className={styles.rollStatus} role="status" aria-live="polite">
              {api.busy ? "勝負を準備しています…" : playback?.phase === "player-ready" ? <>あなたの番！<small>{playback.index + 1} 投目 / {MAX_ROLLS} 投まで</small></> : animating ? <>{playerStage ? "あなた" : "川高"}の {playback!.index + 1} 投目<small>{rolling ? "カラカラ…" : visibleRoll ? classifyHand(visibleRoll.dice, visibleRoll.spilled).label : ""}</small></> : revealedResult ? <span data-outcome={revealedResult.outcome}>{revealedResult.reason}</span> : <>丼に運を放り込め。<small>川高のあとに、あなたが振ります。</small></>}
            </div>
          </div>
          {revealedResult && <div className={styles.turnResult} data-outcome={revealedResult.outcome}><span>{revealedResult.outcome === "win" ? "YOU WIN!" : revealedResult.outcome === "loss" ? "YOU LOSE" : "DRAW"}</span><strong>{revealedResult.delta > 0 ? "+" : ""}{formatGameMoney(revealedResult.delta)}</strong>{revealedResult.player && <small>あなた：{revealedResult.player.hand.label} ／ 川高：{revealedResult.dealer.hand.label}</small>}</div>}
        </div>
        <div className={styles.controls}>
          {api.error && <div className={styles.error} role="alert"><p>{api.error}</p>{api.retryPending && <button type="button" disabled={api.busy} onClick={() => { void request(); }}>同じ操作を再試行</button>}</div>}
          {!run && <button type="button" className={styles.primary} disabled={api.busy || api.retryPending} onClick={start}><Dice3 size={21} aria-hidden="true" />100 万円でゲームスタート</button>}
          {run?.status === "playing" && !animating && <><div className={styles.betLabel}><label htmlFor="chinchiro-bet">次の掛け金</label><span>第 {currentTurn} 回戦</span></div><div className={styles.betInput}><input id="chinchiro-bet" type="text" inputMode="numeric" pattern="[0-9]*" value={betText} onChange={(event) => setBetText(event.target.value.replace(/[^0-9]/g, ""))} disabled={api.busy || api.retryPending} aria-invalid={!validBet} aria-describedby={!validBet ? "chinchiro-bet-error" : undefined} /><span>円</span></div><div className={styles.betPresets}>{[10_000, 100_000, 500_000].map((amount) => <button key={amount} type="button" disabled={amount > balance || api.busy || api.retryPending} aria-pressed={bet === amount} onClick={() => setBetText(String(amount))}>{amount / 10_000} 万</button>)}<button type="button" disabled={api.busy || api.retryPending} aria-pressed={bet === balance} onClick={() => setBetText(String(balance))}>全額</button></div>{!validBet && <p id="chinchiro-bet-error" className={styles.validation}>1〜{balance.toLocaleString("ja-JP")} 円で入力してください。</p>}<button type="button" className={styles.primary} disabled={!validBet || api.busy || api.retryPending} onClick={takeTurn}><Dice3 size={22} aria-hidden="true" />{api.busy ? "準備中…" : "この掛け金で勝負！"}</button></>}
          {animating && <button type="button" className={styles.primary} disabled={playback?.phase !== "player-ready"} onClick={() => setPlayback((current) => current ? { ...current, phase: "player-roll" } : current)}><Dice3 size={22} aria-hidden="true" />{playback?.phase === "player-ready" ? playback.index ? "もう一度、振る！" : "サイコロを振る！" : playerStage ? "サイコロが転がっています…" : "川高の勝負を見守る…"}</button>}
          {finished && <div className={styles.finish}><Trophy size={28} aria-hidden="true" /><h2>{run.balance === 0 ? "持ち金がなくなった！" : "5 回の勝負、終了！"}</h2><p>最終記録 <strong>{formatGameMoney(run.balance)}</strong></p><span>自己ベストをランキングに反映しました。</span><button type="button" className={styles.primary} disabled={api.busy || api.retryPending} onClick={start}><RotateCcw size={19} aria-hidden="true" />もう一度遊ぶ</button></div>}
          <p className={styles.gameNote}>ゲーム内の持ち金です。途中で閉じても続きから遊べます。</p>
        </div>
      </section>
      <Rules />
      {!animating && <GameLeaderboard entries={api.snapshot.leaderboard} personalBest={api.snapshot.personalBest} memberId={api.snapshot.member.id} />}
    </GameShell>
  );
}

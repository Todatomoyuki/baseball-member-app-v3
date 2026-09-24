"use client";

import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from "react";
import { ArrowLeft, ArrowUpRight, CircleDot, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { BaseballShow } from "./BaseballShow";
import { SymbolDisplay } from "./SymbolDisplay";
import { usePachinkoAssets } from "./usePachinkoAssets";
import { usePachinkoAudio, type PachinkoCue } from "./usePachinkoAudio";
import { usePachinkoGame } from "./usePachinkoGame";
import { TIMINGS, type Ball, type Phase } from "./pachinko-game";
import styles from "./PachinkoPage.module.css";

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const getMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverMotion = () => false;

// Hand-authored routes follow the outer rail and bounce between the lower pins.
// The successful paths end inside the START opening, never inside the LCD.
const entryPaths = [
  "M568 602 Q598 246 550 105 Q500 15 296 34 Q58 14 37 150 L50 202 L30 256 L49 306 L29 370 L59 434 L128 450 L174 427 L205 474 L249 460 L285 493 L300 510",
  "M568 602 Q604 211 547 88 Q445 7 225 38 Q35 36 33 169 L54 216 L33 281 L57 325 L35 383 L71 423 L113 446 L154 425 L214 455 L262 439 L277 486 L300 510",
  "M568 602 Q601 210 544 88 Q467 19 235 31 Q36 18 38 161 L27 213 L48 257 L29 324 L53 369 L69 432 L148 459 L190 436 L222 474 L262 457 L294 490 L300 510",
];
const missPaths = [
  "M568 602 Q598 246 550 105 Q500 15 296 34 Q58 14 37 150 L50 202 L30 256 L49 306 L29 370 L59 434 L128 450 L174 427 L199 477 L175 503 L209 549 L194 619",
  "M568 602 Q604 211 547 88 Q445 7 225 38 Q35 36 33 169 L54 216 L33 281 L57 325 L35 383 L71 423 L139 454 L218 437 L259 478 L327 474 L379 526 L418 619",
  "M568 602 Q601 210 544 88 Q467 19 235 31 Q36 18 38 161 L27 213 L48 257 L29 324 L53 369 L69 432 L159 459 L190 436 L240 474 L224 521 L257 565 L234 619",
];
const pins = [
  ...Array.from({ length: 7 }, (_, index) => ({ x: 71 + index * 76, y: 76 + index % 2 * 13 })),
  ...Array.from({ length: 12 }, (_, index) => ({ x: index % 2 ? 556 : 43, y: 132 + Math.floor(index / 2) * 49 })),
  ...Array.from({ length: 17 }, (_, index) => ({ x: 83 + index % 9 * 53, y: 440 + Math.floor(index / 9) * 37 })),
  { x: 266, y: 494 }, { x: 334, y: 494 }, { x: 285, y: 523 }, { x: 315, y: 523 },
];
const confetti = Array.from({ length: 24 }, (_, index) => ({
  left: `${4 + index * 4}%`,
  animationDelay: `${index % 7 * .13}s`,
  "--fall-drift": `${index % 2 ? 42 : -38}px`,
  "--confetti-color": ["#f0cb76", "#eef7ff", "#66d9ee"][index % 3],
} as CSSProperties));

const phaseCues: Partial<Record<Phase, PachinkoCue>> = {
  "left-stop": "stop", "right-stop": "stop", reach: "reach",
  "super-intro": "super", pitch: "pitch", swing: "swing",
  miss: "miss", revival: "revival", jackpot: "jackpot",
};

function FlyingBall({ ball, reducedMotion }: { ball: Ball; reducedMotion: boolean }) {
  const motion = useRef<SVGAnimationElement>(null);
  // Capture the motion preference at launch, just like the engine's arrival
  // timer. Changing the OS preference in flight must not restart this ball.
  const flight = useRef({
    path: reducedMotion
      ? ball.enters ? "M300 445 L300 510" : "M235 445 L210 619"
      : (ball.enters ? entryPaths : missPaths)[ball.path],
    duration: reducedMotion ? TIMINGS.reducedBall : ball.enters ? TIMINGS.entryBall : TIMINGS.missedBall,
  }).current;

  useEffect(() => {
    // A newly inserted SMIL animation otherwise starts at the parent SVG's
    // time zero, which can already be long past when a second ball is fired.
    motion.current?.beginElement();
  }, []);

  return (
    <g className={styles.flyingBall}>
      <animateMotion ref={motion} begin="indefinite" path={flight.path} dur={`${flight.duration}ms`} fill="freeze" />
      <circle className={styles.ballGlow} r="12" data-enters={ball.enters} style={{ animationDuration: `${flight.duration}ms` }} />
      <circle r="5" fill="url(#pachi-ball-metal)" stroke="#dbe8f7" strokeWidth=".7" />
    </g>
  );
}

export function PachinkoPage() {
  const reducedMotion = useSyncExternalStore(subscribeMotion, getMotion, serverMotion);
  const assets = usePachinkoAssets();
  const game = usePachinkoGame({ ready: assets.ready, reducedMotion });
  const audio = usePachinkoAudio();
  const page = useRef<HTMLElement>(null);
  const ballSvg = useRef<SVGSVGElement>(null);
  const lastEntry = useRef(0);
  const lastCue = useRef("");
  const lastBonus = useRef("");
  const reach = ["reach", "super-intro", "pitch", "swing", "push", "revival"].includes(game.phase);
  const superScene = ["super-intro", "pitch", "swing", "push"].includes(game.phase);
  const celebration = game.phase === "jackpot" || game.phase === "bonus";
  const heatLabel = game.heat === "hot" ? "激アツ" : game.heat === "chance" ? "CHANCE" : "勝負";

  useEffect(() => {
    const key = `${game.gameId}:${game.phase}`;
    if (key === lastCue.current) return;
    lastCue.current = key;
    const cue = phaseCues[game.phase];
    if (cue) audio.play(cue);
    if (game.phase === "jackpot" && game.isSeven) audio.shoutSeven();
  }, [game.gameId, game.phase, game.isSeven, audio.play, audio.shoutSeven]);

  useEffect(() => {
    if (game.entryId === lastEntry.current) return;
    lastEntry.current = game.entryId;
    if (game.entryId > 0) audio.play("entry");
  }, [game.entryId, audio.play]);

  useEffect(() => {
    const key = `${game.gameId}:${game.bonusRound}`;
    if (key === lastBonus.current) return;
    lastBonus.current = key;
    if (game.phase === "bonus") audio.play("bonus");
  }, [game.gameId, game.phase, game.bonusRound, audio.play]);

  useEffect(() => {
    const sync = () => {
      if (page.current) page.current.dataset.paused = String(document.hidden);
      const svg = ballSvg.current;
      if (!svg) return;
      if (document.hidden) svg.pauseAnimations?.();
      else svg.unpauseAnimations?.();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  function launch() {
    if (!game.canLaunch) return;
    audio.unlock();
    audio.play("launch");
    game.launchBall();
  }

  function push() {
    if (game.phase !== "push") return;
    audio.unlock();
    audio.play("push");
    game.push();
  }

  return (
    <main ref={page} className={styles.page} data-phase={game.phase} data-heat={game.heat}>
      <div className={styles.pageGlow} aria-hidden="true" />
      <header className={styles.nav}>
        <a href="/" className={styles.back}><ArrowLeft size={16} /><span>YG TEAM <small>ARCADE</small></span></a>
        <button type="button" className={styles.sound} onClick={audio.toggleSound} aria-pressed={audio.enabled} aria-label={audio.enabled ? "サウンドをオフにする" : "サウンドをオンにする"}>
          {audio.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}<span>SOUND {audio.enabled ? "ON" : "OFF"}</span>
        </button>
      </header>

      <div className={styles.intro}>
        <div><p className={styles.kicker}>BASEBALL PACHINKO / YG ORIGINAL</p><h1>その一球が、<em>逆転</em>を呼ぶ。</h1></div>
        <p className={styles.introNote}>光る球場。いつもの仲間。<br />今夜の主役は、誰だ。</p>
      </div>

      <section className={styles.machine} aria-label="草野球パチンコ台">
        <div className={styles.crown}>
          <span className={styles.machineMark}><CircleDot size={23} strokeWidth={1.3} /></span>
          <div><span className={styles.crownEyebrow}>THE NIGHT GAME</span><h2>NIGHT <strong>STADIUM</strong></h2></div>
          <span className={styles.series}>YG<small>09</small></span>
        </div>

        <div className={styles.board} data-reach={reach} data-celebration={celebration}>
          <svg className={styles.pinfield} viewBox="0 0 600 620" preserveAspectRatio="none" aria-hidden="true">
            <path className={styles.railOuter} d="M575 610 Q612 230 555 92 Q497 8 292 22 Q26 3 24 172 L24 491 Q24 586 185 598" />
            <path className={styles.railInner} d="M557 610 Q590 233 538 105 Q487 32 292 44 Q49 25 45 173" />
            <path className={styles.fieldLine} d="M180 484 L300 437 L420 484 L300 550 Z M180 484 L121 563 M420 484 L479 563" />
            {pins.map((pin, index) => <g key={index}><circle className={styles.pinShadow} cx={pin.x + 1} cy={pin.y + 2} r="4" /><circle className={styles.pin} cx={pin.x} cy={pin.y} r="2.7" /></g>)}
            <path className={styles.chuckerGuide} d="M257 498 L275 511 M343 498 L325 511" />
          </svg>
          <span className={styles.railCaption} aria-hidden="true">ONE BALL. ONE CHANCE.</span>
          <div className={styles.boardHeader}><span>PLAY BALL</span><i /><span>YG FIELD</span></div>

          <div className={styles.lcd} data-super={superScene} data-jackpot={game.phase === "jackpot"} data-reach={reach}>
            <div className={styles.stadium} aria-hidden="true"><div className={styles.stands} /><div className={styles.diamond} /><div className={styles.spotlights}><i /><i /><i /><i /></div></div>
            <div className={styles.screenTop}><span><i /> LIVE / NIGHT STADIUM</span><span>{String(game.completed).padStart(3, "0")} GAME</span></div>
            <div className={styles.symbolArea} data-jackpot={game.phase === "jackpot"} data-bonus={game.phase === "bonus"}>
              <SymbolDisplay symbols={game.symbols} moving={game.moving} reach={reach} jackpot={game.phase === "jackpot"} dimmed={superScene || game.phase === "bonus" || game.phase === "revival"} />
            </div>

            {game.phase === "idle" && assets.ready && <p className={styles.readyTag}>玉を打って、試合開始。</p>}
            {game.phase === "chance" && <div key={game.gameId} className={styles.chance}>CHANCE<small>ざわざわ...かわたか...</small></div>}
            {game.phase === "reach" && <div className={styles.reachTitle}>REACH<small>あと一人で、流れが変わる。</small></div>}
            {superScene && <span className={styles.heatBadge}>{heatLabel}</span>}
            {game.phase === "freeze" && <div className={styles.freeze} aria-hidden="true" />}
            {game.phase === "miss" && <p className={styles.miss}>ハズレ<small>次の一球を、信じろ。</small></p>}
            {game.phase === "revival" && <div className={styles.crack} aria-hidden="true"><i /><i /><i /></div>}
            {game.phase === "jackpot" && <><div key={`win-${game.gameId}`} className={styles.winFlash} aria-hidden="true" /><p className={styles.jackpotLabel}>大当たり！</p><div className={styles.confetti} aria-hidden="true">{confetti.map((style, index) => <i key={index} style={style} />)}</div></>}

            <BaseballShow phase={game.phase} heat={game.heat} isSeven={game.isSeven} revived={game.revived} bonusRound={game.bonusRound} />

            {!assets.ready && <div className={styles.loading} role="status">
              <CircleDot size={30} strokeWidth={1} />
              <strong>{assets.failed.length ? "図柄を読み込めませんでした" : "球場を準備しています"}</strong>
              <span>{assets.loaded} / {assets.total} 図柄</span>
              <div className={styles.loadTrack}><i style={{ width: `${assets.loaded / assets.total * 100}%` }} /></div>
              {assets.failed.length > 0 && <button type="button" onClick={assets.retry}><RotateCcw size={14} />再読み込み</button>}
            </div>}
            <div className={styles.screenBottom}><span>LEFT → RIGHT → CENTER</span><span>{game.phase === "bonus" ? `BONUS / ${game.bonusRound}回表` : "BASEBALL EDITION"}</span></div>
          </div>

          <div className={styles.chucker}>
            {game.entryId > 0 && <span key={game.entryId} className={styles.entryFlash} aria-hidden="true" />}
            <div className={styles.chuckerMouth} />
            <strong>START</strong><span>回転スタート</span>
          </div>
          <div className={styles.attacker} data-open={game.phase === "bonus"} aria-label={game.phase === "bonus" ? "アタッカー開放中" : "アタッカー"}><i /><i /><i /><span>{game.phase === "bonus" ? "OPEN" : "ATTACKER"}</span></div>

          <svg ref={ballSvg} className={styles.ballLayer} viewBox="0 0 600 620" preserveAspectRatio="none" aria-hidden="true">
            <defs><radialGradient id="pachi-ball-metal" cx="32%" cy="25%"><stop offset="0" stopColor="white" /><stop offset=".35" stopColor="#e2edf8" /><stop offset=".8" stopColor="#8793a6" /><stop offset="1" stopColor="#36455d" /></radialGradient></defs>
            {game.balls.map((ball) => <FlyingBall key={ball.id} ball={ball} reducedMotion={reducedMotion} />)}
          </svg>
        </div>

        <div className={styles.controlDeck}>
          <div className={styles.holdArea}>
            <div className={styles.holdLabel}><span>保留</span><small>{game.holds.length} / 4</small></div>
            <div className={styles.holds} role="list" aria-label="保留一覧">
              {Array.from({ length: 4 }, (_, index) => {
                const hold = game.holds[index];
                return <span key={hold?.id ?? `empty-${index}`} role="listitem" className={styles.hold} data-filled={!!hold} data-heat={hold?.heat ?? "normal"} aria-label={hold ? `${index + 1}個目：${hold.heat === "hot" ? "金色・激アツ" : hold.heat === "chance" ? "赤色・チャンス" : "白色・通常"}` : `${index + 1}個目：空き`}><i /></span>;
              })}
            </div>
          </div>
          <button className={styles.push} type="button" disabled={game.phase !== "push"} onClick={push} aria-label="PUSHを押して勝負の結果を見る"><span>PUSH</span><small>{game.phase === "push" ? "押せ！" : "CHANCE BUTTON"}</small></button>
          <button className={styles.launch} type="button" disabled={!game.canLaunch} onClick={launch}><CircleDot size={21} /><span>玉を打つ<small>{!assets.ready ? "図柄を準備中" : !game.canLaunch ? "次の発射を待っています" : "一球ずつ、勝負をつなげ。"}</small></span><ArrowUpRight size={20} /></button>
          <p className={styles.status} role="status" aria-live="polite" aria-atomic="true">{assets.ready ? game.status : "1〜9の図柄を読み込んでいます。"}</p>
        </div>
      </section>

      <div className={styles.gameFooter}><span>大当たり <strong>{String(game.jackpots).padStart(2, "0")}</strong></span><span>変動終了 <strong>{String(game.completed).padStart(3, "0")}</strong></span><span>FOR THE TEAM. FOR THE GAME.</span></div>
      <p className={styles.hint}>玉を打つ → STARTに入賞 → 図柄変動。<br className={styles.mobileBreak} />リーチの先は、PUSHで勝負。</p>
    </main>
  );
}

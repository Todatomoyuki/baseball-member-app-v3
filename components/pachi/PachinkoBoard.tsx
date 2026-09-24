"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { CircleDot, RotateCcw } from "lucide-react";
import { BaseballShow } from "./BaseballShow";
import { SymbolDisplay } from "./SymbolDisplay";
import { TIMINGS, type Ball } from "./pachinko-game";
import type { PachinkoGame } from "./usePachinkoGame";
import type { usePachinkoAssets } from "./usePachinkoAssets";
import styles from "./PachinkoPage.module.css";

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

function FlyingBall({ ball, reducedMotion }: { ball: Ball; reducedMotion: boolean }) {
  const motion = useRef<SVGAnimationElement>(null);
  // Capture the motion preference at launch, just like the engine's arrival
  // timer. Changing the OS preference in flight must not restart this ball.
  const [flight] = useState(() => ({
    path: reducedMotion
      ? ball.enters ? "M300 445 L300 510" : "M235 445 L210 619"
      : (ball.enters ? entryPaths : missPaths)[ball.path],
    duration: reducedMotion ? TIMINGS.reducedBall : ball.enters ? TIMINGS.entryBall : TIMINGS.missedBall,
  }));

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

export function PachinkoBoard({ game, assets, reducedMotion, ballSvg }: {
  game: PachinkoGame;
  assets: ReturnType<typeof usePachinkoAssets>;
  reducedMotion: boolean;
  ballSvg: RefObject<SVGSVGElement | null>;
}) {
  const reach = ["reach", "super-intro", "pitch", "swing", "push", "revival"].includes(game.phase);
  const superScene = ["super-intro", "pitch", "swing", "push"].includes(game.phase);
  const celebration = game.phase === "jackpot" || game.phase === "bonus";
  const heatLabel = game.heat === "hot" ? "激アツ" : game.heat === "chance" ? "CHANCE" : "勝負";


  return (
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
  );
}

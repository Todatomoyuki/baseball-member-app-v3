"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowUpRight, CircleDot, Volume2, VolumeX } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { PachinkoBoard } from "./PachinkoBoard";
import { usePachinkoAssets } from "./usePachinkoAssets";
import { usePachinkoAudio, type PachinkoCue } from "./usePachinkoAudio";
import { usePachinkoGame } from "./usePachinkoGame";
import { HOLD_CAPACITY, type Phase } from "./pachinko-game";
import styles from "./PachinkoPage.module.css";

const phaseCues: Partial<Record<Phase, PachinkoCue>> = {
  "left-stop": "stop", "right-stop": "stop", reach: "reach",
  "super-intro": "super", pitch: "pitch", swing: "swing",
  miss: "miss", revival: "revival", jackpot: "jackpot",
};

export function PachinkoPage() {
  const reducedMotion = useReducedMotion();
  const assets = usePachinkoAssets();
  const game = usePachinkoGame({ ready: assets.ready, reducedMotion });
  const audio = usePachinkoAudio();
  const { play, shoutSeven } = audio;
  const page = useRef<HTMLElement>(null);
  const ballSvg = useRef<SVGSVGElement>(null);
  const lastEntry = useRef(0);
  const lastCue = useRef("");
  const lastBonus = useRef("");

  useEffect(() => {
    const key = `${game.gameId}:${game.phase}`;
    if (key === lastCue.current) return;
    lastCue.current = key;
    const cue = phaseCues[game.phase];
    if (cue) play(cue);
    if (game.phase === "jackpot" && game.isSeven) shoutSeven();
  }, [game.gameId, game.phase, game.isSeven, play, shoutSeven]);

  useEffect(() => {
    if (game.entryId === lastEntry.current) return;
    lastEntry.current = game.entryId;
    if (game.entryId > 0) play("entry");
  }, [game.entryId, play]);

  useEffect(() => {
    const key = `${game.gameId}:${game.bonusRound}`;
    if (key === lastBonus.current) return;
    lastBonus.current = key;
    if (game.phase === "bonus") play("bonus");
  }, [game.gameId, game.phase, game.bonusRound, play]);

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
        {/* Full navigation disposes the machine's timers and audio before returning. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
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

        <PachinkoBoard game={game} assets={assets} reducedMotion={reducedMotion} ballSvg={ballSvg} />

        <div className={styles.controlDeck}>
          <div className={styles.holdArea}>
            <div className={styles.holdLabel}><span>保留</span><small>{game.holds.length} / {HOLD_CAPACITY}</small></div>
            <div className={styles.holds} role="list" aria-label="保留一覧">
              {Array.from({ length: HOLD_CAPACITY }, (_, index) => {
                const hold = game.holds[index];
                return <span key={hold?.id ?? `empty-${index}`} role="listitem" className={styles.hold} data-filled={!!hold} data-heat={hold?.heat ?? "normal"} aria-label={hold ? `${index + 1}個目：${hold.heat === "hot" ? "金色・激アツ" : hold.heat === "chance" ? "赤色・チャンス" : "白色・通常"}` : `${index + 1}個目：空き`}><i /></span>;
              })}
            </div>
          </div>
          <button
            className={styles.push}
            type="button"
            disabled={game.phase !== "push"}
            onClick={push}
            aria-label="PUSHを押して勝負の結果を見る"
          >
            <span>PUSH</span>
            <small>{game.phase === "push" ? "押せ！" : "CHANCE BUTTON"}</small>
          </button>
          <button
            className={styles.launch}
            type="button"
            disabled={!game.canLaunch}
            onClick={launch}
          >
            <CircleDot size={21} />
            <span>
              玉を打つ
              <small>
                {!assets.ready
                  ? "図柄を準備中"
                  : !game.canLaunch
                    ? "次の発射を待っています"
                    : "一球ずつ、勝負をつなげ。"}
              </small>
            </span>
            <ArrowUpRight size={20} />
          </button>
          <p className={styles.status} role="status" aria-live="polite" aria-atomic="true">
            {assets.ready ? game.status : "1〜9の図柄を読み込んでいます。"}
          </p>
        </div>
      </section>

      <div className={styles.gameFooter}><span>大当たり <strong>{String(game.jackpots).padStart(2, "0")}</strong></span><span>変動終了 <strong>{String(game.completed).padStart(3, "0")}</strong></span><span>FOR THE TEAM. FOR THE GAME.</span></div>
      <p className={styles.hint}>玉を打つ → STARTに入賞 → 図柄変動。<br className={styles.mobileBreak} />リーチの先は、PUSHで勝負。</p>
    </main>
  );
}

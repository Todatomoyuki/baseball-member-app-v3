"use client";

import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, MoveUpRight, Sparkles } from "lucide-react";
import { useWisdomScene } from "./useWisdomScene";
import styles from "./GotoWisdomPage.module.css";

// All photographs are existing, visually checked files in public/goto.
// Focal points keep the face visible as the portrait changes shape on mobile.
const portraits = [
  { src: "/goto/IMG_3564.JPEG", position: "53% 27%", width: 1536, height: 2048 },
  { src: "/goto/IMG_4134.JPEG", position: "50% 35%", width: 1536, height: 2048 },
  { src: "/goto/IMG_1808.JPEG", position: "40% 30%", width: 1536, height: 2048 },
  { src: "/goto/IMG_3165.JPEG", position: "50% 20%", width: 1536, height: 2048 },
  { src: "/goto/IMG_7906.JPEG", position: "50% 15%", width: 1536, height: 2048 },
  { src: "/goto/IMG_8177.JPEG", position: "50% 32%", width: 1536, height: 2048 },
  { src: "/goto/IMG_3549.JPEG", position: "55% 22%", width: 1536, height: 2048 },
  { src: "/goto/IMG_7899.JPEG", position: "50% 20%", width: 1536, height: 2048 },
  { src: "/goto/IMG_1789_Original.JPEG", position: "100% 40%", width: 4032, height: 3024 },
  { src: "/goto/4A4EF071-F9EB-4248-BAEF-989BF67E4549.jpeg", position: "48% 25%", width: 1108, height: 1477 },
  { src: "/goto/IMG_4187.JPEG", position: "50% 0%", width: 1536, height: 2048 },
  { src: "/goto/IMG_8789.JPEG", position: "50% 35%", width: 480, height: 360 },
  { src: "/goto/ED02A850-2BBE-4DFA-99E4-51F5E6E42584.jpeg", position: "50% 40%", width: 960, height: 1706 },
  { src: "/goto/IMG_8176.JPEG", position: "100% 15%", width: 2048, height: 1536 },
  { src: "/goto/IMG_7941.JPEG", position: "50% 22%", width: 1536, height: 2048 },
  { src: "/goto/IMG_6871.JPEG", position: "55% 20%", width: 1536, height: 2048 },
  { src: "/goto/IMG_1391.JPEG", position: "50% 100%", width: 222, height: 394 },
] as const;

const particles = Array.from({ length: 12 }, (_, index) => ({
  left: `${8 + (index * 31) % 87}%`,
  top: `${12 + (index * 17) % 74}%`,
  animationDelay: `${-(index * 1.7)}s`,
  animationDuration: `${9 + index % 5}s`,
}));

export function GotoWisdomPage() {
  const scene = useWisdomScene();
  const portraitButton = useRef<HTMLButtonElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [loadedPhotos, setLoadedPhotos] = useState<number[]>([]);
  const [ripple, setRipple] = useState({ x: 50, y: 45, key: 0 });
  const [grateful, setGrateful] = useState(false);
  const isIdle = scene.phase === "idle";
  const canListen = isIdle || scene.phase === "complete";
  const isReading = ["reveal", "signature", "complete"].includes(scene.phase);
  const signed = scene.phase === "signature" || scene.phase === "complete";
  const nextPhoto = Math.max(0, scene.round - 1) % portraits.length;
  const previousPhoto = Math.max(0, scene.round - 2) % portraits.length;
  const requestedPhoto = isReading ? nextPhoto : previousPhoto;
  const fallbackPhoto = loadedPhotos.includes(previousPhoto) ? previousPhoto : loadedPhotos.at(-1) ?? 0;
  const visiblePhoto = loadedPhotos.includes(requestedPhoto) ? requestedPhoto : fallbackPhoto;
  // Keep only the incoming portrait and the visible/fallback layers mounted.
  // A long visit should not retain every full-resolution photo in the DOM.
  const renderedPhotos = portraits
    .map((photo, index) => ({ photo, index }))
    .filter(({ index }) => index === nextPhoto || index === previousPhoto || index === visiblePhoto);

  function listen(event: MouseEvent<HTMLButtonElement>) {
    if (!canListen) return;
    const rect = portraitButton.current?.getBoundingClientRect();
    const onPortrait = event.currentTarget === portraitButton.current;
    setRipple({
      x: rect && onPortrait && event.detail ? (event.clientX - rect.left) / rect.width * 100 : 50,
      y: rect && onPortrait && event.detail ? (event.clientY - rect.top) / rect.height * 100 : 42,
      key: scene.round + 1,
    });
    setGrateful(false);
    // The portrait stays focusable throughout; a disappearing repeat control
    // should not strand keyboard focus in an invisible part of the page.
    portraitButton.current?.focus({ preventScroll: true });
    if (!onPortrait && stage.current && stage.current.getBoundingClientRect().top < 0) {
      stage.current.scrollIntoView({ behavior: scene.reducedMotion ? "auto" : "smooth", block: "start" });
    }
    scene.listen();
  }

  function movePortrait(event: PointerEvent<HTMLButtonElement>) {
    if (scene.reducedMotion || event.pointerType !== "mouse" || !canListen) return;
    const rect = event.currentTarget.getBoundingClientRect();
    stage.current?.style.setProperty("--drift-x", `${(event.clientX - rect.left - rect.width / 2) * 0.015}px`);
    stage.current?.style.setProperty("--drift-y", `${(event.clientY - rect.top - rect.height / 2) * 0.012}px`);
  }

  function resetDrift() {
    stage.current?.style.setProperty("--drift-x", "0px");
    stage.current?.style.setProperty("--drift-y", "0px");
  }

  return (
    <main className={styles.page} data-phase={scene.phase} data-reduced-motion={scene.reducedMotion}>
      <div className={styles.ambience} aria-hidden="true">
        <div className={styles.backgroundPhoto} style={{ backgroundImage: `url("${portraits[visiblePhoto].src}")` }} />
        <div className={styles.light} />
        <div className={styles.grain} />
        <div className={styles.particles}>
          {particles.map((style, index) => <i key={index} style={style} />)}
        </div>
      </div>

      <header className={styles.header}>
        <Link href="/" className={styles.back} aria-label="チームのページへ戻る">
          <ArrowLeft size={15} strokeWidth={1.3} aria-hidden="true" />
          <span>YG TEAM</span>
        </Link>
        <span className={styles.headerTitle}>A MOMENT WITH GOTO</span>
        <span className={styles.edition}>VOL. 01</span>
      </header>

      <div className={styles.stage} ref={stage}>
        <span className={styles.watermark} aria-hidden="true">GOTO</span>
        <div className={styles.heading}>
          <p className={styles.eyebrow}><span /> GOTO&apos;S WORDS</p>
          <h1 className={styles.title}><span>後藤君の</span><span>ありがたいお話</span></h1>
          <p className={styles.subtitle}>人生に、ときどき後藤を。</p>
        </div>

        <div className={styles.visual}>
          <div className={styles.halo} aria-hidden="true" />
          <div className={styles.orbit} aria-hidden="true"><span /><span /></div>
          <button
            ref={portraitButton}
            type="button"
            className={styles.portrait}
            onClick={listen}
            onPointerMove={movePortrait}
            onPointerLeave={resetDrift}
            onBlur={resetDrift}
            aria-label={canListen ? "後藤君をタップして、ありがたいお話を聞く" : "後藤君のお話を聞いています"}
            aria-disabled={!canListen}
            aria-controls="goto-words"
          >
            <span className={styles.portraitMotion}>
              {renderedPhotos.map(({ photo, index }) => (
                // Native images keep this standalone experience independent of
                // an image API. Later portraits load only as they are needed.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={photo.src}
                  src={photo.src}
                  alt=""
                  className={styles.photo}
                  data-visible={index === visiblePhoto}
                  style={{ objectPosition: photo.position }}
                  width={photo.width}
                  height={photo.height}
                  fetchPriority={index === 0 ? "high" : "low"}
                  decoding="async"
                  draggable={false}
                  onLoad={() => setLoadedPhotos((current) => current.includes(index) ? current : [...current, index])}
                />
              ))}
              <span className={styles.photoShade} />
              <span key={`glint-${scene.round}`} className={styles.portraitGlint} data-active={isReading} aria-hidden="true" />
            </span>
            {ripple.key > 0 && <span key={ripple.key} className={styles.ripple} style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }} aria-hidden="true" />}
            <span className={styles.tapGuide} aria-hidden="true">
              <span className={styles.tapIcon}><MoveUpRight size={17} strokeWidth={1} /></span>
              <span>後藤君に聞く<small>TAP TO LISTEN</small></span>
            </span>
          </button>
          <span className={styles.photoCredit} aria-hidden="true">TATSUYA GOTO / {String(visiblePhoto + 1).padStart(2, "0")}</span>
        </div>

        <div className={styles.invitation} aria-hidden={!isIdle}>
          <p>悩んでいるのか。</p>
          <p>なら、俺を押せ。</p>
          <span>静けさの先に、後藤。</span>
        </div>

        <div className={styles.thinking} role="status" aria-live="polite" aria-atomic="true">
          {scene.phase === "thinking" && (
            <><span>後藤、考えています。</span><span className={styles.silence}>{scene.silence ? "…………" : ""}</span></>
          )}
        </div>

        <div className={styles.words} id="goto-words" aria-busy={!canListen}>
          {scene.quote && (
            <div key={scene.round} className={styles.reading} data-visible={isReading}>
              <div className={styles.quoteHeading} aria-hidden="true">
                <span>THE WORDS</span>
                <i><span style={{ transform: `scaleX(${scene.visibleLines / Math.max(1, scene.quote.lines.length)})` }} /></i>
                <span>{String(scene.round).padStart(2, "0")}</span>
              </div>
              <blockquote className={styles.quote}>
                {scene.quote.lines.map((line, index) => (
                  <p key={index} className={styles.quoteLine} data-visible={index < scene.visibleLines} aria-hidden={index >= scene.visibleLines}>
                    {line}
                  </p>
                ))}
              </blockquote>
              <p className={styles.signature} data-visible={signed} aria-hidden={!signed}>
                <span>— 後藤 竜冶</span><small>TATSUYA GOTO</small>
              </p>
              <div className={styles.afterword} data-visible={scene.phase === "complete"}>
                <button type="button" className={styles.again} onClick={listen} disabled={scene.phase !== "complete"}>
                  <span>もう一度、ありがたいお話を聞く</span><ArrowUpRight size={17} strokeWidth={1.3} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.thanks}
                  onClick={() => setGrateful(true)}
                  disabled={scene.phase !== "complete" || grateful}
                  aria-pressed={grateful}
                >
                  <Sparkles size={12} strokeWidth={1.2} aria-hidden="true" />
                  {grateful ? "後藤君も、うなずいています。" : "ありがたい…"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Announce the speech once, without interrupting on every visual line. */}
        <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
          {signed && scene.quote ? `${scene.quote.lines.join(" ")} — 後藤 竜冶` : ""}
        </p>
        {!canListen && (
          <button type="button" className={styles.skip} onClick={() => {
            portraitButton.current?.focus({ preventScroll: true });
            scene.skip();
          }}>演出をスキップ</button>
        )}
        <div key={`light-${scene.round}`} className={styles.revelation} data-active={isReading} aria-hidden="true" />
      </div>

      <footer className={styles.footer}>
        <span>WORDS OF WISDOM, SORT OF.</span>
        <span>語り手：後藤 竜冶</span>
      </footer>
      <noscript><p className={styles.noScript}>後藤君のお話を聞くには、ブラウザーのJavaScriptを有効にしてください。</p></noscript>
    </main>
  );
}

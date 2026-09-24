"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { gotoQuotes, type GotoQuote } from "./goto-quotes";

export type WisdomPhase =
  | "idle"
  | "focusing"
  | "thinking"
  | "reveal"
  | "signature"
  | "complete";

type WisdomScene = {
  phase: WisdomPhase;
  quote: GotoQuote | null;
  visibleLines: number;
  silence: boolean;
  round: number;
};

const motionQuery = "(prefers-reduced-motion: reduce)";

function getReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(motionQuery).matches
  );
}

function subscribeToMotion(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }

  const query = window.matchMedia(motionQuery);

  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }

  query.addListener(onChange);
  return () => query.removeListener(onChange);
}

function getServerMotion() {
  return false;
}

function shuffleQuotes(previousId?: string) {
  const deck = [...gotoQuotes];

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }

  // The next card is taken from the end, including across deck boundaries.
  const last = deck.length - 1;
  if (deck.length > 1 && deck[last].id === previousId) {
    [deck[0], deck[last]] = [deck[last], deck[0]];
  }

  return deck;
}

function readingDelay(line: string) {
  const length = Array.from(line).length;
  return Math.min(4400, Math.max(2500, length * 110));
}

export function useWisdomScene() {
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    getReducedMotion,
    getServerMotion,
  );
  const [scene, setScene] = useState<WisdomScene>({
    phase: "idle",
    quote: null,
    visibleLines: 0,
    silence: false,
    round: 0,
  });
  const sceneRef = useRef(scene);
  const deckRef = useRef<GotoQuote[]>([]);
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const generationRef = useRef(0);

  const updateScene = useCallback((patch: Partial<WisdomScene>) => {
    const next = { ...sceneRef.current, ...patch };
    sceneRef.current = next;
    setScene(next);
  }, []);

  const cancelTimers = useCallback(() => {
    generationRef.current += 1;
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, []);

  const listen = useCallback(() => {
    const current = sceneRef.current;
    if (current.phase !== "idle" && current.phase !== "complete") return;

    if (deckRef.current.length === 0) {
      deckRef.current = shuffleQuotes(current.quote?.id);
    }

    const quote = deckRef.current.pop();
    if (!quote) return;

    cancelTimers();
    // Updating the ref synchronously also locks out clicks before React commits.
    updateScene({
      phase: getReducedMotion() ? "thinking" : "focusing",
      quote,
      visibleLines: 0,
      silence: false,
      round: current.round + 1,
    });
  }, [cancelTimers, updateScene]);

  const skip = useCallback(() => {
    const current = sceneRef.current;
    if (!current.quote || current.phase === "complete") return;

    cancelTimers();
    updateScene({
      phase: "complete",
      visibleLines: current.quote.lines.length,
      silence: false,
    });
  }, [cancelTimers, updateScene]);

  const { quote, round } = scene;

  useEffect(() => {
    if (!quote || sceneRef.current.phase === "complete") return;

    const generation = generationRef.current;
    let disposed = false;
    let lineIndex = 0;

    function schedule(callback: () => void, delay: number) {
      const timer = setTimeout(() => {
        timersRef.current.delete(timer);
        if (
          disposed ||
          generationRef.current !== generation ||
          sceneRef.current.round !== round
        ) {
          return;
        }
        callback();
      }, delay);
      timersRef.current.add(timer);
    }

    function showSignature() {
      updateScene({ phase: "signature" });
      schedule(
        () => updateScene({ phase: "complete" }),
        getReducedMotion() ? 1400 : 1800,
      );
    }

    function revealLine() {
      if (!quote || lineIndex >= quote.lines.length) {
        showSignature();
        return;
      }

      const line = quote.lines[lineIndex];
      lineIndex += 1;
      updateScene({ visibleLines: lineIndex });
      schedule(revealLine, readingDelay(line));
    }

    function reveal() {
      updateScene({ phase: "reveal", silence: false });
      schedule(revealLine, getReducedMotion() ? 100 : 350);
    }

    function pause() {
      updateScene({ silence: true });
      schedule(reveal, getReducedMotion() ? 600 : 1150);
    }

    function think() {
      updateScene({ phase: "thinking" });
      schedule(pause, getReducedMotion() ? 400 : 800);
    }

    // Read the motion preference at each stage so changes affect the remaining
    // sequence without restarting the quote or replaying visible lines.
    if (sceneRef.current.phase === "thinking") {
      schedule(pause, getReducedMotion() ? 400 : 800);
    } else {
      schedule(think, getReducedMotion() ? 0 : 650);
    }

    return () => {
      disposed = true;
      cancelTimers();
    };
  }, [quote, round, cancelTimers, updateScene]);

  return { ...scene, reducedMotion, listen, skip };
}

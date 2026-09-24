"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getReducedMotion, useReducedMotion } from "@/hooks/use-reduced-motion";

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

// All durations are milliseconds; changing motion preference never restarts a quote.
const SCENE_TIMINGS = {
  readingMinimum: 2500,
  readingMaximum: 4400,
  perCharacter: 110,
  focus: 650,
  normal: { signature: 1800, reveal: 350, silence: 1150, thinking: 800 },
  reduced: { signature: 1400, reveal: 100, silence: 600, thinking: 400 },
} as const;

function motionTimings() {
  return getReducedMotion() ? SCENE_TIMINGS.reduced : SCENE_TIMINGS.normal;
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
  return Math.min(
    SCENE_TIMINGS.readingMaximum,
    Math.max(SCENE_TIMINGS.readingMinimum, length * SCENE_TIMINGS.perCharacter),
  );
}

export function useWisdomScene() {
  const reducedMotion = useReducedMotion();
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
        motionTimings().signature,
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
      schedule(revealLine, motionTimings().reveal);
    }

    function pause() {
      updateScene({ silence: true });
      schedule(reveal, motionTimings().silence);
    }

    function think() {
      updateScene({ phase: "thinking" });
      schedule(pause, motionTimings().thinking);
    }

    // Read the motion preference at each stage so changes affect the remaining
    // sequence without restarting the quote or replaying visible lines.
    if (sceneRef.current.phase === "thinking") {
      schedule(pause, motionTimings().thinking);
    } else {
      schedule(think, getReducedMotion() ? 0 : SCENE_TIMINGS.focus);
    }

    return () => {
      disposed = true;
      cancelTimers();
    };
  }, [quote, round, cancelTimers, updateScene]);

  return { ...scene, reducedMotion, listen, skip };
}

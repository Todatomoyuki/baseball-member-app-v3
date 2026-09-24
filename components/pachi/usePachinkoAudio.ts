"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PachinkoCue =
  | "launch"
  | "entry"
  | "stop"
  | "reach"
  | "super"
  | "pitch"
  | "swing"
  | "push"
  | "miss"
  | "revival"
  | "jackpot"
  | "bonus";

// Frequency, offset, duration, and an optional pitch-slide destination.
type Note = readonly [number, number, number, number?];
type PlayingTone = { oscillator: OscillatorNode; gain: GainNode };

const CUES: Record<PachinkoCue, readonly Note[]> = {
  launch: [[220, 0, 0.16, 660], [880, 0.1, 0.1]],
  entry: [[1046.5, 0, 0.08], [1318.5, 0.055, 0.1]],
  stop: [[523.25, 0, 0.075]],
  reach: [[392, 0, 0.14], [523.25, 0.14, 0.14], [659.25, 0.28, 0.24]],
  super: [[523.25, 0, 0.12], [659.25, 0.1, 0.12], [783.99, 0.2, 0.12], [1046.5, 0.3, 0.3]],
  pitch: [[660, 0, 0.17, 220]],
  swing: [[196, 0, 0.1, 784], [1046.5, 0.06, 0.12]],
  push: [[392, 0, 0.1], [587.33, 0.09, 0.1], [783.99, 0.18, 0.18]],
  miss: [[392, 0, 0.17], [329.63, 0.13, 0.17], [261.63, 0.26, 0.25]],
  revival: [[261.63, 0, 0.14], [329.63, 0.13, 0.14], [392, 0.26, 0.14], [523.25, 0.39, 0.3]],
  jackpot: [
    [523.25, 0, 0.18], [659.25, 0, 0.18],
    [523.25, 0.2, 0.18], [659.25, 0.2, 0.18],
    [783.99, 0.4, 0.22], [587.33, 0.4, 0.22],
    [1046.5, 0.65, 0.5], [659.25, 0.65, 0.5], [523.25, 0.65, 0.5],
  ],
  bonus: [[523.25, 0, 0.12], [659.25, 0.1, 0.12], [783.99, 0.2, 0.12], [1046.5, 0.3, 0.25]],
};

export function usePachinkoAudio() {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  const mountedRef = useRef(true);
  const contextRef = useRef<AudioContext | null>(null);
  const tonesRef = useRef(new Set<PlayingTone>());
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopTones = useCallback(() => {
    for (const { oscillator, gain } of tonesRef.current) {
      oscillator.onended = null;
      try { oscillator.stop(); } catch { /* A tone may already have ended. */ }
      try { oscillator.disconnect(); } catch { /* Context may be closed. */ }
      try { gain.disconnect(); } catch { /* Context may be closed. */ }
    }
    tonesRef.current.clear();
  }, []);

  const stopShout = useCallback(() => {
    const utterance = utteranceRef.current;
    if (!utterance) return;
    utteranceRef.current = null;
    utterance.onend = null;
    utterance.onerror = null;
    try { window.speechSynthesis?.cancel(); } catch { /* Speech is optional. */ }
  }, []);

  const disable = useCallback(() => {
    enabledRef.current = false;
    if (mountedRef.current) setEnabled(false);
    stopTones();
    stopShout();
  }, [stopShout, stopTones]);

  // Call only from the sound-toggle or another direct user gesture.
  // Neither playback nor effects create or resume an audio context.
  const unlock = useCallback(() => {
    if (!mountedRef.current || !enabledRef.current || typeof window === "undefined") return;
    if (navigator.userActivation && !navigator.userActivation.isActive) return;

    try {
      let context = contextRef.current;
      if (!context || context.state === "closed") {
        const AudioContextConstructor = window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextConstructor) {
          disable();
          return;
        }
        context = new AudioContextConstructor();
        contextRef.current = context;
      }
      if (context.state === "suspended") {
        const activeContext = context;
        void context.resume().catch(() => {
          if (contextRef.current === activeContext && enabledRef.current) disable();
        });
      }
    } catch {
      disable();
    }
  }, [disable]);

  const toggleSound = useCallback(() => {
    if (!mountedRef.current) return;
    if (enabledRef.current) {
      disable();
      return;
    }
    if (typeof window === "undefined") return;
    if (navigator.userActivation && !navigator.userActivation.isActive) return;
    enabledRef.current = true;
    setEnabled(true);
    unlock();
  }, [disable, unlock]);

  const play = useCallback((cue: PachinkoCue) => {
    const context = contextRef.current;
    if (!enabledRef.current || !context || context.state !== "running") return;

    const start = context.currentTime + 0.005;
    for (const [frequency, offset, duration, destination] of CUES[cue]) {
      // Bound overlapping entry sounds during rapid ball animations.
      if (tonesRef.current.size >= 32) break;
      let tone: PlayingTone | undefined;
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        tone = { oscillator, gain };
        const at = start + offset;
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, at);
        if (destination) oscillator.frequency.exponentialRampToValueAtTime(destination, at + duration);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.026, at + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        const activeTone = tone;
        oscillator.onended = () => {
          tonesRef.current.delete(activeTone);
          oscillator.disconnect();
          gain.disconnect();
        };
        tonesRef.current.add(tone);
        oscillator.start(at);
        oscillator.stop(at + duration + 0.015);
      } catch {
        if (tone) {
          tonesRef.current.delete(tone);
          tone.oscillator.onended = null;
          try { tone.oscillator.stop(); } catch { /* It may not have started. */ }
          try { tone.oscillator.disconnect(); } catch { /* Context may be closed. */ }
          try { tone.gain.disconnect(); } catch { /* Context may be closed. */ }
        }
      }
    }
  }, []);

  const shoutSeven = useCallback(() => {
    if (!enabledRef.current || typeof window === "undefined" || utteranceRef.current) return;
    try {
      const synthesis = window.speechSynthesis;
      if (!synthesis || typeof window.SpeechSynthesisUtterance !== "function") return;
      // Do not interrupt speech started by another part of the application.
      if (synthesis.speaking || synthesis.pending) return;
      const utterance = new SpeechSynthesisUtterance("カイリキー！！");
      utterance.lang = "ja-JP";
      utterance.rate = 1.05;
      utterance.pitch = 0.85;
      utterance.volume = 0.55;
      const clear = () => {
        if (utteranceRef.current === utterance) utteranceRef.current = null;
      };
      utterance.onend = clear;
      utterance.onerror = clear;
      utteranceRef.current = utterance;
      synthesis.speak(utterance);
    } catch {
      utteranceRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      enabledRef.current = false;
      stopTones();
      stopShout();
      const context = contextRef.current;
      contextRef.current = null;
      if (context && context.state !== "closed") {
        try { void context.close().catch(() => {}); } catch { /* Already unavailable. */ }
      }
    };
  }, [stopShout, stopTones]);

  return { enabled, toggleSound, unlock, play, shoutSeven };
}

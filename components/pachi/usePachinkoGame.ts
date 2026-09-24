"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialGameView,
  createPachinkoController,
  type GameOptions,
  type GameView,
  type GameController,
} from "./pachinko-controller";

export function usePachinkoGame({ ready, reducedMotion }: GameOptions) {
  const [view, setView] = useState<GameView>(createInitialGameView);
  const optionsRef = useRef<GameOptions>({ ready, reducedMotion });
  const controllerRef = useRef<GameController | null>(null);

  useEffect(() => {
    optionsRef.current = { ready, reducedMotion };
    controllerRef.current?.refresh();
  }, [ready, reducedMotion]);

  useEffect(() => {
    const controller = createPachinkoController(setView, () => optionsRef.current);
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

export type PachinkoGame = ReturnType<typeof usePachinkoGame>;

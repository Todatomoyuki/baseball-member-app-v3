"use client";

import { useSyncExternalStore } from "react";

const motionQuery = "(prefers-reduced-motion: reduce)";

export function getReducedMotion() {
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

export function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, getReducedMotion, getServerMotion);
}

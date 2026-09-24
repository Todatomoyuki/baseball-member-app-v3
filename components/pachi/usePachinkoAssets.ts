"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TOTAL = 9 as const;
const CONCURRENCY = 3;
const LOAD_TIMEOUT = 45_000;
type AssetStatus = "pending" | "loaded" | "failed";
type Progress = { loaded: number; failed: number[] };

export function usePachinkoAssets() {
  const [progress, setProgress] = useState<Progress>({ loaded: 0, failed: [] });
  const cacheRef = useRef(new Map<number, HTMLImageElement>());
  const retryRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let alive = true;
    let active = 0;
    const cache = cacheRef.current;
    const status = new Map<number, AssetStatus>();
    const queue: number[] = [];
    const pending = new Map<HTMLImageElement, ReturnType<typeof setTimeout>>();

    for (let id = 1; id <= TOTAL; id += 1) {
      status.set(id, cache.has(id) ? "loaded" : "pending");
      if (!cache.has(id)) queue.push(id);
    }

    function publish() {
      if (!alive) return;
      const failed: number[] = [];
      for (let id = 1; id <= TOTAL; id += 1) {
        if (status.get(id) === "failed") failed.push(id);
      }
      setProgress({ loaded: cache.size, failed });
    }

    function pump() {
      while (alive && active < CONCURRENCY && queue.length > 0) {
        const id = queue.shift()!;
        const image = new Image();
        let settled = false;
        active += 1;

        function finish(succeeded: boolean) {
          if (!alive || settled) return;
          settled = true;
          clearTimeout(pending.get(image));
          pending.delete(image);
          image.onload = null;
          image.onerror = null;
          active -= 1;
          status.set(id, succeeded ? "loaded" : "failed");
          if (succeeded) cache.set(id, image);
          else image.removeAttribute("src");
          publish();
          pump();
        }

        image.decoding = "async";
        image.onload = () => finish(image.naturalWidth > 0);
        image.onerror = () => finish(false);
        pending.set(image, setTimeout(() => finish(false), LOAD_TIMEOUT));
        image.src = `/pachi/${id}.png`;
      }
    }

    retryRef.current = () => {
      if (!alive) return;
      for (let id = 1; id <= TOTAL; id += 1) {
        if (status.get(id) !== "failed") continue;
        status.set(id, "pending");
        queue.push(id);
      }
      publish();
      pump();
    };

    pump();
    return () => {
      alive = false;
      retryRef.current = null;
      for (const [image, timeout] of pending) {
        clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        image.removeAttribute("src");
      }
      pending.clear();
    };
  }, []);

  const retry = useCallback(() => {
    retryRef.current?.();
  }, []);

  return {
    ready: progress.loaded === TOTAL,
    loaded: progress.loaded,
    total: TOTAL,
    failed: progress.failed,
    retry,
  };
}

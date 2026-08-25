import { useSyncExternalStore } from "react";

/**
 * Cached clock, ticking once a minute.
 *
 * `useSyncExternalStore` compares snapshots with `Object.is` on every render,
 * so `getSnapshot` MUST return a stable value between real changes. Returning
 * `Date.now()` directly — a different number on every call — makes React treat
 * the store as changed on each render and re-render forever, which is what
 * threw "Maximum update depth exceeded" on the dashboards.
 *
 * So the value is cached here and only replaced on a tick. A minute is fine
 * for the "is this overdue as of now" filters that use it, and it keeps the
 * component honest: the clock is genuinely an external store with a change
 * event, rather than an impure read dressed up as one.
 */

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const TICK_MS = 60_000;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // The interval only runs while something is actually subscribed, so an app
  // with no clock-dependent screen mounted does no work.
  if (timer === null) {
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot(): number {
  return now;
}

/**
 * 0 on the server so the markup is deterministic — the real clock would differ
 * between the server render and the client's first render and trip hydration.
 */
function getServerSnapshot(): number {
  return 0;
}

/** Current timestamp (ms), refreshed once a minute while mounted. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

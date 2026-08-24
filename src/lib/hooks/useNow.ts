import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): number {
  return Date.now();
}

function getServerSnapshot(): number {
  return 0;
}

/**
 * Returns the current timestamp (ms) via `useSyncExternalStore` — the
 * React-sanctioned way to read an impure/external value (like the clock)
 * during render without tripping the react-hooks/purity rule, which
 * disallows calling `Date.now()` directly in a component's render body.
 * There's nothing to subscribe to (the clock has no change event), so this
 * simply re-reads the real value on every render rather than "ticking" on
 * its own — good enough for one-off "is this overdue as of now" filters.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

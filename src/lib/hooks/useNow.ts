import { useSyncExternalStore } from "react";

let cachedNow = Date.now();

function subscribe(onStoreChange: () => void): () => void {
  const id = setInterval(() => {
    cachedNow = Date.now();
    onStoreChange();
  }, 60_000);
  return () => clearInterval(id);
}

function getSnapshot(): number {
  return cachedNow;
}

/**
 * 0 on the server so the markup is deterministic — the real clock would differ
 * between the server render and the client's first render and trip hydration.
 */
function getServerSnapshot(): number {
  return 0;
}

/**
 * Returns the current timestamp (ms) via `useSyncExternalStore` — the
 * React-sanctioned way to read an impure/external value (like the clock)
 * during render without tripping the react-hooks/purity rule, which
 * disallows calling `Date.now()` directly in a component's render body.
 * `getSnapshot` must return a cached value that's stable between calls
 * (calling `Date.now()` directly here made every call "change", which is
 * what react-dom's "getSnapshot should be cached" loop-guard was catching) —
 * so the real clock only advances once a minute, on the subscribed interval,
 * which is more than enough for "is this overdue as of now" filters.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

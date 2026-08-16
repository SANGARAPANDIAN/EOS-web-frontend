// Generic localStorage-backed draft persistence for the long admin forms
// (Add Faculty wizard, Edit faculty) — so a network drop, accidental tab
// close, or browser crash mid-form doesn't mean re-typing everything.
//
// Deliberately values-only: profile photo data URLs and uploaded document
// files are excluded — base64 image data would burn through localStorage's
// ~5-10MB quota after only a couple of drafts, and File objects can't be
// serialized to JSON/restored across a reload at all. Losing a photo
// selection is a minor re-click; losing 20 typed fields is not.
export function getDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, values: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Storage full/unavailable — the draft just won't persist this time.
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

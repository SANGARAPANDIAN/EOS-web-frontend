import { useEffect, useState } from "react";

/**
 * Reads a URL query param once, client-side only, without Next's
 * `useSearchParams()` (which forces a Suspense boundary around the whole
 * page during static generation). Returns `""` on first render (server and
 * initial client paint match, avoiding hydration mismatch), then the real
 * value right after mount — fine for seeding a search box's initial state,
 * not for anything that must be correct before paint.
 */
export function useInitialQueryParam(key: string): string {
  const [value, setValue] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const found = params.get(key);
    // Reading window.location can't go into a lazy initializer without risking
    // a hydration mismatch (server always renders "") — has to run once on the
    // client after mount, same as AuthContext's session read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (found) setValue(found);
  }, [key]);

  return value;
}

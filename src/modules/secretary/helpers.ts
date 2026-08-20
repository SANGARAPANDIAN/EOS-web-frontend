// Ported verbatim from the design's own `tone()`/`initialsOf()` methods
// (lines 2539-2560 of "Secretary Dashboard.dc.html").

export function tone(status: string | null | undefined): { bg: string; fg: string } {
  const s = String(status ?? "").toLowerCase();
  if (/(approved|completed|verified|recorded|resolved|available|ready|published|sent to)/.test(s)) return { bg: "#ecfdf5", fg: "#047857" };
  if (/(pending|planned|scheduled|draft|awaiting|stale|in review|on leave)/.test(s)) return { bg: "#fffbeb", fg: "#b45309" };
  if (/(in progress|active|on duty|planning|ongoing|open)/.test(s)) return { bg: "#eff6ff", fg: "#1d4ed8" };
  if (/(overdue|rejected|missing|overloaded|escalated)/.test(s)) return { bg: "#fef2f2", fg: "#b91c1c" };
  return { bg: "#f1f5f9", fg: "#475569" };
}

/** Ported verbatim from `nextOf(cycle, cur)` (line 2763) — cycles to the
 * next value in a fixed list, wrapping around at the end. */
export function nextOf<T>(cycle: T[], cur: T): T {
  const i = cycle.indexOf(cur);
  return cycle[(i + 1) % cycle.length];
}

/** Ported verbatim from `stTone(st)` (line 2785) — distinct tone table used
 * by the employee-self-service history screens (Leave/OD/HR etc.), NOT the
 * generic `tone()` regex classifier. */
export function stTone(st: string): { stBg: string; stFg: string } {
  const t: Record<string, [string, string]> = {
    APPROVED: ["#eef4ff", "#1d4ed8"],
    PENDING: ["#eef4ff", "#1d4ed8"],
    REJECTED: ["#f1f5f9", "#475569"],
    RESOLVED: ["#eef4ff", "#1d4ed8"],
    "UNDER REVIEW": ["#ffffff", "#1d4ed8"],
    ISSUED: ["#eef4ff", "#1d4ed8"],
    COMPLETED: ["#eef4ff", "#1d4ed8"],
  };
  const [stBg, stFg] = t[st] || ["#eef4ff", "#1d4ed8"];
  return { stBg, stFg };
}

/** Ported verbatim from `seed(str)` (line 2564) — a simple deterministic
 * string hash used to synthesize per-record profile detail (NOT
 * `Math.random()`, so the same record always renders the same detail). */
export function seed(str: string): number {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) % 100000;
  return h;
}

/** Ported verbatim from `pick(list, str, salt)` (line 2569). */
export function pick<T>(list: T[], str: string, salt = 0): T {
  return list[(seed(str) + salt) % list.length];
}

export function initialsOf(name: string): string {
  return String(name)
    .replace(/(Dr|Prof)\.?\s*/g, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

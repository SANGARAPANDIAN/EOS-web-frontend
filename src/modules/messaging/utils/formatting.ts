// Deliberately separate from src/lib/utils/date.ts — that file's helpers
// (e.g. "Today · 14:20", always with a day label) are built for activity
// feeds; a chat's recents-list timestamp and "last seen" phrasing are a
// different, WhatsApp-specific convention. Same en-IN locale / 24h time as
// the rest of the app, just a different shape.

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return isSameDay(date, yesterday);
}

function timeOnly(date: Date): string {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Recents-list / message-bubble timestamp: time-only today, "Yesterday", weekday within 7 days, else DD/MM/YYYY. */
export function formatChatTimestamp(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (isSameDay(date, now)) return timeOnly(date);
  if (isYesterday(date, now)) return "Yesterday";
  const daysAgo = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (daysAgo < 7) return date.toLocaleDateString("en-IN", { weekday: "long" });
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** The centered date-divider chip between message groups. */
export function formatDateDivider(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (isSameDay(date, now)) return "Today";
  if (isYesterday(date, now)) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Inline per-bubble timestamp — always the exact clock time. Deliberately
 * NOT formatChatTimestamp: the date-divider chip above already states the
 * day once per group, so every bubble in that group repeating a coarse
 * label like "Monday" underneath it is pure noise, not information (and
 * reads as a bug — the same word stacked down the whole thread).
 */
export function formatBubbleTime(iso: string): string {
  return timeOnly(new Date(iso));
}

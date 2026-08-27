/**
 * Slot arithmetic for medical appointment time parts.
 *
 * The server is the authority on what slots exist and how full they are — the
 * Bookings page reads them from `GET /slots`. These helpers exist so the
 * "Date & time slots" page can validate and preview a time part *before* it is
 * submitted, and so a bad time part is refused with a readable message instead
 * of bouncing off a database CHECK constraint.
 *
 * All times are "HH:mm" 24-hour strings, matching the API.
 */

/** "13:30" -> 810. Returns null for anything that is not a valid HH:mm. */
export function parseHm(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** 810 -> "13:30". */
export function formatHm(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "13:30" -> "1:30 pm". Kept local rather than reusing the shared date util so this file stays self-contained for the mobile port. */
export function formatHm12(time: string): string {
  const total = parseHm(time);
  if (total === null) return time;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const period = hours < 12 ? "am" : "pm";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** "10:00 am – 1:00 pm" */
export function formatRange(start: string, end: string): string {
  return `${formatHm12(start)} – ${formatHm12(end)}`;
}

export interface DerivedSlot {
  slot_start: string;
  slot_end: string;
}

/**
 * Divides a time part into its fixed-length slots — 10:00–13:00 at 30 minutes
 * becomes 10:00–10:30, 10:30–11:00, … 12:30–13:00.
 *
 * Returns [] rather than throwing on invalid input, so a half-typed form never
 * crashes the page mid-keystroke.
 */
export function deriveSlots(start: string, end: string, slotMinutes: number): DerivedSlot[] {
  const from = parseHm(start);
  const to = parseHm(end);
  if (from === null || to === null || slotMinutes <= 0 || to <= from) return [];

  const slots: DerivedSlot[] = [];
  for (let cursor = from; cursor + slotMinutes <= to; cursor += slotMinutes) {
    slots.push({ slot_start: formatHm(cursor), slot_end: formatHm(cursor + slotMinutes) });
  }
  return slots;
}

/** Half-open overlap: 10:00–13:00 and 13:00–14:00 are adjacent, not overlapping. */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export interface TimePartDraft {
  start_time: string;
  end_time: string;
  slot_minutes: number;
  capacity_per_slot: number;
}

export interface ExistingRange {
  start_time: string;
  end_time: string;
}

/**
 * Every rule the API and the database also enforce, checked here first so the
 * user gets a sentence instead of a constraint-violation error.
 *
 * `others` is every range the new one must not collide with — the time parts
 * already saved on that date, plus the other unsaved drafts in the same form.
 */
export function validateTimePart(draft: TimePartDraft, others: ExistingRange[]): string | null {
  const from = parseHm(draft.start_time);
  const to = parseHm(draft.end_time);

  if (from === null) return "Enter a valid start time.";
  if (to === null) return "Enter a valid end time.";
  if (to <= from) return "The end time has to be after the start time.";

  const span = to - from;
  if (span < draft.slot_minutes) {
    return `This time part is shorter than one ${draft.slot_minutes}-minute slot.`;
  }
  if (span % draft.slot_minutes !== 0) {
    return `${formatHm12(draft.start_time)} to ${formatHm12(draft.end_time)} does not divide evenly into ${draft.slot_minutes}-minute slots. Adjust the end time.`;
  }
  if (draft.capacity_per_slot < 1) {
    return "Capacity has to be at least 1 person per slot.";
  }

  for (const other of others) {
    const otherFrom = parseHm(other.start_time);
    const otherTo = parseHm(other.end_time);
    if (otherFrom === null || otherTo === null) continue;
    if (rangesOverlap(from, to, otherFrom, otherTo)) {
      return `This overlaps ${formatRange(other.start_time, other.end_time)}, which is already on this date.`;
    }
  }

  return null;
}

/** URL-safe slot key: "10:30" -> "1030". Used in the slot-detail route segment. */
export function slotParam(time: string): string {
  return time.replace(":", "");
}

/** "1030" -> "10:30". Returns null if the segment is not four digits. */
export function slotParamToHm(param: string): string | null {
  if (!/^\d{4}$/.test(param)) return null;
  const time = `${param.slice(0, 2)}:${param.slice(2)}`;
  return parseHm(time) === null ? null : time;
}

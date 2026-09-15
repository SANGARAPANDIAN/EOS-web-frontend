"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Icon, IconButton, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { getMonthGrid, monthLabel, todayDateOnly, toIsoDateString } from "@/lib/utils/date";
import {
  useAppointmentWindows,
  useCreateAppointmentWindow,
  useDeleteAppointmentWindow,
  useUpdateAppointmentWindow,
  type AppointmentWindow,
} from "@/modules/medical-centre/api/appointments";
import {
  deriveSlots,
  formatRange,
  validateTimePart,
  type TimePartDraft,
} from "@/modules/medical-centre/appointmentSlots";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLOT_LENGTHS = [10, 15, 20, 30, 60];
const DEFAULT_DRAFT: TimePartDraft = { start_time: "10:00", end_time: "13:00", slot_minutes: 30, capacity_per_slot: 10 };

/** A draft carries its own id so removing the middle row does not remount the others and lose their input focus. */
interface Draft extends TimePartDraft {
  key: number;
}

let draftKeySeq = 0;
function newDraft(): Draft {
  return { ...DEFAULT_DRAFT, key: ++draftKeySeq };
}

function DraftRow({
  draft,
  error,
  onChange,
  onRemove,
  canRemove,
}: {
  draft: Draft;
  error: string | null;
  onChange: (patch: Partial<TimePartDraft>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const slots = deriveSlots(draft.start_time, draft.end_time, draft.slot_minutes);

  return (
    <div className={cn("rounded-[11px] border bg-surface p-3.5", error ? "border-danger-fg" : "border-border-default")}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[104px] flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[.05em] text-muted">From</span>
          <Input type="time" value={draft.start_time} onChange={(e) => onChange({ start_time: e.target.value })} />
        </label>
        <label className="flex min-w-[104px] flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[.05em] text-muted">To</span>
          <Input type="time" value={draft.end_time} onChange={(e) => onChange({ end_time: e.target.value })} />
        </label>
        <label className="flex min-w-[96px] flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[.05em] text-muted">Slot</span>
          <Select value={draft.slot_minutes} onChange={(e) => onChange({ slot_minutes: Number(e.target.value) })}>
            {SLOT_LENGTHS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} min
              </option>
            ))}
          </Select>
        </label>
        <label className="flex min-w-[92px] flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[.05em] text-muted">Per slot</span>
          <Input
            type="number"
            min={1}
            max={200}
            value={draft.capacity_per_slot}
            onChange={(e) => onChange({ capacity_per_slot: Number(e.target.value) })}
          />
        </label>
        {canRemove && <IconButton icon="close" size={38} onClick={onRemove} aria-label="Remove this time part" />}
      </div>

      {error ? (
        <div className="mt-2.5 text-[12.5px] font-semibold text-danger-fg">{error}</div>
      ) : (
        <div className="mt-2.5 text-[12.5px] text-muted">
          Divides into <span className="font-bold text-ink">{slots.length}</span> slot{slots.length === 1 ? "" : "s"} ·{" "}
          <span className="font-bold text-ink">{slots.length * draft.capacity_per_slot}</span> bookable seats
        </div>
      )}
    </div>
  );
}

function SavedWindowRow({ part }: { part: AppointmentWindow }) {
  const update = useUpdateAppointmentWindow();
  const remove = useDeleteAppointmentWindow();
  const [error, setError] = useState<string | null>(null);

  const seats = part.slot_count * part.capacity_per_slot;
  const hasBookings = part.booked_count > 0;

  async function toggleStatus() {
    setError(null);
    try {
      await update.mutateAsync({ id: part.id, status: part.status === "open" ? "closed" : "open" });
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not update this time part.");
    }
  }

  async function removeWindow() {
    setError(null);
    try {
      await remove.mutateAsync(part.id);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not remove this time part.");
    }
  }

  return (
    <div className="rounded-[11px] border border-border-default bg-surface p-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold text-ink">{formatRange(part.start_time, part.end_time)}</div>
          <div className="mt-0.5 text-[12.5px] text-muted">
            {part.slot_count} × {part.slot_minutes} min · {part.capacity_per_slot} per slot · {seats} seats
          </div>
        </div>
        <Badge tone={part.status === "open" ? "accent" : "neutral"}>{part.status === "open" ? "Open" : "Closed"}</Badge>
        <div className="text-right">
          <div className="text-[15px] font-extrabold text-ink">{part.booked_count}</div>
          <div className="text-[11px] font-semibold uppercase tracking-[.04em] text-muted">booked</div>
        </div>
        <button
          type="button"
          onClick={toggleStatus}
          disabled={update.isPending}
          className="rounded-[7px] border border-border-default px-3 py-1.5 text-[12.5px] font-bold text-primary hover:bg-surface-tint disabled:opacity-50"
        >
          {part.status === "open" ? "Close intake" : "Reopen"}
        </button>
        <button
          type="button"
          onClick={removeWindow}
          disabled={remove.isPending || hasBookings}
          title={hasBookings ? "This time part already has bookings — handle them first." : "Remove this time part"}
          className="rounded-[7px] border border-border-default px-3 py-1.5 text-[12.5px] font-bold text-danger-fg hover:bg-surface-tint disabled:opacity-40"
        >
          Remove
        </button>
      </div>
      {part.pending_count > 0 && (
        <div className="mt-2.5 text-[12.5px] font-semibold text-primary">
          {part.pending_count} booking{part.pending_count === 1 ? "" : "s"} awaiting your approval
        </div>
      )}
      {error && <div className="mt-2.5 text-[12.5px] font-semibold text-danger-fg">{error}</div>}
    </div>
  );
}

export default function AppointmentSlotsPage() {
  const todayIso = todayDateOnly();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const create = useCreateAppointmentWindow();

  // One request per month rather than per day cell, so the calendar can mark
  // every date that already has sessions on it.
  const monthFrom = toIsoDateString(new Date(viewYear, viewMonth, 1));
  const monthTo = toIsoDateString(new Date(viewYear, viewMonth + 1, 0));
  const windows = useAppointmentWindows(monthFrom, monthTo);

  const weeks = useMemo(() => getMonthGrid(viewYear, viewMonth, "sunday"), [viewYear, viewMonth]);

  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of windows.data ?? []) {
      map.set(w.slot_date, (map.get(w.slot_date) ?? 0) + 1);
    }
    return map;
  }, [windows.data]);

  const dayWindows = useMemo(
    () =>
      (windows.data ?? [])
        .filter((w) => w.slot_date === selectedDate)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [windows.data, selectedDate],
  );

  // Each draft is validated against the saved time parts on this date *and*
  // every other draft in the form, so two overlapping new rows are caught
  // before either is sent.
  const draftErrors = useMemo(
    () =>
      drafts.map((draft, index) =>
        validateTimePart(draft, [
          ...dayWindows.map((w) => ({ start_time: w.start_time, end_time: w.end_time })),
          ...drafts.filter((_, i) => i !== index).map((d) => ({ start_time: d.start_time, end_time: d.end_time })),
        ]),
      ),
    [drafts, dayWindows],
  );

  const hasDraftErrors = draftErrors.some(Boolean);

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function pickDate(iso: string) {
    setSelectedDate(iso);
    // Drafts belong to the date they were typed against — carrying them to
    // another day would silently open sessions on the wrong date.
    setDrafts([]);
    setSaveError(null);
  }

  function patchDraft(key: number, patch: Partial<TimePartDraft>) {
    setDrafts((current) => current.map((d) => (d.key === key ? { ...d, ...patch } : d)));
    setSaveError(null);
  }

  async function saveDrafts() {
    if (hasDraftErrors || drafts.length === 0) return;
    // Belt and braces: the button is disabled and the server rejects it, but a
    // date can go stale if the page sits open across midnight.
    if (selectedDate < todayDateOnly()) {
      setSaveError("This date has passed. Pick today or a later date.");
      return;
    }
    setSaveError(null);
    // Sequential on purpose: each insert has to see the previous one to reject
    // an overlap server-side, which parallel requests would race past.
    for (const draft of drafts) {
      try {
        await create.mutateAsync({
          slot_date: selectedDate,
          start_time: draft.start_time,
          end_time: draft.end_time,
          slot_minutes: draft.slot_minutes,
          capacity_per_slot: draft.capacity_per_slot,
        });
      } catch (err: unknown) {
        setSaveError(
          `${formatRange(draft.start_time, draft.end_time)}: ${(err as { message?: string })?.message ?? "could not be saved."}`,
        );
        return;
      }
    }
    setDrafts([]);
  }

  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const isPastDate = selectedDate < todayIso;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Date &amp; time slots</h1>
        <p className="mt-1 text-[13px] text-muted">
          Open the hours you are available on a date. Each time part is divided into fixed-length slots students and staff
          can book — nothing they book enters the OPD queue until you approve it under Bookings.
        </p>
      </div>

      <div className="grid grid-cols-[1.05fr_1.2fr] items-start gap-4 max-[1100px]:grid-cols-1">
        <Card className="hover-lift">
          <div className="mb-4 flex items-center justify-between gap-3">
            <IconButton icon="chevron_left" size={34} onClick={() => shiftMonth(-1)} aria-label="Previous month" />
            <div className="text-center">
              <div className="text-[18px] font-extrabold tracking-[-.02em] text-ink">{monthLabel(viewYear, viewMonth)}</div>
              <div className="mt-0.5 text-[11.5px] font-semibold text-muted">
                {countByDate.size} date{countByDate.size === 1 ? "" : "s"} with sessions
              </div>
            </div>
            <IconButton icon="chevron_right" size={34} onClick={() => shiftMonth(1)} aria-label="Next month" />
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[12px] font-extrabold text-subtle">
            {WEEKDAY_LABELS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {weeks.flat().map((cell, i) => {
              if (!cell.iso || !cell.day) return <div key={i} className="h-[52px]" />;
              const count = countByDate.get(cell.iso) ?? 0;
              const isSelected = cell.iso === selectedDate;
              const isToday = cell.iso === todayIso;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => pickDate(cell.iso!)}
                  className={cn(
                    "hover-lift flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-[10px] border text-[14px] font-bold",
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : count > 0
                        ? "border-border-accent bg-accent-50 text-primary"
                        : "border-border-default bg-surface text-ink",
                    isToday && !isSelected && "ring-2 ring-primary",
                  )}
                >
                  {cell.day}
                  {count > 0 && (
                    <span className={cn("text-[10px] font-bold", isSelected ? "text-white/85" : "text-primary")}>
                      {count} part{count === 1 ? "" : "s"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {windows.isLoading && <div className="mt-3 text-[12.5px] text-muted">Loading sessions…</div>}
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-extrabold text-ink">{selectedLabel}</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {dayWindows.length === 0
                  ? "No time parts on this date yet."
                  : `${dayWindows.length} time part${dayWindows.length === 1 ? "" : "s"} open`}
              </p>
            </div>
            <button
              type="button"
              disabled={isPastDate}
              onClick={() => setDrafts((current) => [...current, newDraft()])}
              title={isPastDate ? "This date has already passed — sessions can only be opened for today onwards." : undefined}
              className="flex items-center gap-1.5 rounded-[9px] border border-primary bg-accent-50 px-3.5 py-2 text-[13px] font-bold text-primary hover:bg-accent-100 disabled:cursor-not-allowed disabled:border-border-default disabled:bg-surface-tint disabled:text-subtle disabled:hover:bg-surface-tint"
            >
              <Icon name="add" size={17} />
              Add time part
            </button>
          </div>

          {/* The server refuses a past date outright (WINDOW_DATE_IN_PAST); this
              just stops the user filling in a form that cannot be saved. The
              cut-off is midnight, so the whole of today stays available. */}
          {isPastDate && (
            <div className="mt-3 flex items-start gap-2 rounded-[9px] border border-border-default bg-surface-tint px-3.5 py-2.5 text-[12.5px] font-semibold text-muted">
              <Icon name="lock_clock" size={16} className="mt-px shrink-0" />
              <span>
                {selectedLabel.split(",")[0]} has already passed. Existing sessions stay visible for reference, but new
                time parts can only be opened for today onwards.
              </span>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2.5">
            {dayWindows.map((part) => (
              <SavedWindowRow key={part.id} part={part} />
            ))}

            {drafts.map((draft, index) => (
              <DraftRow
                key={draft.key}
                draft={draft}
                error={draftErrors[index]}
                onChange={(patch) => patchDraft(draft.key, patch)}
                onRemove={() => setDrafts((current) => current.filter((d) => d.key !== draft.key))}
                canRemove
              />
            ))}

            {dayWindows.length === 0 && drafts.length === 0 && !windows.isLoading && (
              <EmptyState
                message={
                  isPastDate
                    ? "No sessions were opened on this date."
                    : "Press Add time part to open your first session on this date."
                }
              />
            )}
          </div>

          {drafts.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-divider pt-4">
              <button
                type="button"
                disabled={isPastDate}
                onClick={() => setDrafts((current) => [...current, newDraft()])}
                className="flex items-center gap-1.5 text-[13px] font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:text-subtle disabled:no-underline"
              >
                <Icon name="add" size={16} />
                Add another
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => {
                  setDrafts([]);
                  setSaveError(null);
                }}
                className="rounded-[9px] border border-border-default px-4 py-2 text-[13px] font-bold text-body hover:bg-surface-tint"
              >
                Discard
              </button>
              <Button
                variant="primarySmall"
                className="w-auto"
                disabled={hasDraftErrors || create.isPending || isPastDate}
                onClick={saveDrafts}
              >
                {create.isPending
                  ? "Saving…"
                  : `Save ${drafts.length} time part${drafts.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          )}

          {saveError && <div className="mt-3 text-[13px] font-semibold text-danger-fg">{saveError}</div>}
        </Card>
      </div>
    </div>
  );
}

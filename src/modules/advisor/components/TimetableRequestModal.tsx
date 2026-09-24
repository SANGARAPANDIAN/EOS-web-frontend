"use client";

import { useMemo, useState } from "react";
import { Modal, Button, PersonPicker } from "@/components/ui";
import {
  useTimetableRequestColleagues,
  useCreateTakeoverRequest,
  useCreateSwapRequest,
  type Colleague,
  type ColleaguePeriod,
} from "@/modules/advisor/api/timetableRequests";

export interface RequestablePeriod {
  slot_id: number;
  period_number: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code: string;
  class_section: string;
  department_name: string;
}

interface TimetableRequestModalProps {
  open: boolean;
  mode: "takeover" | "swap";
  period: RequestablePeriod | null;
  /** The exact calendar date this period falls on — must match its real weekday. */
  date: string;
  dateLabel: string;
  onClose: () => void;
}

/**
 * One modal for both request types — "who's free at this period" (takeover)
 * and "who's free at this period, then which of their periods to trade for"
 * (swap) share the same colleague list and the same picker chrome, so one
 * component with a mode switch beats two near-duplicate dialogs.
 *
 * Every colleague on the list already carries their own periods for this
 * exact date (GET /me/timetable-requests/colleagues?date=...), so busy/free
 * status and the swap's secondary-period picker both come from data already
 * in hand — no second round trip once a colleague is picked.
 */
export function TimetableRequestModal({ open, mode, period, date, dateLabel, onClose }: TimetableRequestModalProps) {
  const [term, setTerm] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [colleague, setColleague] = useState<Colleague | null>(null);
  const [secondary, setSecondary] = useState<ColleaguePeriod | null>(null);
  const [error, setError] = useState<string | null>(null);

  const colleagues = useTimetableRequestColleagues(open ? date : null);
  const createTakeover = useCreateTakeoverRequest();
  const createSwap = useCreateSwapRequest();
  const submitting = createTakeover.isPending || createSwap.isPending;

  const results = useMemo(() => {
    const list = colleagues.data ?? [];
    const q = term.trim().toLowerCase();
    return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
  }, [colleagues.data, term]);

  function reset() {
    setTerm("");
    setPickerOpen(false);
    setColleague(null);
    setSecondary(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function submit() {
    if (!period || !colleague) return;
    setError(null);
    if (mode === "takeover") {
      createTakeover.mutate(
        { primary_slot_id: period.slot_id, to_faculty_id: colleague.id, request_date: date },
        { onSuccess: handleClose, onError: (e) => setError(e instanceof Error ? e.message : "Failed to send the request.") },
      );
    } else {
      if (!secondary) return;
      createSwap.mutate(
        { primary_slot_id: period.slot_id, secondary_slot_id: secondary.slot_id, request_date: date },
        { onSuccess: handleClose, onError: (e) => setError(e instanceof Error ? e.message : "Failed to send the request.") },
      );
    }
  }

  const canSubmit = mode === "takeover" ? Boolean(colleague) : Boolean(colleague && secondary);

  if (!open || !period) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={mode === "takeover" ? "Request a take-over" : "Request a swap"}
      subtitle={`Period ${period.period_number} · ${period.subject_name} · ${dateLabel}`}
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-[10px] border border-border-default bg-surface-tint px-3.5 py-2.5 text-[12.5px] text-muted">
          {mode === "takeover"
            ? "Pick a colleague to cover this one period, only on this date. Your recurring timetable is never changed."
            : "Pick a colleague, then one of their periods on this date to trade with. Both of you keep teaching your own subject, just at each other's time — only for this date."}
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Colleague</label>
          <PersonPicker
            value={colleague}
            onChange={(c) => {
              setColleague(c);
              setSecondary(null);
              if (!c) setTerm("");
            }}
            getId={(c) => c.id}
            toRow={(c) => {
              const busy = c.periods.find((p) => p.period_number === period.period_number);
              return {
                name: c.name,
                subtitle: busy ? `Busy at this period · ${busy.subject.name} (${busy.class.section})` : `${c.designation} · Free at this period`,
                avatarUrl: c.profile_url,
              };
            }}
            results={results}
            isLoading={colleagues.isLoading}
            term={term}
            onTermChange={setTerm}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            placeholder="Search department colleagues…"
            disabled={submitting}
            emptyMessage="No other faculty found in your department."
            noMatchMessage="No colleague matched that search."
          />
        </div>

        {mode === "swap" && colleague && (
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Swap with which of {colleague.name.split(" ")[0]}&rsquo;s periods?</label>
            {colleague.periods.length === 0 ? (
              <div className="rounded-[10px] border border-border-default bg-surface-tint px-3.5 py-2.5 text-[12.5px] text-muted">
                {colleague.name} has no periods scheduled on {dateLabel} — nothing to swap with.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {colleague.periods.map((p) => {
                  const selected = secondary?.slot_id === p.slot_id;
                  return (
                    <button
                      key={p.slot_id}
                      type="button"
                      onClick={() => setSecondary(p)}
                      className={`flex items-center justify-between rounded-[10px] border px-3.5 py-2.5 text-left transition-colors ${
                        selected ? "border-primary bg-surface-tint" : "border-border-default bg-surface hover:bg-surface-tint"
                      }`}
                    >
                      <span>
                        <span className="block text-[13.5px] font-bold text-ink">
                          Period {p.period_number} · {p.subject.name}
                        </span>
                        <span className="mt-0.5 block text-[11.5px] text-muted">
                          {p.start_time}–{p.end_time} · {p.class.section} ({p.class.department_code})
                        </span>
                      </span>
                      {selected && <span className="text-[12px] font-bold text-primary">Selected</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-[9px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#DC2626]">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={!canSubmit} loading={submitting}>
            Send request
          </Button>
        </div>
      </div>
    </Modal>
  );
}

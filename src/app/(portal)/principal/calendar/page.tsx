"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";
import {
  useCalendarEvents,
  usePersonalCalendarEntries,
  useAddPersonalEntry,
  useDeletePersonalEntry,
  type PersonalCalendarEntry,
} from "@/modules/principal/api/calendar";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Same June academic-year cutoff convention used on the Reports page. */
function currentAcademicYearLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = now.getMonth() + 1 >= 6 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

function institutionCategoryLabel(type: "holiday" | "event"): string {
  return type === "holiday" ? "Holiday" : "Event";
}
const PERSONAL_CATEGORY_LABELS: Record<PersonalCalendarEntry["category"], string> = {
  personal: "Personal",
  reminder: "Reminder",
  meeting: "Meeting",
  task: "Task",
  deadline: "Deadline",
  follow_up: "Follow-up",
  note: "Note",
};
function personalCategoryLabel(cat: PersonalCalendarEntry["category"]): string {
  return PERSONAL_CATEGORY_LABELS[cat];
}

interface UnifiedItem {
  key: string;
  date: string;
  title: string;
  categoryLabel: string;
  kind: "published" | "personal";
  personalId?: number;
}

export default function PrincipalCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [composerOpen, setComposerOpen] = useState(false);
  const [day, setDay] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PersonalCalendarEntry["category"]>("meeting");

  const institutionEvents = useCalendarEvents(year, month);
  const personalEntries = usePersonalCalendarEntries(year, month);
  const addPersonalEntry = useAddPersonalEntry();
  const deletePersonalEntry = useDeletePersonalEntry();

  const items: UnifiedItem[] = useMemo(() => {
    const fromEvents: UnifiedItem[] = (institutionEvents.data ?? []).map((e) => ({
      key: `event-${e.id}`,
      date: e.event_date,
      title: e.title,
      categoryLabel: institutionCategoryLabel(e.event_type),
      kind: "published",
    }));
    const fromPersonal: UnifiedItem[] = (personalEntries.data ?? []).map((p) => ({
      key: `personal-${p.id}`,
      date: p.entry_date,
      title: p.title,
      categoryLabel: personalCategoryLabel(p.category),
      kind: "personal",
      personalId: p.id,
    }));
    return [...fromEvents, ...fromPersonal].sort((a, b) => a.date.localeCompare(b.date));
  }, [institutionEvents.data, personalEntries.data]);

  const itemsByDay = useMemo(() => {
    const map = new Map<number, UnifiedItem[]>();
    for (const item of items) {
      const d = new Date(item.date).getUTCDate();
      const list = map.get(d) ?? [];
      list.push(item);
      map.set(d, list);
    }
    return map;
  }, [items]);

  const weeks = useMemo(() => {
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startWeekday = firstDay.getUTCDay(); // 0=Sun

    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month]);

  function goPrevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function goNextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  async function handleAddEntry() {
    const dayNum = Number(day);
    if (!dayNum || dayNum < 1 || dayNum > 31 || !title.trim()) return;
    const entryDate = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    try {
      await addPersonalEntry.mutateAsync({ entry_date: entryDate, title: title.trim(), category });
      setComposerOpen(false);
      setDay("");
      setTitle("");
      setCategory("meeting");
    } catch {
      // error surfaced via addPersonalEntry.isError below
    }
  }

  const isLoading = institutionEvents.isLoading || personalEntries.isLoading;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-[34px] font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
          >
            Academic Calendar
          </h1>
          <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
            Academic year {currentAcademicYearLabel()} · college events are visible to everyone · your own notes are
            only visible to you
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="flex h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold text-white"
          style={{ background: principalColors.primary }}
        >
          <Icon name="add" size={18} />
          Add event
        </button>
      </div>

      {composerOpen && (
        <div className="rounded-2xl border p-5" style={{ background: principalColors.bg, borderColor: principalColors.chipBorder }}>
          <div className="mb-4 flex items-start gap-3">
            <div>
              <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
                Add to your calendar · {MONTH_NAMES[month - 1]} {year}
              </div>
              <p className="mt-0.5 text-sm" style={{ color: principalColors.textFaint }}>
                Only visible to you — it won&apos;t show up on anyone else&apos;s calendar
              </p>
            </div>
            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              className="ml-auto grid h-9 w-9 place-items-center rounded-lg border"
              style={{ borderColor: principalColors.border, color: principalColors.textFaint }}
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[100px_1fr_180px]">
            <div>
              <label className="mb-1.5 block text-sm font-bold" style={{ color: principalColors.primary }}>
                Day
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="h-11 w-full rounded-[10px] border px-3 text-sm outline-none"
                style={{ borderColor: principalColors.border, color: principalColors.heading }}
                placeholder="14"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold" style={{ color: principalColors.primary }}>
                Event
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 w-full rounded-[10px] border px-3 text-sm outline-none"
                style={{ borderColor: principalColors.border, color: principalColors.heading }}
                placeholder="e.g. Alumni interaction · CSE"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold" style={{ color: principalColors.primary }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PersonalCalendarEntry["category"])}
                className="h-11 w-full rounded-[10px] border-2 px-3 text-sm font-semibold outline-none"
                style={{ borderColor: principalColors.primary, color: principalColors.heading }}
              >
                <option value="meeting">Meeting</option>
                <option value="reminder">Reminder</option>
                <option value="personal">Personal</option>
                <option value="task">Task</option>
                <option value="deadline">Deadline</option>
                <option value="follow_up">Follow-up</option>
                <option value="note">Note</option>
              </select>
            </div>
          </div>

          {addPersonalEntry.isError && (
            <p className="mt-3 text-sm" style={{ color: "#B42318" }}>
              Could not add this entry. Please try again.
            </p>
          )}

          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={handleAddEntry}
              disabled={addPersonalEntry.isPending || !day || !title.trim()}
              className="flex h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: principalColors.primary }}
            >
              <Icon name="event_available" size={16} />
              {addPersonalEntry.isPending ? "Adding…" : "Add to calendar"}
            </button>
            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              className="h-10 rounded-[10px] border px-4 text-sm font-semibold"
              style={{ borderColor: principalColors.border, color: principalColors.body }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[20px] border-2 p-6" style={{ background: principalColors.bg, borderColor: principalColors.primary }}>
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrevMonth}
              className="flex h-11 w-12 items-center justify-center rounded-[14px]"
              style={{ background: principalColors.surfaceMuted, color: principalColors.body }}
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <div className="text-center">
              <div className="text-[30px] font-extrabold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
                {MONTH_NAMES[month - 1]} {year}
              </div>
              <div className="mt-0.5 text-[13.5px]" style={{ color: principalColors.textFaint }}>
                {items.length} calendar item{items.length === 1 ? "" : "s"}
              </div>
            </div>
            <button
              type="button"
              onClick={goNextMonth}
              className="flex h-11 w-12 items-center justify-center rounded-[14px]"
              style={{ background: principalColors.surfaceMuted, color: principalColors.body }}
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[14px] font-bold" style={{ color: principalColors.textSubtle }}>
            {WEEKDAYS.map((w, i) => <div key={i}>{w}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {weeks.flat().map((d, i) => {
              const dayItems = d != null ? itemsByDay.get(d) : undefined;
              const hasPublished = dayItems?.some((it) => it.kind === "published");
              const hasPersonal = dayItems?.some((it) => it.kind === "personal");
              if (d == null) return <div key={i} className="h-16" />;
              return (
                <div
                  key={i}
                  className="relative flex h-16 items-center justify-center rounded-[12px] border text-[17px] font-bold"
                  style={
                    hasPublished
                      ? { borderColor: principalColors.primary, background: principalColors.surfaceTint, color: principalColors.primary }
                      : hasPersonal
                        ? { borderColor: "#B98900", background: "#FEF3C7", color: "#92400E" }
                        : { borderColor: principalColors.border, color: principalColors.heading }
                  }
                >
                  {d}
                  {hasPublished && hasPersonal && (
                    <span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "#B98900" }} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex gap-4 text-xs" style={{ color: principalColors.textFaint }}>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: principalColors.primary }} /> College events
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#B98900" }} /> Your notes
            </span>
          </div>
        </div>

        <div className="rounded-2xl border p-5" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
          <div className="mb-3 text-[20px] font-extrabold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Events in {MONTH_NAMES[month - 1]}
          </div>
          <div className="flex flex-col">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 border-b px-5 py-4 last:border-b-0" style={{ borderColor: principalColors.borderMuted }}>
                  <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3.5 w-28" />
                  </div>
                </div>
              ))}
            {items.length === 0 && !isLoading && (
              <div className="px-5 py-6 text-sm" style={{ color: principalColors.textFaint }}>
                Nothing on the calendar for {MONTH_NAMES[month - 1]} {year} yet.
              </div>
            )}
            {items.map((item) => {
              const d = new Date(item.date);
              const dayNum = d.getUTCDate();
              const weekdayAbbr = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase();
              return (
                <div
                  key={item.key}
                  className="hover-lift flex items-start gap-4 border-b px-5 py-4 transition-colors last:border-b-0 hover:bg-[#F1F6FE] hover:shadow-[inset_0_0_0_1.5px_#1D47AE]"
                  style={{ borderColor: principalColors.borderMuted }}
                >
                  <div
                    className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border"
                    style={{ borderColor: principalColors.border, color: principalColors.heading }}
                  >
                    <span className="text-[19px] font-extrabold leading-none">{dayNum}</span>
                    <span className="mt-0.5 text-[10px] font-bold" style={{ color: principalColors.textFaint }}>
                      {weekdayAbbr}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[15.5px] font-bold" style={{ color: principalColors.heading }}>
                      {item.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[13px]" style={{ color: principalColors.textFaint }}>
                      {d.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
                      {item.kind === "personal" && (
                        <>
                          · <Icon name="lock_person" size={12} />
                          Only visible to you
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={
                      item.kind === "personal"
                        ? { background: "#FEF3C7", color: "#92400E" }
                        : { background: principalColors.surfaceTint, color: principalColors.primaryDark }
                    }
                  >
                    {item.categoryLabel}
                  </span>
                  {item.kind === "personal" && item.personalId != null && (
                    <button
                      type="button"
                      onClick={() => deletePersonalEntry.mutate(item.personalId!)}
                      className="shrink-0 rounded-lg p-1.5"
                      style={{ color: principalColors.textFaint }}
                      title="Delete this entry"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

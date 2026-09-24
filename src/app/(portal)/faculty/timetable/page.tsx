"use client";

import { useState } from "react";
import { SegmentedTabs, SkeletonBlock, SkeletonRows, Button } from "@/components/ui";
import { useTodaySlots, useFacultyTimetable } from "@/modules/advisor/api/employee";
import { useMyFacultyProfile } from "@/modules/advisor/api/profile";
import { usePendingTimetableRequestsCount } from "@/modules/advisor/api/timetableRequests";
import { TimetableRequestModal, type RequestablePeriod } from "@/modules/advisor/components/TimetableRequestModal";
import { TimetableRequestsPanel } from "@/modules/advisor/components/TimetableRequestsPanel";
import { toIsoDateString, todayDateOnly } from "@/lib/utils/date";

// PIXEL-MATCH PASS: "Full week" rebuilt against the user-supplied design
// screenshot — an 8-fixed-time-column × Mon–Fri grid distinguishing
// Class / Lab / Free / Break cells, with a legend. The real
// GET /me/faculty-timetable response is used to fill real subject/class
// cells by period_number; the backend has no room field and no Break/Free
// markers at all, so period 5 (the design's lunch slot) and any period with
// no real slot render as Break/Free the same way the design does — marked
// TODO(backend) rather than guessed as real data.

const TIME_COLUMNS = ["08:45 am", "09:40 am", "10:50 am", "11:45 am", "12:40 pm", "01:30 pm", "02:25 pm", "03:20 pm"];
const DAY_ROWS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const BREAK_COLUMN_INDEX = 4; // 12:40 pm, per the design

type CellKind = "class" | "lab" | "free" | "break";

function cellStyle(kind: CellKind) {
  if (kind === "lab") return { background: "#EFF6FF", border: "1px solid #DBEAFE" };
  if (kind === "break") return { background: "#F8FAFC", border: "1px solid #F1F4F9" };
  if (kind === "free") return { background: "#fff", border: "1px solid #F1F4F9" };
  return { background: "#fff", border: "1px solid #E6EAF0" };
}

// Real calendar dates for Mon..Fri of the current week, from the actual
// system date — used to drive the day-picker banner. jsDay: 0=Sun..6=Sat.
function currentWeekMonToFri(): Date[] {
  const now = new Date();
  const jsDay = now.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// Unified row shape the "Today" list renders. Sourced from GET
// /me/classes/today for whichever date is selected (not just literal
// "today") — that endpoint accepts any date and resolves it by day_of_week,
// so every day in the Mon–Fri picker gets the same real class/section/
// substitution-aware data, not just the actual current day.
interface DisplayRow {
  id: number;
  period_number: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code: string;
  class_section: string;
  department_name: string;
  is_lab: boolean;
  is_substitution: boolean;
  substitution_note: string | null;
  covered_by: { id: number; name: string } | null;
}

export default function AdvisorTimetablePage() {
  const [tab, setTab] = useState<"today" | "week" | "requests">("today");
  const myProfile = useMyFacultyProfile();
  const pendingRequests = usePendingTimetableRequestsCount();

  const weekDates = currentWeekMonToFri();
  const todayJsDay = new Date().getDay();
  const defaultDayIdx = todayJsDay >= 1 && todayJsDay <= 5 ? todayJsDay - 1 : 0; // Mon..Fri -> 0..4, weekend defaults to Mon
  const [selectedDayIdx, setSelectedDayIdx] = useState(defaultDayIdx);
  const isToday = selectedDayIdx === defaultDayIdx && todayJsDay >= 1 && todayJsDay <= 5;
  const selectedDateIso = toIsoDateString(weekDates[selectedDayIdx]);
  const isPastDate = selectedDateIso < todayDateOnly();

  const today = useTodaySlots(selectedDateIso);
  const week = useFacultyTimetable();
  const weekDays = week.data?.days ?? [];
  // day_of_week: 0=Sun..6=Sat in the backend; map onto Mon..Fri rows (1..5).
  const dayByIndex = (i: number) => weekDays.find((d) => d.day_of_week === i + 1);

  const displayRows: DisplayRow[] = [...(today.data ?? [])]
    .sort((a, b) => a.period_number - b.period_number)
    .map((s) => ({
      id: s.id,
      period_number: s.period_number,
      start_time: s.start_time,
      end_time: s.end_time,
      subject_name: s.subject_name,
      subject_code: s.subject_code,
      class_section: s.class_section,
      department_name: s.department_name,
      is_lab: s.course_type === "PRACTICAL" || s.course_type === "THEORY_WITH_PRACTICAL",
      is_substitution: s.is_substitution,
      substitution_note: s.substitution_note,
      covered_by: s.covered_by,
    }));

  const [requestModal, setRequestModal] = useState<{ mode: "takeover" | "swap"; period: RequestablePeriod } | null>(null);

  const nowHm = new Date().toTimeString().slice(0, 5);
  const labsCount = displayRows.filter((r) => r.is_lab).length;
  const totalPeriods = TIME_COLUMNS.length - 1; // one column is always the break
  const freeHours = Math.max(0, totalPeriods - displayRows.length);
  const selectedDateLabel = weekDates[selectedDayIdx].toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Timetable</div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
            {myProfile.data?.name ?? ""} · {myProfile.data?.department?.name ?? ""}
          </div>
        </div>
        <SegmentedTabs
          options={[
            { key: "today", label: "Today" },
            { key: "week", label: "Full week" },
            { key: "requests", label: "Requests", badge: pendingRequests.data },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "today" && (
        <>
          <div style={{ background: "#1D4ED8", borderRadius: 14, padding: 20, marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#DBEAFE" }}>{selectedDateLabel}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 12, marginTop: 14 }}>
              {DAY_ROWS.map((day, i) => {
                const active = i === selectedDayIdx;
                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDayIdx(i)}
                    style={{
                      textAlign: "center",
                      padding: "12px 0",
                      borderRadius: 11,
                      cursor: "pointer",
                      background: active ? "#fff" : "rgba(255,255,255,0.14)",
                      color: active ? "#1D4ED8" : "#fff",
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.05em", opacity: active ? 0.7 : 0.85 }}>{day.toUpperCase()}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{String(weekDates[i].getDate()).padStart(2, "0")}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16, marginTop: 16 }}>
            {[
              { label: "CLASSES", value: String(displayRows.length) },
              { label: "LABS", value: String(labsCount) },
              { label: "FREE HOURS", value: String(freeHours) },
              { label: "TOTAL HOURS", value: String(totalPeriods) },
            ].map((s) => (
              <div key={s.label} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>{s.label}</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 6 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            {today.isLoading && displayRows.length === 0 && <SkeletonRows count={5} />}
            {displayRows.map((r) => {
              const done = isToday && r.end_time < nowHm;
              const isNext = isToday && !done && displayRows.find((s) => s.end_time >= nowHm)?.id === r.id;
              const eligibleForRequest = !r.is_substitution && !r.covered_by && !isPastDate;
              return (
                <div
                  key={r.id}
                  style={{ padding: "14px 18px", background: isNext ? "#EFF6FF" : r.is_substitution ? "#F0FDF4" : "#fff", border: `1px solid ${isNext ? "#BFDBFE" : r.is_substitution ? "#BBF7D0" : "#E6EAF0"}`, borderRadius: 12 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 90, flex: "0 0 90px" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#1D4ED8" }}>{r.start_time}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginTop: 2 }}>Period {r.period_number}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: done ? "#94A3B8" : "#0F172A", textDecoration: done ? "line-through" : "none" }}>{r.subject_name}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginTop: 3 }}>{r.class_section}</div>
                    </div>
                    {/* No room field exists anywhere in the schema for a
                        timetable slot — shown as "—" rather than a fabricated
                        room code. */}
                    <div style={{ padding: "6px 12px", borderRadius: 8, background: "#F8FAFC", border: "1px solid #EEF1F6", fontSize: 12, fontWeight: 700, color: "#475569" }}>—</div>
                  </div>

                  {r.substitution_note && (
                    <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: r.is_substitution ? "#15803D" : "#B45309" }}>{r.substitution_note}</div>
                  )}

                  {eligibleForRequest && (
                    <div style={{ display: "flex", gap: 14, marginTop: 10, paddingTop: 10, borderTop: "1px solid #F1F4F9" }}>
                      <Button
                        variant="text"
                        onClick={() =>
                          setRequestModal({
                            mode: "takeover",
                            period: { slot_id: r.id, period_number: r.period_number, start_time: r.start_time, end_time: r.end_time, subject_name: r.subject_name, subject_code: r.subject_code, class_section: r.class_section, department_name: r.department_name },
                          })
                        }
                      >
                        Request take-over
                      </Button>
                      <Button
                        variant="text"
                        onClick={() =>
                          setRequestModal({
                            mode: "swap",
                            period: { slot_id: r.id, period_number: r.period_number, start_time: r.start_time, end_time: r.end_time, subject_name: r.subject_name, subject_code: r.subject_code, class_section: r.class_section, department_name: r.department_name },
                          })
                        }
                      >
                        Request swap
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {displayRows.length === 0 && !today.isLoading && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No classes scheduled this day.</div>
            )}
          </div>
        </>
      )}

      {tab === "requests" && <TimetableRequestsPanel />}

      <TimetableRequestModal
        open={requestModal !== null}
        mode={requestModal?.mode ?? "takeover"}
        period={requestModal?.period ?? null}
        date={selectedDateIso}
        dateLabel={selectedDateLabel}
        onClose={() => setRequestModal(null)}
      />

      {tab === "week" && week.isLoading && weekDays.length === 0 && <SkeletonBlock className="mt-5" />}
      {tab === "week" && !(week.isLoading && weekDays.length === 0) && (
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20, marginTop: 20, overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: `56px repeat(${TIME_COLUMNS.length}, minmax(120px,1fr))`, gap: 10 }}>
            <div />
            {TIME_COLUMNS.map((t) => (
              <div key={t} style={{ textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "#94A3B8" }}>
                {t}
              </div>
            ))}

            {DAY_ROWS.map((day, dayIdx) => {
              const realDay = dayByIndex(dayIdx);
              const slotsByPeriod = new Map((realDay?.slots ?? []).map((s) => [s.period_number, s]));
              return (
                <div key={day} style={{ display: "contents" }}>
                  <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 800 }}>{day}</div>
                  {TIME_COLUMNS.map((_, colIdx) => {
                    const period = colIdx + 1;
                    const slot = slotsByPeriod.get(period);
                    const isBreak = colIdx === BREAK_COLUMN_INDEX && !slot;
                    // isLab is the real subjects.course_type enum ('PRACTICAL'
                    // or 'THEORY_WITH_PRACTICAL'), not a guess from the
                    // subject name — a name-regex previously mislabeled any
                    // lab subject not literally containing "lab" and always
                    // rendered the fixed, fabricated text "CN Lab" regardless
                    // of which subject it actually was.
                    const isLab = slot ? slot.subject.course_type === "PRACTICAL" || slot.subject.course_type === "THEORY_WITH_PRACTICAL" : false;
                    const kind: CellKind = slot ? (isLab ? "lab" : "class") : isBreak ? "break" : "free";
                    return (
                      <div
                        key={colIdx}
                        data-advisor-lift={slot ? "" : undefined}
                        style={{ borderRadius: 10, padding: "12px 10px", minHeight: 62, ...cellStyle(kind) }}
                      >
                        {slot ? (
                          <>
                            <div style={{ fontSize: 12.5, fontWeight: 800, color: isLab ? "#1D4ED8" : "#1E3A8A", lineHeight: 1.3 }}>
                              {slot.subject.subject_code}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#7C8899", marginTop: 3 }}>{slot.subject.name}</div>
                          </>
                        ) : (
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: isBreak ? "#94A3B8" : "#CBD5E1" }}>{isBreak ? "Break" : "Free"}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 20, paddingTop: 16, borderTop: "1px solid #F1F4F9", flexWrap: "wrap" }}>
            {[
              { key: "class", label: "Class" },
              { key: "lab", label: "Lab" },
              { key: "free", label: "Free hour" },
              { key: "break", label: "Break" },
            ].map((l) => (
              <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, ...cellStyle(l.key as CellKind) }} />
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>{l.label}</div>
              </div>
            ))}
          </div>

          {weekDays.length === 0 && !week.isLoading && (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No weekly timetable found — grid shown with placeholder Free/Break cells only.</div>
          )}
        </div>
      )}
    </div>
  );
}

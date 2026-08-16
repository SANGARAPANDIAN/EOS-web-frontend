"use client";

import { useEffect, useMemo, useState } from "react";
import { SecretaryIcon } from "@/modules/secretary/icons";
import { useBatchesLookup, useDepartmentsLookup, useClassesLookup } from "@/modules/secretary/api/announcements";
import { useStudentsSearch } from "@/modules/secretary/api/overview";
import { useTimetableSlots, useAttendanceRecords, useCreateAttendance } from "@/modules/secretary/api/attendance";

// Pixel-exact layout port of the `isAttendance` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 342-514.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/writes go through
// EOSbackend1's real `/timetable-slots`, `/principal-students` (roster,
// via `class_id` filter added for this screen — real column, no
// migration) and `/attendance`/`/attendance-records` (mark + read)
// modules. The 3-way Present/Absent/OD toggle IS real — the real
// `attendance_status_enum` has always had all 3 values and the create
// endpoint already accepted 'on_duty'; an earlier pass here wrongly
// assumed only 2 values existed and dropped the 3rd, which is corrected
// now. There is still no attendance changelog/audit-trail table anywhere
// in the schema, so the design's "find a person, see who changed their
// mark" History feature has no real backing for the "who changed it"
// part specifically — the person-search + per-person history below ARE
// real (computed live from attendance_records), only the change-log
// (before→after, changed by) is a genuine gap, flagged where it would
// appear.

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MARK_TONE = { bgP: "#ecfdf5", fgP: "#047857", bgA: "#fef2f2", fgA: "#b91c1c", bgO: "#eef4ff", fgO: "#1d4ed8" };

type Mark = "present" | "absent" | "on_duty";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function SecretaryAttendancePage() {
  const [tab, setTab] = useState<"Mark" | "History">("Mark");
  const [toast, setToast] = useState("");

  const { data: batches } = useBatchesLookup();
  const currentBatchId = useMemo(() => (batches ?? []).reduce<number | undefined>((best, b) => (best === undefined ? b.id : best), undefined), [batches]);
  const { data: departments } = useDepartmentsLookup(currentBatchId);
  const cseDept = useMemo(() => (departments ?? []).find((d) => d.code?.toUpperCase() === "CSE") ?? departments?.[0], [departments]);
  const { data: classes } = useClassesLookup(currentBatchId, cseDept?.id);

  const [classId, setClassId] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!classId && classes && classes.length > 0) setClassId(classes[0].id);
  }, [classes, classId]);

  const { data: slots } = useTimetableSlots(classId);
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (slots?.data && slots.data.length > 0 && subjectId === undefined) setSubjectId(slots.data[0].subject.id);
  }, [slots, subjectId]);

  const [date] = useState(todayIso());
  const { data: roster, isLoading: rosterLoading } = useStudentsSearch({ class_id: classId, limit: 100 });
  const [search, setSearch] = useState("");
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [savedAt, setSavedAt] = useState("");

  const createMutation = useCreateAttendance();

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const students = roster?.students ?? [];
  const markOf = (id: number): Mark => marks[id] ?? "present";
  const setMark = (id: number, v: Mark) => setMarks((m) => ({ ...m, [id]: v }));
  const marksList = students.map((s) => markOf(s.id));
  const present = marksList.filter((m) => m === "present").length;
  const absent = marksList.filter((m) => m === "absent").length;
  const onDuty = marksList.filter((m) => m === "on_duty").length;
  const pct = students.length > 0 ? Math.round((present / students.length) * 1000) / 10 : 0;

  function markAllPresent() {
    const m: Record<number, Mark> = {};
    students.forEach((s) => (m[s.id] = "present"));
    setMarks(m);
    flash(`All ${students.length} students marked present.`);
  }
  function markAllAbsent() {
    const m: Record<number, Mark> = {};
    students.forEach((s) => (m[s.id] = "absent"));
    setMarks(m);
    flash(`All ${students.length} students marked absent.`);
  }
  function resetMarks() {
    setMarks({});
    flash("Marks reset.");
  }
  async function saveAttendance() {
    if (!classId || students.length === 0) {
      flash("No students loaded for this class yet.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        class_id: classId,
        subject_id: subjectId,
        date,
        records: students.map((s) => ({ student_id: s.id, status: markOf(s.id) })),
      });
      setSavedAt(`saved just now`);
      flash(`Attendance saved · ${present} present, ${absent} absent, ${onDuty} on duty.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not save attendance — it may already be marked for this class/date.");
    }
  }

  const filtered = students.filter((s) => !search || (s.name + " " + s.student_id_no).toLowerCase().includes(search.toLowerCase()));

  const stats = [
    { label: "On roll", value: String(students.length), foot: `Section ${classes?.find((c) => c.id === classId)?.section ?? "—"}` },
    { label: "Present", value: String(present), foot: "unsaved — click Save to persist" },
    { label: "Absent", value: String(absent), foot: "unsaved — click Save to persist" },
    { label: "On duty", value: String(onDuty), foot: "unsaved — click Save to persist" },
    { label: "Session %", value: `${pct}%`, foot: "updates as you mark" },
  ];

  // ---------- History tab ----------
  const [histClassId, setHistClassId] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!histClassId && classes && classes.length > 0) setHistClassId(classes[0].id);
  }, [classes, histClassId]);
  const [histDate, setHistDate] = useState(todayIso());

  // "Find a person" — real, via the same /principal-students search the
  // roster already uses, then that student's own attendance_records
  // history (student_id filter, already supported by the real endpoint).
  const [personQuery, setPersonQuery] = useState("");
  const { data: personResults } = useStudentsSearch({ search: personQuery || undefined, limit: 5 });
  const [selectedPersonId, setSelectedPersonId] = useState<number | undefined>(undefined);
  const selectedPerson = personResults?.students.find((s) => s.id === selectedPersonId);
  const { data: personHistory, isLoading: personHistoryLoading } = useAttendanceRecords({ student_id: selectedPersonId });

  const dayMode = selectedPersonId === undefined;
  const { data: histRecords, isLoading: histLoading, error: histError } = useAttendanceRecords(dayMode ? { class_id: histClassId, date: histDate } : {});

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1 }}>Bulk Attendance Marking</h1>
          <p style={{ margin: "9px 0 0", fontSize: 13.5, color: "#64748b" }}>Mark or update a whole section in one pass · {savedAt || "nothing saved for this session yet"}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 5 }}>
            {(["Mark", "History"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ border: 0, background: tab === t ? "#ffffff" : "transparent", color: tab === t ? "#1d4ed8" : "#64748b", fontSize: 13.1, fontWeight: tab === t ? 600 : 500, padding: "11px 26px", borderRadius: 9, cursor: "pointer", boxShadow: tab === t ? "0 1px 2px rgba(15,23,42,0.08)" : "none" }}>{t}</button>
            ))}
          </div>
          {tab === "Mark" && (
            <button onClick={saveAttendance} disabled={createMutation.isPending} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "15px 26px", cursor: "pointer", opacity: createMutation.isPending ? 0.7 : 1 }}>Save attendance</button>
          )}
        </div>
      </div>

      {tab === "Mark" && (
        <>
          <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <div style={{ height: 44, display: "flex", alignItems: "center", gap: 9, border: "1px solid #c7d7fe", background: "#eef4ff", color: "#1e3a8a", borderRadius: 10, padding: "0 15px", fontSize: 12.2, fontWeight: 600, whiteSpace: "nowrap" }}>
              <SecretaryIcon name="calcheck" size={16} />{date}
            </div>
            <select data-sec-lift="" value={classId ?? ""} onChange={(e) => { setClassId(parseInt(e.target.value, 10)); setSearch(""); setMarks({}); }} style={{ height: 44, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 12px", fontSize: 12.2, fontWeight: 600, color: "#0f172a", background: "#ffffff" }}>
              {(classes ?? []).map((c) => <option key={c.id} value={c.id}>Section {c.section}{c.current_semester ? ` · Sem ${c.current_semester}` : ""}</option>)}
            </select>
            <select data-sec-lift="" value={subjectId ?? ""} onChange={(e) => setSubjectId(parseInt(e.target.value, 10) || undefined)} style={{ height: 44, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 12px", fontSize: 12.2, color: "#0f172a", background: "#ffffff" }}>
              {(slots?.data ?? []).map((s) => <option key={s.id} value={s.subject.id}>{s.subject.name} · P{s.period_number} {s.start_time}</option>)}
              {(!slots?.data || slots.data.length === 0) && <option value="">No timetable slots for this class</option>}
            </select>
            <input data-sec-lift="" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find student or roll no." style={{ height: 44, flex: 1, minWidth: 220, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 14px", fontSize: 12.2 }} />
            <button onClick={markAllPresent} style={{ height: 44, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#047857", fontSize: 11.7, fontWeight: 600, borderRadius: 10, padding: "0 16px", cursor: "pointer" }}>Mark all present</button>
            <button onClick={markAllAbsent} style={{ height: 44, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 11.7, fontWeight: 600, borderRadius: 10, padding: "0 16px", cursor: "pointer" }}>Mark all absent</button>
            <button data-sec-lift="" onClick={resetMarks} style={{ height: 44, border: "1px solid #e5e9f2", background: "#ffffff", color: "#475569", fontSize: 11.7, fontWeight: 600, borderRadius: 10, padding: "0 16px", cursor: "pointer" }}>Reset</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 18, marginBottom: 18 }}>
            {stats.map((s) => (
              <div key={s.label} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ fontSize: 12.2, fontWeight: 600, color: "#334155" }}>{s.label}</div>
                <div style={{ fontSize: 29.6, fontWeight: 700, letterSpacing: -1, marginTop: 4 }}>{s.value}</div>
                <div style={{ fontSize: 11.8, color: "#94a3b8" }}>{s.foot}</div>
              </div>
            ))}
          </div>

          <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 1fr 2.2fr", gap: 12, padding: "13px 20px", background: "#ffffff", borderBottom: "1px solid #eef2f7", fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8" }}>
              <span>Roll no.</span><span>Student</span><span>Term %</span><span style={{ textAlign: "right" }}>Mark</span>
            </div>
            {rosterLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>Loading roster…</div>}
            {filtered.map((st) => {
              const m = markOf(st.id);
              const attPct = st.attendance_pct ?? 0;
              const pctFg = attPct < 75 ? "#b91c1c" : attPct < 85 ? "#b45309" : "#047857";
              return (
                <div key={st.id} data-sec-row="" style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 1fr 2.2fr", gap: 12, alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #f5f7fa" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#475569" }}>{st.student_id_no}</span>
                  <span style={{ fontSize: 12.6, fontWeight: 500 }}>{st.name}</span>
                  <span style={{ fontSize: 11.7, color: pctFg, fontWeight: 600 }}>{st.attendance_pct !== null ? `${attPct}%` : "—"}</span>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button onClick={() => setMark(st.id, "present")} style={{ border: "1px solid #e5e9f2", borderRadius: 8, padding: "7px 12px", fontSize: 11.8, fontWeight: 600, cursor: "pointer", background: m === "present" ? MARK_TONE.bgP : "#ffffff", color: m === "present" ? MARK_TONE.fgP : "#64748b" }}>Present</button>
                    <button onClick={() => setMark(st.id, "absent")} style={{ border: "1px solid #e5e9f2", borderRadius: 8, padding: "7px 12px", fontSize: 11.8, fontWeight: 600, cursor: "pointer", background: m === "absent" ? MARK_TONE.bgA : "#ffffff", color: m === "absent" ? MARK_TONE.fgA : "#64748b" }}>Absent</button>
                    <button onClick={() => setMark(st.id, "on_duty")} style={{ border: "1px solid #e5e9f2", borderRadius: 8, padding: "7px 12px", fontSize: 11.8, fontWeight: 600, cursor: "pointer", background: m === "on_duty" ? MARK_TONE.bgO : "#ffffff", color: m === "on_duty" ? MARK_TONE.fgO : "#64748b" }}>OD</button>
                  </div>
                </div>
              );
            })}
            {!rosterLoading && filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No student matches that search.</div>}
          </div>
        </>
      )}

      {tab === "History" && (
        <div>
          <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "18px 20px", marginBottom: 18 }}>
            <div style={{ position: "relative", marginBottom: selectedPerson ? 14 : 0 }}>
              <input
                data-sec-lift=""
                value={selectedPerson ? selectedPerson.name : personQuery}
                onChange={(e) => { setPersonQuery(e.target.value); setSelectedPersonId(undefined); }}
                placeholder="Find a person — student name or roll no."
                style={{ height: 44, width: "100%", border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 14px", fontSize: 12.2, boxSizing: "border-box" }}
              />
              {personQuery && !selectedPerson && (personResults?.students.length ?? 0) > 0 && (
                <div style={{ position: "absolute", top: 48, left: 0, right: 0, background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 10, boxShadow: "0 12px 30px rgba(15,23,42,0.12)", zIndex: 20, overflow: "hidden" }}>
                  {personResults!.students.map((s) => (
                    <button key={s.id} onClick={() => { setSelectedPersonId(s.id); setPersonQuery(""); }} style={{ display: "block", width: "100%", textAlign: "left", border: 0, background: "#ffffff", padding: "10px 14px", fontSize: 12.6, cursor: "pointer" }}>{s.name} · {s.student_id_no}</button>
                  ))}
                </div>
              )}
            </div>
            {selectedPerson ? (
              <button onClick={() => setSelectedPersonId(undefined)} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#475569", fontSize: 11.7, fontWeight: 600, borderRadius: 9, padding: "8px 14px", cursor: "pointer" }}>← Back to day view</button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <select data-sec-lift="" value={histClassId ?? ""} onChange={(e) => setHistClassId(parseInt(e.target.value, 10))} style={{ height: 44, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 12px", fontSize: 12.2, fontWeight: 600, color: "#0f172a", background: "#ffffff" }}>
                  {(classes ?? []).map((c) => <option key={c.id} value={c.id}>Section {c.section}{c.current_semester ? ` · Sem ${c.current_semester}` : ""}</option>)}
                </select>
                <input data-sec-lift="" type="date" value={histDate} onChange={(e) => setHistDate(e.target.value)} style={{ height: 44, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 14px", fontSize: 12.2 }} />
              </div>
            )}
          </div>

          {selectedPerson ? (
            <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 24px", borderBottom: "1px solid #eef2f7" }}>
                <div style={{ width: 40, height: 40, borderRadius: 999, background: "#eef4ff", color: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.2, fontWeight: 700 }}>{selectedPerson.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 14.4, fontWeight: 700 }}>{selectedPerson.name}</div>
                  <div style={{ fontSize: 11.3, color: "#94a3b8" }}>{selectedPerson.student_id_no} · {selectedPerson.department_name} · term attendance {selectedPerson.attendance_pct !== null ? `${selectedPerson.attendance_pct}%` : "—"}</div>
                </div>
              </div>
              <div style={{ padding: "14px 24px 0", fontSize: 11.3, fontWeight: 600, letterSpacing: 0.5, color: "#94a3b8", textTransform: "uppercase" }}>Marking history</div>
              {personHistoryLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>Loading…</div>}
              {(personHistory?.data ?? []).map((r) => {
                const t = r.status === "absent" ? { bg: "#fef2f2", fg: "#b91c1c" } : r.status === "on_duty" ? { bg: "#eef4ff", fg: "#1d4ed8" } : { bg: "#ecfdf5", fg: "#047857" };
                return (
                  <div key={r.id} data-sec-row="" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr", gap: 12, alignItems: "center", padding: "13px 24px", borderBottom: "1px solid #f5f7fa" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#475569" }}>{r.date.slice(0, 10)}</span>
                    <span style={{ fontSize: 12.2, color: "#475569" }}>{r.subject?.name ?? "—"}</span>
                    <span style={{ fontSize: 11.3, fontWeight: 700, letterSpacing: 0.5, borderRadius: 999, padding: "5px 11px", justifySelf: "start", background: t.bg, color: t.fg }}>{r.status.toUpperCase()}</span>
                  </div>
                );
              })}
              {!personHistoryLoading && (personHistory?.data.length ?? 0) === 0 && (
                <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No attendance recorded for this student yet.</div>
              )}
            </div>
          ) : (
            <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #eef2f7", fontSize: 14.8, fontWeight: 700 }}>
                {MONTH_NAMES[parseInt(histDate.split("-")[1], 10) - 1]} {histDate.split("-")[2]}, {histDate.split("-")[0]}
              </div>
              {histLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>Loading records…</div>}
              {histError && (
                <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#b91c1c" }}>{histError instanceof Error ? histError.message : "Could not load attendance history."}</div>
              )}
              {(histRecords?.data ?? []).map((r) => {
                const t = r.status === "absent" ? { bg: "#fef2f2", fg: "#b91c1c" } : r.status === "on_duty" ? { bg: "#eef4ff", fg: "#1d4ed8" } : { bg: "#ecfdf5", fg: "#047857" };
                return (
                  <div key={r.id} data-sec-row="" style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr 1.4fr", gap: 12, alignItems: "center", padding: "13px 24px", borderBottom: "1px solid #f5f7fa" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#475569" }}>{r.student.student_id_no}</span>
                    <span style={{ fontSize: 12.2, fontWeight: 500 }}>{r.student.first_name ? `${r.student.first_name} ${r.student.last_name ?? ""}`.trim() : r.student.student_id_no}</span>
                    <span style={{ fontSize: 11.3, fontWeight: 700, letterSpacing: 0.5, borderRadius: 999, padding: "5px 11px", justifySelf: "start", background: t.bg, color: t.fg }}>{r.status.toUpperCase()}</span>
                  </div>
                );
              })}
              {!histLoading && !histError && (histRecords?.data.length ?? 0) === 0 && (
                <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No attendance was marked for this class on this date.</div>
              )}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}

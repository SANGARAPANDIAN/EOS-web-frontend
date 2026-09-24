"use client";

import { useMemo, useState } from "react";
import {
  useUpcomingInternshipDrives,
  useStudentInternshipHistory,
  useAllMenteesInternshipHistory,
  type UpcomingInternshipDrive,
} from "@/modules/advisor/api/internships";
import { useMentoredStudents, useDriveApplications } from "@/modules/advisor/api/placements";
import { useMenteeRoster } from "@/modules/advisor/api/dashboard";
import { useIsClassAdvisor } from "@/modules/advisor/api/profile";

// Mirrors faculty/placements/page.tsx exactly — Internships are a
// drive_type on the same placement_drives table Placements already reads
// (see EOSbackend1/internship_drive_type.query.md), not a separate concept,
// so the layout stays consistent rather than inventing a new one. Mentee
// scoping (useMentoredStudents/useDriveApplications) is reused unchanged
// from the Placements module — it's driveId/mentee-class scoped, not
// drive-type scoped.

function initialsOf(name: string | null | undefined) {
  const p = (name ?? "").split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function tabButtonStyle(active: boolean) {
  return {
    padding: "13px 22px",
    borderRadius: 8,
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    background: active ? "#fff" : "transparent",
    color: active ? "#1D4ED8" : "#64748B",
    boxShadow: active ? "0 1px 3px rgba(15,23,42,0.1)" : "none",
    textAlign: "center" as const,
  };
}

type DriveStatusBucket = "Applied" | "Selected" | "Not selected";

function driveStatusBucket(status: string): DriveStatusBucket {
  if (status === "placed") return "Selected";
  if (status === "rejected") return "Not selected";
  return "Applied";
}

function driveStatusStyle(bucket: DriveStatusBucket) {
  if (bucket === "Selected") return { bg: "#EFF6FF", border: "#DBEAFE", color: "#1D4ED8" };
  if (bucket === "Not selected") return { bg: "#F1F5F9", border: "#CBD5E1", color: "#475569" };
  return { bg: "#FFFBEB", border: "#FDE68A", color: "#92400E" };
}

interface DriveApplicantRow {
  student_id: number;
  student_id_no: string;
  name: string;
  status: string;
}

function DriveApplicantsTable({
  rows,
  cgpaByStudentId,
  loading,
  emptyMessage,
}: {
  rows: DriveApplicantRow[];
  cgpaByStudentId: Map<number, number | null>;
  loading?: boolean;
  emptyMessage: string;
}) {
  return (
    <div style={{ marginTop: 14, border: "1px solid #EEF1F6", borderRadius: 12, overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2.4fr 1fr 1.2fr",
          padding: "12px 16px",
          background: "#F8FAFC",
          borderBottom: "1px solid #EEF1F6",
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: "0.09em",
          color: "#94A3B8",
        }}
      >
        <div>STUDENT</div>
        <div>CGPA</div>
        <div>STATUS</div>
      </div>
      {rows.map((s) => {
        const bucket = driveStatusBucket(s.status);
        const style = driveStatusStyle(bucket);
        return (
          <div key={s.student_id} data-advisor-lift="" style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr 1.2fr", padding: "12px 16px", borderBottom: "1px solid #F4F6FA", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 32px" }}>
                {initialsOf(s.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{s.student_id_no}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{cgpaByStudentId.get(s.student_id)?.toFixed(2) ?? "—"}</div>
            <div>
              <span style={{ padding: "5px 12px", borderRadius: 20, background: style.bg, border: `1px solid ${style.border}`, color: style.color, fontSize: 11, fontWeight: 800 }}>
                {bucket}
              </span>
            </div>
          </div>
        );
      })}
      {rows.length === 0 && !loading && (
        <div style={{ padding: "20px 16px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 13 }}>{emptyMessage}</div>
      )}
    </div>
  );
}

function DriveCard({
  drive: d,
  isOpen,
  onToggle,
  cgpaByStudentId,
}: {
  drive: UpcomingInternshipDrive;
  isOpen: boolean;
  onToggle: () => void;
  cgpaByStudentId: Map<number, number | null>;
}) {
  const applications = useDriveApplications(d.drive_id);
  const rows = applications.data ?? [];

  return (
    <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>{d.company_name}</div>
          <div style={{ fontSize: 13, color: "#7C8899", fontWeight: 600, marginTop: 4 }}>
            {d.venue ?? "—"} · {fmtDate(d.scheduled_date)} · {d.job_role ?? "—"}
          </div>
        </div>
        <div
          style={{
            padding: "6px 12px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 800,
            background: d.status === "scheduled" ? "#EFF6FF" : "#F8FAFC",
            border: `1px solid ${d.status === "scheduled" ? "#DBEAFE" : "#E2E8F0"}`,
            color: d.status === "scheduled" ? "#1D4ED8" : "#475569",
          }}
        >
          {d.status ? d.status.toUpperCase() : "—"}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 22, marginTop: 18, paddingTop: 15, borderTop: "1px solid #F1F4F9", fontSize: 12.5, fontWeight: 600, color: "#7C8899", flexWrap: "wrap" }}>
        <div>Stipend {d.stipend_amount != null ? `₹${d.stipend_amount}/mo` : "—"} · Duration {d.duration_months != null ? `${d.duration_months} months` : "—"}</div>
        <div onClick={onToggle} style={{ color: "#1D4ED8", fontWeight: 700, cursor: "pointer" }}>
          {isOpen ? "Hide student list ↑" : "View student list →"}
        </div>
      </div>
      {isOpen && (
        <DriveApplicantsTable
          rows={rows}
          cgpaByStudentId={cgpaByStudentId}
          loading={applications.isLoading}
          emptyMessage="None of your mentees have applied to this internship."
        />
      )}
    </div>
  );
}

export default function AdvisorInternshipsPage() {
  const [tab, setTab] = useState<"upcoming" | "students" | "history">("students");
  const [openDrive, setOpenDrive] = useState<number | null>(null);
  const [openHistoryDrive, setOpenHistoryDrive] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  const { classes } = useIsClassAdvisor();
  const primaryClass = classes[0];

  const drives = useUpcomingInternshipDrives();
  const mentees = useMentoredStudents();
  const students = mentees.data ?? [];
  const roster = useMenteeRoster(primaryClass?.class_id);
  const cgpaByStudentId = new Map((roster.data?.students ?? []).map((s) => [s.id, s.cgpa]));

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((r) => !q || r.name.toLowerCase().includes(q) || r.student_id_no.toLowerCase().includes(q));
  }, [mentees.data, studentSearch]);

  const selected = students.find((s) => s.student_id === selectedId);
  const selectedHistory = useStudentInternshipHistory(selectedId ?? undefined);

  const allHistory = useAllMenteesInternshipHistory(students.map((s) => s.student_id));
  const historyLoaded = students.length > 0 && allHistory.every((q) => !q.isLoading);
  const historyDataKey = allHistory.map((q) => q.data).join(",");
  const flatHistory = useMemo(
    () =>
      allHistory
        .map((q, i) => ({ student: students[i], rows: q.data ?? [] }))
        .flatMap((x) => x.rows.map((r) => ({ ...r, student: x.student }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [historyDataKey, students.length],
  );
  const historyByStudentId = new Map(allHistory.map((q, i) => [students[i]?.student_id, q.data ?? []]));

  const placedRows = flatHistory.filter((r) => r.application_status === "placed");
  const placedStudentIds = new Set(placedRows.map((r) => r.student.student_id));

  const PLACE_STATS = [
    { label: "Selected", value: students.length ? `${placedStudentIds.size} / ${students.length}` : "—", sub: students.length ? `${Math.round((placedStudentIds.size / students.length) * 100)}% of the class` : "—" },
    { label: "In process", value: historyLoaded ? String(Math.max(0, flatHistory.length ? 0 : 0)) : "—", sub: "active in at least one internship" },
    { label: "Yet to be selected", value: students.length ? String(students.length - placedStudentIds.size) : "—", sub: "eligible for upcoming internships" },
  ];

  const historyByDrive = useMemo(() => {
    const map = new Map<number, { drive_id: number; company: string; role: string | null; date: string; stipend: number | null; selectedRows: DriveApplicantRow[] }>();
    for (const h of flatHistory) {
      const existing = map.get(h.drive_id);
      const row: DriveApplicantRow | null =
        h.application_status === "placed"
          ? { student_id: h.student.student_id, student_id_no: h.student.student_id_no, name: h.student.name, status: h.application_status }
          : null;
      if (existing) {
        if (row) existing.selectedRows.push(row);
      } else {
        map.set(h.drive_id, { drive_id: h.drive_id, company: h.company_name, role: h.job_role, date: h.scheduled_date, stipend: h.stipend_amount, selectedRows: row ? [row] : [] });
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [flatHistory]);

  const HISTORY_STATS = [
    { label: "Selected from class", value: students.length ? `${placedStudentIds.size} / ${students.length}` : "—", sub: students.length ? `${Math.round((placedStudentIds.size / students.length) * 100)}% of the class` : "—" },
    { label: "Internships attended", value: historyLoaded ? String(historyByDrive.length) : "—", sub: "this academic year" },
  ];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Internships</div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
            Training &amp; placement cell · internship drives open to your mentoring class
          </div>
        </div>
        <div style={{ display: "flex", background: "#EEF1F7", borderRadius: 11, padding: 4, gap: 4 }}>
          <div data-advisor-lift="" onClick={() => setTab("students")} style={tabButtonStyle(tab === "students")}>
            Student
            <br />
            records
          </div>
          <div data-advisor-lift="" onClick={() => setTab("upcoming")} style={tabButtonStyle(tab === "upcoming")}>
            Upcoming
            <br />
            internships
          </div>
          <div data-advisor-lift="" onClick={() => setTab("history")} style={tabButtonStyle(tab === "history")}>
            History
          </div>
        </div>
      </div>

      {tab === "upcoming" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
          {(drives.data ?? []).map((d) => (
            <DriveCard
              key={d.drive_id}
              drive={d}
              isOpen={openDrive === d.drive_id}
              onToggle={() => setOpenDrive(openDrive === d.drive_id ? null : d.drive_id)}
              cgpaByStudentId={cgpaByStudentId}
            />
          ))}
          {(drives.data ?? []).length === 0 && !drives.isLoading && (
            <div style={{ padding: "54px 22px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No upcoming internship drives scheduled.</div>
          )}
        </div>
      )}

      {tab === "students" && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
            {PLACE_STATS.map((s) => (
              <div key={s.label} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{s.label}</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#7C8899", fontWeight: 500, marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search student or register no."
              style={{ flex: "1 1 220px", minWidth: 200, padding: "9px 14px", borderRadius: 9, border: "1px solid #E2E8F0", fontSize: 13, fontWeight: 500, color: "#1E293B", outline: "none" }}
            />
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0, background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2.2fr 0.9fr 1fr 1.4fr 1.1fr", padding: "15px 22px", borderBottom: "1px solid #EEF1F6", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>
                <div>STUDENT</div>
                <div>CGPA</div>
                <div>DRIVES</div>
                <div>OFFERS</div>
                <div>STATUS</div>
              </div>
              {filteredStudents.map((r) => {
                const isSelected = r.student_id === selectedId;
                const hist = historyByStudentId.get(r.student_id) ?? [];
                const offers = hist.filter((h) => h.application_status === "placed");
                const placed = offers.length > 0;
                return (
                  <div
                    key={r.student_id}
                    data-advisor-lift=""
                    onClick={() => setSelectedId(r.student_id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2.2fr 0.9fr 1fr 1.4fr 1.1fr",
                      padding: "13px 22px",
                      borderBottom: "1px solid #F4F6FA",
                      alignItems: "center",
                      cursor: "pointer",
                      background: isSelected ? "#F8FAFC" : "transparent",
                      borderLeft: isSelected ? "3px solid #1D4ED8" : "3px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px" }}>
                        {initialsOf(r.name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{r.student_id_no}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{cgpaByStudentId.get(r.student_id)?.toFixed(2) ?? "—"}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{hist.length}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: offers.length ? "#1D4ED8" : "#94A3B8" }}>{offers.length ? offers.map((o) => o.company_name).join(", ") : "—"}</div>
                    <div>
                      <span
                        style={{
                          padding: "5px 12px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 800,
                          background: placed ? "#EFF6FF" : "#F8FAFC",
                          border: `1px solid ${placed ? "#DBEAFE" : "#E2E8F0"}`,
                          color: placed ? "#1D4ED8" : "#94A3B8",
                        }}
                      >
                        {historyLoaded ? (placed ? "SELECTED" : "UNPLACED") : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {students.length === 0 && !mentees.isLoading && (
                <div style={{ padding: "40px 22px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 13.5 }}>You are not the mentor for any class.</div>
              )}
              {students.length > 0 && filteredStudents.length === 0 && (
                <div style={{ padding: "40px 22px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 13.5 }}>No students match this search.</div>
              )}
            </div>

            {selected && (
              <div style={{ width: 380, flex: "0 0 380px", background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22, position: "sticky", top: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 52px" }}>
                    {initialsOf(selected.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.015em" }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginTop: 3 }}>
                      {selected.student_id_no} · CGPA {cgpaByStudentId.get(selected.student_id)?.toFixed(2) ?? "—"}
                    </div>
                  </div>
                  <div
                    onClick={() => setSelectedId(null)}
                    style={{ width: 28, height: 28, borderRadius: "50%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15, color: "#64748B", flex: "0 0 28px" }}
                  >
                    ×
                  </div>
                </div>

                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8", marginTop: 22 }}>INTERNSHIP HISTORY</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {(selectedHistory.data ?? []).map((h) => {
                    const result = h.application_status === "placed" ? "SELECTED" : "NOT CLEARED";
                    return (
                      <div key={h.drive_id} style={{ border: "1px solid #EEF1F6", borderRadius: 12, padding: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, flex: 1, minWidth: 0 }}>{h.company_name}</div>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 20,
                              background: result === "SELECTED" ? "#EFF6FF" : "#F1F5F9",
                              border: `1px solid ${result === "SELECTED" ? "#DBEAFE" : "#CBD5E1"}`,
                              color: result === "SELECTED" ? "#1D4ED8" : "#475569",
                              fontSize: 10.5,
                              fontWeight: 800,
                            }}
                          >
                            {result}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 4 }}>
                          {fmtDate(h.scheduled_date)} · {h.stipend_amount != null ? `₹${h.stipend_amount}/mo` : "—"}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#7C8899", fontWeight: 500, marginTop: 6 }}>{h.job_role ?? "—"}</div>
                      </div>
                    );
                  })}
                  {selectedHistory.data && selectedHistory.data.length === 0 && (
                    <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>No concluded internships yet.</div>
                  )}
                </div>

                {(() => {
                  const offer = (selectedHistory.data ?? []).find((h) => h.application_status === "placed");
                  if (!offer) return null;
                  return (
                    <>
                      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8", marginTop: 22 }}>INTERNSHIP</div>
                      <div style={{ marginTop: 10, background: "#1D4ED8", borderRadius: 12, padding: 16, color: "#fff" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.015em" }}>
                          {offer.company_name} · {offer.stipend_amount != null ? `₹${offer.stipend_amount}/mo` : "—"}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, marginTop: 5 }}>
                          Offer released on {fmtDate(offer.scheduled_date)}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
            {HISTORY_STATS.map((s) => (
              <div key={s.label} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{s.label}</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#7C8899", fontWeight: 500, marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, marginTop: 16, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1.6fr 1.1fr 1fr 1.2fr",
                padding: "15px 22px",
                borderBottom: "1px solid #EEF1F6",
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: "0.09em",
                color: "#94A3B8",
              }}
            >
              <div>COMPANY</div>
              <div>ROLE</div>
              <div>DRIVE DATE</div>
              <div>STIPEND</div>
              <div>STATUS</div>
            </div>
            {historyByDrive.map((h) => {
              const isOpen = openHistoryDrive === h.drive_id;
              return (
                <div key={h.drive_id}>
                  <div
                    data-advisor-lift=""
                    onClick={() => setOpenHistoryDrive(isOpen ? null : h.drive_id)}
                    style={{ display: "grid", gridTemplateColumns: "1.6fr 1.6fr 1.1fr 1fr 1.2fr", padding: "14px 22px", borderBottom: "1px solid #F4F6FA", alignItems: "center", cursor: "pointer" }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{h.company}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>{h.role ?? "—"}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#7C8899" }}>{fmtDate(h.date)}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>{h.stipend !== null ? `₹${h.stipend}/mo` : "—"}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>
                      {h.selectedRows.length} student{h.selectedRows.length === 1 ? "" : "s"} {isOpen ? "↑" : "→"}
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ padding: "0 22px 16px", borderBottom: "1px solid #F4F6FA" }}>
                      <DriveApplicantsTable
                        rows={h.selectedRows}
                        cgpaByStudentId={cgpaByStudentId}
                        emptyMessage="No mentees were selected in this internship."
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {historyLoaded && historyByDrive.length === 0 && (
              <div style={{ padding: "40px 22px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 13.5 }}>No concluded internships yet for your mentoring class.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

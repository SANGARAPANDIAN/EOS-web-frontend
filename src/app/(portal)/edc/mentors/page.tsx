"use client";

import Link from "next/link";
import { useEdcEntrepreneurship, useFacultyDirectory } from "@/modules/edc/api/entrepreneurship";

// Real backend connection — GET /me/faculty-directory (added EDC_COORDINATOR
// to this endpoint's @Roles this session; no dedicated "mentor roster"
// table exists) cross-referenced with real mentor_faculty_id assignments on
// student_entrepreneurship. The design's PAGE_DEFS.mentors wanted an
// "expertise"/"sessions"/"availability" mentor roster — none of that has
// any backend representation, so those columns are honestly dropped rather
// than invented. What IS real and shown: which faculty are actually
// mentoring a venture right now, and how many.

export default function EdcMentorsPage() {
  const faculty = useFacultyDirectory();
  const ventures = useEdcEntrepreneurship();

  const loading = faculty.isLoading || ventures.isLoading;
  const error = faculty.isError ? faculty.error : ventures.isError ? ventures.error : null;

  const mentored = (ventures.data ?? []).filter((v) => v.mentor_faculty_id !== null);
  const activeMentorIds = new Set(mentored.map((v) => v.mentor_faculty_id));

  const rows = (faculty.data ?? [])
    .map((f) => ({
      ...f,
      ventures: mentored.filter((v) => v.mentor_faculty_id === f.id),
    }))
    .filter((f) => activeMentorIds.has(f.id))
    .sort((a, b) => b.ventures.length - a.ventures.length);

  const externalMentors = (ventures.data ?? []).filter((v) => !v.mentor_faculty_id && v.external_mentor_name);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1300 }}>
      <div>
        <h1 style={{ margin: "0 0 8px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em" }}>Mentors</h1>
        <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>Faculty currently mentoring an EDC venture, and any external mentors on record. Assign a mentor from a venture's detail page.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>Faculty mentors</div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>{rows.length}</div>
        </div>
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>Ventures with a mentor</div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>{mentored.length}</div>
        </div>
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>External mentors</div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>{externalMentors.length}</div>
        </div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF2F7", fontSize: 15, fontWeight: 700 }}>Faculty mentors</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.8fr", gap: 16, padding: "11px 22px", background: "#fff", borderBottom: "1px solid #EEF2F7", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#94A3B8" }}>
          <span>MENTOR</span>
          <span>DEPARTMENT</span>
          <span style={{ textAlign: "right" }}>VENTURES</span>
        </div>
        {loading && <div style={{ padding: "36px 22px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>Loading…</div>}
        {error && <div style={{ padding: "36px 22px", textAlign: "center", color: "#DC2626", fontWeight: 600, fontSize: 14 }}>{error instanceof Error ? error.message : "Failed to load mentors."}</div>}
        {rows.length === 0 && !loading && !error && (
          <div style={{ padding: "40px 22px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No faculty are mentoring a venture yet.</div>
        )}
        {rows.map((f) => (
          <div key={f.id} data-edc-row="" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.8fr", gap: 16, alignItems: "center", padding: "13px 22px", borderBottom: "1px solid #EEF2F7" }}>
            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
            <span style={{ fontSize: 13.5, color: "#475569", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.department_name ?? "—"}</span>
            <span style={{ textAlign: "right" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1D4ED8", background: "#EFF6FF", borderRadius: 99, padding: "3px 11px" }}>
                {f.ventures.length} {f.ventures.length === 1 ? "venture" : "ventures"}
              </span>
            </span>
          </div>
        ))}
      </div>

      {externalMentors.length > 0 && (
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF2F7", fontSize: 15, fontWeight: 700 }}>External mentors</div>
          {externalMentors.map((v) => (
            <Link key={v.id} href={`/edc/entrepreneurs/${v.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div data-edc-row="" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "13px 22px", borderBottom: "1px solid #EEF2F7" }}>
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.external_mentor_name}</div>
                  <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.external_mentor_org ?? "No organisation on record"}</div>
                </div>
                <span style={{ fontSize: 12.5, color: "#64748B", flex: "0 0 auto", whiteSpace: "nowrap" }}>mentoring {v.business_name}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

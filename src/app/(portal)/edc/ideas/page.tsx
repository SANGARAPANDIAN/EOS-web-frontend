"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStartupIdeas, useCreateStartupIdea, useDeleteStartupIdea, type ReviewStatus } from "@/modules/edc/api/startupIdeas";
import { useSearchStudentsForEdc, type StudentSearchResult } from "@/modules/edc/api/entrepreneurship";
import { pillSx, toneOf } from "@/modules/edc/genericPage";

// Real backend connection — replaces the fake PAGE_DEFS.ideas. GET/POST/
// PATCH/DELETE /me/startup-ideas (real table + module, see
// api/startupIdeas.ts). The "student" field on the New Idea form now uses
// the real search-students picker (added for Add Student, reused here) —
// the plain numeric student_id input this screen originally had was a
// flagged honest gap; that gap is closed now that the picker exists.

export default function EdcIdeasPage() {
  const router = useRouter();
  const { data, isLoading } = useStartupIdeas();
  const create = useCreateStartupIdea();
  const remove = useDeleteStartupIdea();
  const rows = data ?? [];

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ReviewStatus>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [student, setStudent] = useState<StudentSearchResult | null>(null);
  const studentSearch = useSearchStudentsForEdc(studentQuery);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "All" && r.review_status !== statusFilter) return false;
      if (!q) return true;
      return [r.title, r.student.name, r.category].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [rows, query, statusFilter]);

  const kpis = [
    { label: "Total ideas", value: String(rows.length), note: "Submitted so far", icon: "lightbulb" },
    { label: "Under review", value: String(rows.filter((r) => r.review_status === "Under Review").length), note: "Awaiting decision", icon: "pending_actions" },
    { label: "Selected", value: String(rows.filter((r) => r.review_status === "Selected").length), note: "Cleared screening", icon: "task_alt" },
    { label: "Converted to venture", value: String(rows.filter((r) => r.converted_venture_id !== null).length), note: "Now registered", icon: "rocket_launch" },
  ];

  function submit() {
    if (!student || !title.trim()) {
      setError("Pick a student and enter a title.");
      return;
    }
    create.mutate(
      { student_id: student.id, title, category: category || undefined, problem_statement: problem || undefined, solution: solution || undefined },
      {
        onSuccess: () => {
          setModalOpen(false);
          setStudent(null);
          setStudentQuery("");
          setTitle("");
          setCategory("");
          setProblem("");
          setSolution("");
        },
        onError: (e) => setError(e instanceof Error ? e.message : "Failed to submit idea."),
      },
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1560 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em" }}>Startup Ideas</h1>
          <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>Review student-submitted ideas and track their conversion into startups.</p>
        </div>
        <div onClick={() => { setError(null); setModalOpen(true); }} data-edc-btn-primary="" style={{ display: "flex", alignItems: "center", gap: 9, height: 46, padding: "0 22px", borderRadius: 11, background: "#1D4ED8", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", flex: "none" }}>
          <span className="ms" style={{ fontSize: 19 }}>add</span>
          <span>New Idea</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "18px 20px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: "#475569" }}>{k.label}</span>
              <span className="ms" style={{ width: 32, height: 32, borderRadius: 9, background: "#EFF6FF", color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flex: "none" }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 12.5, color: "#94A3B8" }}>{k.note}</div>
          </div>
        ))}
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ height: 42, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff" }}>
          <span className="ms" style={{ color: "#94A3B8", fontSize: 19 }}>search</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search idea, student or category…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13.5, color: "#0F172A" }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["All", "Under Review", "Selected", "Approved", "Rejected"] as const).map((s) => {
            const active = statusFilter === s;
            return (
              <div key={s} onClick={() => setStatusFilter(s)} style={{ padding: "8px 14px", borderRadius: 99, fontSize: 12.5, cursor: "pointer", fontWeight: active ? 700 : 600, color: active ? "#fff" : "#475569", background: active ? "#1D4ED8" : "#fff", border: `1px solid ${active ? "#1D4ED8" : "#E6EBF2"}` }}>
                {s}
              </div>
            );
          })}
        </div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px 16px" }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>Idea Submissions</h3>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#3B6FD4", background: "#EFF6FF", borderRadius: 99, padding: "3px 10px" }}>{filtered.length} shown</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.1fr 1fr 1fr 0.9fr 0.9fr 0.6fr", gap: 16, padding: "11px 24px", background: "#fff", borderTop: "1px solid #EEF2F7", borderBottom: "1px solid #EEF2F7", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#94A3B8" }}>
          <span>IDEA</span>
          <span>STUDENT</span>
          <span>DEPARTMENT</span>
          <span>CATEGORY</span>
          <span>SUBMITTED</span>
          <span>REVIEW STATUS</span>
          <span style={{ textAlign: "right" }}>ACTIONS</span>
        </div>
        {filtered.map((r) => (
          <div key={r.id} data-edc-row="" style={{ display: "grid", gridTemplateColumns: "1.6fr 1.1fr 1fr 1fr 0.9fr 0.9fr 0.6fr", gap: 16, alignItems: "center", padding: "14px 24px", borderBottom: "1px solid #EEF2F7" }}>
            <div onClick={() => router.push(`/edc/ideas/${r.id}`)} style={{ cursor: "pointer", minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
              {r.team_note && <div style={{ fontSize: 12, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.team_note}</div>}
            </div>
            <span style={{ fontSize: 13.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.student.name}>{r.student.name}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#475569" }}>{r.student.department?.code ?? "—"}</span>
            <span style={{ fontSize: 13.5, color: "#475569", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.category ?? "—"}</span>
            <span style={{ fontSize: 13, color: "#64748B" }}>{new Date(r.submitted_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
            <span><span style={pillSx(toneOf(r.review_status))}>{r.review_status}</span></span>
            <span style={{ textAlign: "right" }} onClick={(e) => { e.stopPropagation(); remove.mutate(r.id); }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>Delete</span>
            </span>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <div style={{ padding: "50px 24px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>
            {rows.length === 0 ? "No startup ideas submitted yet." : "No ideas match this search."}
          </div>
        )}
      </div>

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ width: 560, maxHeight: "82vh", overflowY: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 30px 70px rgba(15,23,42,0.28)", padding: "26px 28px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Log a startup idea</div>
            <div style={{ fontSize: 14, color: "#64748B", marginBottom: 20 }}>Search for the real student who submitted this idea.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>STUDENT</label>
                {student ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 42, padding: "0 13px", border: "1px solid #DBEAFE", background: "#EFF6FF", borderRadius: 10 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1D4ED8" }}>{student.name} · {student.student_id_no}</span>
                    <span onClick={() => setStudent(null)} style={{ fontSize: 12, fontWeight: 700, color: "#64748B", cursor: "pointer" }}>Change</span>
                  </div>
                ) : (
                  <>
                    <input value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Search by roll number, register number or name…" style={{ height: 42, padding: "0 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none" }} />
                    {studentQuery.trim().length >= 2 && (
                      <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid #E2E8F0", borderRadius: 10 }}>
                        {studentSearch.isLoading && <div style={{ padding: 12, fontSize: 12.5, color: "#94A3B8" }}>Searching…</div>}
                        {(studentSearch.data ?? []).map((s) => (
                          <div key={s.id} onClick={() => { setStudent(s); setStudentQuery(""); }} style={{ padding: "9px 13px", cursor: "pointer", borderBottom: "1px solid #F1F5F9" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{s.name}</div>
                            <div style={{ fontSize: 11.5, color: "#94A3B8" }}>{s.roll_no ?? s.register_no ?? s.student_id_no}{s.department ? ` · ${s.department.code}` : ""}</div>
                          </div>
                        ))}
                        {studentSearch.data?.length === 0 && !studentSearch.isLoading && <div style={{ padding: 12, fontSize: 12.5, color: "#94A3B8" }}>No students match.</div>}
                      </div>
                    )}
                  </>
                )}
              </div>
              {[
                { label: "TITLE", value: title, set: setTitle, placeholder: "PulseBand wearable" },
                { label: "CATEGORY", value: category, set: setCategory, placeholder: "HealthTech" },
              ].map((f) => (
                <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>{f.label}</label>
                  <input value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} style={{ height: 42, padding: "0 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none" }} />
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>PROBLEM STATEMENT</label>
                <textarea value={problem} onChange={(e) => setProblem(e.target.value)} style={{ height: 70, padding: "10px 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none", resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>SOLUTION</label>
                <textarea value={solution} onChange={(e) => setSolution(e.target.value)} style={{ height: 70, padding: "10px 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none", resize: "vertical" }} />
              </div>
              {error && <div style={{ fontSize: 12.5, color: "#DC2626", fontWeight: 600 }}>{error}</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <div onClick={() => setModalOpen(false)} data-edc-row="" style={{ height: 42, padding: "0 20px", display: "flex", alignItems: "center", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancel</div>
              <div onClick={submit} data-edc-btn-primary="" style={{ height: 42, padding: "0 22px", display: "flex", alignItems: "center", borderRadius: 10, background: "#1D4ED8", color: "#fff", fontSize: 14, fontWeight: 700, cursor: create.isPending ? "default" : "pointer" }}>
                {create.isPending ? "Saving…" : "Save idea"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

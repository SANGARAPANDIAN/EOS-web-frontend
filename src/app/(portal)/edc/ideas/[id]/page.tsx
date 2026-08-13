"use client";

import { useParams, useRouter } from "next/navigation";
import { useStartupIdea, useReviewStartupIdea, type ReviewStatus } from "@/modules/edc/api/startupIdeas";
import { pillSx, toneOf } from "@/modules/edc/genericPage";

// Real backend connection — replaces the fake IDEA_ROWS detail. GET
// /me/startup-ideas/:id, PATCH for the review action (Select/Approve/Reject).

const REVIEW_ACTIONS: ReviewStatus[] = ["Under Review", "Selected", "Approved", "Rejected"];

export default function EdcIdeaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const { data: it, isLoading } = useStartupIdea(id);
  const review = useReviewStartupIdea();

  if (isLoading) return <div style={{ padding: 60, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>Loading…</div>;
  if (!it) return <div style={{ padding: 60, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>Not found.</div>;

  const stats = [
    { label: "Feasibility", value: it.feasibility_score !== null ? `${it.feasibility_score} / 10` : "—", note: it.feasibility_confidence ? `${it.feasibility_confidence} confidence` : "—" },
    { label: "Budget needed", value: it.budget_needed !== null ? `₹${it.budget_needed.toLocaleString("en-IN")}` : "—", note: "Estimated by the team" },
    { label: "Team", value: it.team_note ?? "—", note: "As reported" },
    { label: "Submitted", value: new Date(it.submitted_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), note: `by ${it.student.name}` },
  ];

  const blocks = [
    { k: "Problem statement", v: it.problem_statement ?? "—", span: true },
    { k: "Proposed solution", v: it.solution ?? "—", span: true },
    { k: "Target customers", v: it.target_customers ?? "—", span: false },
    { k: "Market size", v: it.market_size ?? "—", span: false },
    { k: "Existing alternatives", v: it.competitors ?? "—", span: false },
    { k: "Target milestone", v: it.target_milestone ?? "—", span: false },
    { k: "Attachments", v: it.attachments_note ?? "—", span: true },
  ];

  const trail = [
    { k: "Student · department", v: `${it.student.name} · ${it.student.department?.name ?? "—"} · ${it.student.section ?? "—"}` },
    { k: "Category", v: it.category ?? "—" },
    { k: "Faculty mentor", v: it.mentor_faculty_name ?? "—" },
    { k: "Reviewer", v: it.reviewer_email ?? "Not yet reviewed" },
    { k: "Review status", v: it.review_status },
    { k: "Reviewer note", v: it.reviewer_note ?? "—" },
    { k: "Conversion", v: it.conversion_note ?? (it.converted_venture_name ?? "Not yet a venture") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1360 }}>
      <div onClick={() => router.push("/edc/ideas")} data-edc-back="" style={{ fontSize: 13, fontWeight: 600, color: "#64748B", cursor: "pointer", width: "fit-content" }}>
        ← All startup ideas
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "26px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: "0 0 6px", fontSize: 34, fontWeight: 800, letterSpacing: "-0.025em" }}>{it.title}</h1>
            <p style={{ margin: "0 0 14px", fontSize: 16, color: "#64748B" }}>{it.student.name} · {it.student.department?.code ?? "—"} · submitted {new Date(it.submitted_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <span style={pillSx(toneOf(it.review_status))}>{it.review_status}</span>
              {it.category && <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", background: "#fff", border: "1px solid #E6EBF2", borderRadius: 99, padding: "6px 15px" }}>{it.category}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flex: "none" }}>
            {REVIEW_ACTIONS.filter((a) => a !== it.review_status).map((action) => (
              <div
                key={action}
                onClick={() => review.mutate({ id: it.id, review_status: action })}
                data-edc-row=""
                style={{ padding: "8px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: "1px solid #E6EBF2", color: "#334155" }}
              >
                {action}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
          {stats.map((c) => (
            <div key={c.label} style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{c.value}</div>
              <div style={{ fontSize: 12.5, color: "#94A3B8" }}>{c.note}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "22px 28px", paddingTop: 6 }}>
          {blocks.map((b) => (
            <div key={b.k} style={{ gridColumn: b.span ? "span 2" : undefined }}>
              <div style={{ fontSize: 12.5, color: "#7B8AA0", marginBottom: 5 }}>{b.k}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{b.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>Review &amp; conversion trail</div>
        <div style={{ padding: "6px 24px 14px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "0 32px" }}>
          {trail.map((row) => (
            <div key={row.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, padding: "13px 0", borderBottom: "1px solid #EEF2F7" }}>
              <span style={{ fontSize: 14, color: "#64748B" }}>{row.k}</span>
              <span style={{ fontSize: 14, fontWeight: 700, textAlign: "right" }}>{row.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

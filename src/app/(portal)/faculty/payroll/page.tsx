"use client";

import { useRef, useState } from "react";
import { useMyHrPayroll } from "@/modules/advisor/api/employee";
import { useMyFacultyProfile } from "@/modules/advisor/api/profile";
import { useMyHrQueries, useCreateHrQuery, HR_QUERY_CATEGORIES } from "@/modules/advisor/api/hr-queries";

// Design-exact "Request Category / Subject / Description / Attach a file /
// Submit Request" ticket form + "Request Status" timeline, now fully real:
// backed by the new POST/GET /me/hr-queries (HrQueriesController) — a
// genuinely new feature built this session, since no ticket/query/request
// table existed anywhere in the database before (confirmed via exhaustive
// schema search). See hr-queries.service.ts's own comment for the raw SQL
// that creates the table (schema.prisma itself was not touched).
// The real salary/payslip table (GET /me/hr-payroll, salary_payments) is
// kept below the ticket form — a different, already-real feature that was
// here before, not replaced by this.

function statusPill(status: string) {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    submitted: { bg: "#F1F5F9", border: "#CBD5E1", color: "#475569" },
    under_review: { bg: "#EFF6FF", border: "#DBEAFE", color: "#1D4ED8" },
    resolved: { bg: "#EFF6FF", border: "#DBEAFE", color: "#1D4ED8" },
  };
  const t = map[status] ?? map.submitted;
  return { padding: "6px 12px", borderRadius: 20, background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: 11, fontWeight: 800 } as const;
}

function payrollStatusPill(status: string) {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    processed: { bg: "#EFF6FF", border: "#DBEAFE", color: "#1D4ED8" },
    pending: { bg: "#F1F5F9", border: "#CBD5E1", color: "#475569" },
    hold: { bg: "#FEF2F2", border: "#FECACA", color: "#DC2626" },
  };
  const t = map[status] ?? map.pending;
  return { padding: "5px 12px", borderRadius: 20, background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: 11, fontWeight: 800 } as const;
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;
}

export default function AdvisorPayrollPage() {
  const myProfile = useMyFacultyProfile();
  const payroll = useMyHrPayroll();
  const payrollRows = payroll.data?.data ?? [];

  const queries = useMyHrQueries();
  const create = useCreateHrQuery();
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function submit() {
    if (!category || !subject.trim()) return;
    setFormError(null);
    create.mutate(
      { category, subject: subject.trim(), description: description.trim() || undefined, file: file ?? undefined },
      {
        onSuccess: () => {
          setCategory("");
          setSubject("");
          setDescription("");
          setFile(null);
        },
        onError: (e) => setFormError(e instanceof Error ? e.message : "Failed to submit request."),
      },
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>HR Payroll</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        Payroll &amp; HR queries · {myProfile.data?.name ?? ""}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginTop: 20, alignItems: "start" }}>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>Request Category</div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, background: "#fff" }}
          >
            <option value="">Select a category</option>
            {HR_QUERY_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div style={{ marginTop: 18, fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>Subject</div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, 200))}
            placeholder="e.g. Revised PF contribution query"
            style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 500, background: "#fff" }}
          />

          <div style={{ marginTop: 18, fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>Description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your request in detail"
            style={{ width: "100%", marginTop: 8, height: 110, border: "1px solid #DDE3EC", borderRadius: 10, padding: "12px 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 500, background: "#fff", resize: "vertical" }}
          />

          <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ marginTop: 18, textAlign: "center", padding: 14, border: "1.5px dashed #C7D2E4", borderRadius: 10, color: "#1D4ED8", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
          >
            {file ? `📎 ${file.name}` : "Attach a file (optional)"}
          </div>

          {formError && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>
              {formError}
            </div>
          )}

          <div
            onClick={submit}
            style={{
              marginTop: 20,
              textAlign: "center",
              padding: 16,
              background: create.isPending ? "#93C5FD" : category && subject.trim() ? "#1D4ED8" : "#C7D2E0",
              color: "#fff",
              borderRadius: 11,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {create.isPending ? "Submitting…" : "Submit Request"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>REQUEST STATUS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {(queries.data ?? []).map((q) => (
              <div key={q.id} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 700, flex: 1 }}>{q.ticket_no}</div>
                  <span style={statusPill(q.status)}>{q.status.replace("_", " ").toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", marginTop: 8 }}>{q.subject}</div>
                <div style={{ fontSize: 12, color: "#7C8899", fontWeight: 600, marginTop: 3 }}>{q.category}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginTop: 14, paddingTop: 12, borderTop: "1px solid #F1F4F9" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1D4ED8" }} />
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: "#94A3B8" }}>SUBMITTED</div>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>{fmtDate(q.created_at)}</div>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: q.assigned_to_name ? "#1D4ED8" : "#CBD5E1" }} />
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: "#94A3B8" }}>HR ASSIGNED</div>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>{q.assigned_to_name ?? "Awaiting"}</div>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: q.resolved_at ? "#1D4ED8" : "#CBD5E1" }} />
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: "#94A3B8" }}>RESOLUTION</div>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>{q.resolved_at ? fmtDate(q.resolved_at) : "Awaiting"}</div>
                  </div>
                </div>
                {q.file_url && (
                  <a href={q.file_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 10, fontSize: 12, fontWeight: 700, color: "#1D4ED8" }}>
                    View attachment →
                  </a>
                )}
              </div>
            ))}
            {(queries.data ?? []).length === 0 && !queries.isLoading && (
              <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 40, textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 13.5 }}>
                No requests submitted yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>SALARY RECORDS</div>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, marginTop: 12, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr 1fr 1fr 1fr 1fr",
              padding: "15px 22px",
              borderBottom: "1px solid #EEF1F6",
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: "0.09em",
              color: "#94A3B8",
            }}
          >
            <div>MONTH</div>
            <div>GROSS</div>
            <div>DEDUCTIONS</div>
            <div>NET</div>
            <div>PAID ON</div>
            <div>STATUS</div>
          </div>
          {payrollRows.map((r) => (
            <div key={r.id} data-advisor-lift="" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1fr 1fr 1fr", padding: "14px 22px", borderBottom: "1px solid #F4F6FA", alignItems: "center" }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.month}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#475569" }}>₹{r.gross_amount.toLocaleString("en-IN")}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#DC2626" }}>
                {r.deductions_amount ? `₹${r.deductions_amount.toLocaleString("en-IN")}` : "—"}
                {r.lop_days ? ` · ${r.lop_days} LOP day${r.lop_days === 1 ? "" : "s"}` : ""}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1D4ED8" }}>₹{r.net_amount.toLocaleString("en-IN")}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#7C8899" }}>{r.paid_at ? fmtDate(r.paid_at) : "—"}</div>
              <div>
                <span style={payrollStatusPill(r.status)}>{r.status.toUpperCase()}</span>
              </div>
            </div>
          ))}
          {payrollRows.length === 0 && !payroll.isLoading && (
            <div style={{ padding: "40px 22px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No payroll records yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  useFundingRecords,
  useFundingStats,
  useCreateFundingRecord,
  useDeleteFundingRecord,
  EDC_FUNDING_SOURCE_CATEGORIES,
  EDC_FUNDING_STATUSES,
  type FundingSourceCategory,
  type FundingStatus,
} from "@/modules/edc/api/funding";
import { useSearchStudentsForEdc, type StudentSearchResult } from "@/modules/edc/api/entrepreneurship";
import { pillSx, barSx } from "@/modules/edc/genericPage";

// Real backend connection — GET/POST/DELETE /me/edc-funding, added this
// session on a real `edc_funding_records` table, rebuilt to match the
// design's exact pixel layout (4 KPI cards, Funding Distribution panel,
// Utilisation panel, Funding Records table) instead of the flatter
// per-venture list this page used before — the design's granularity
// (per-disbursement source/amount/date/utilisation%/status) genuinely
// isn't representable by the venture's own flat funding fields.

const inputSx = { height: 40, padding: "0 12px", border: "1px solid #E2E8F0", borderRadius: 9, background: "#fff", fontFamily: "inherit", fontSize: 13.5, color: "#0F172A", outline: "none", width: "100%" } as const;

function lakh(n: number): string {
  return `₹${(n / 100000).toFixed(1)}L`;
}
function rupee(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function statusTone(status: FundingStatus) {
  if (status === "Verified") return pillSx("green");
  if (status === "In Progress") return pillSx("amber");
  return pillSx("slate");
}

export default function EdcFundingPage() {
  const stats = useFundingStats();
  const records = useFundingRecords();
  const create = useCreateFundingRecord();
  const remove = useDeleteFundingRecord();

  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentQuery, setStudentQuery] = useState("");
  const [student, setStudent] = useState<StudentSearchResult | null>(null);
  const studentSearch = useSearchStudentsForEdc(studentQuery);
  const [form, setForm] = useState({
    source_category: EDC_FUNDING_SOURCE_CATEGORIES[0] as FundingSourceCategory,
    source_detail: "",
    amount: "",
    disbursed_date: "",
    utilisation_pct: "",
    status: EDC_FUNDING_STATUSES[2] as FundingStatus,
  });

  const maxDist = Math.max(1, ...(stats.data?.distribution.map((d) => d.count) ?? [1]));
  const util = stats.data?.utilisation;
  const maxUtil = Math.max(1, util?.utilised ?? 0, util?.committed ?? 0, util?.unreported ?? 0);

  function openModal() {
    setStudent(null);
    setStudentQuery("");
    setForm({ source_category: EDC_FUNDING_SOURCE_CATEGORIES[0], source_detail: "", amount: "", disbursed_date: new Date().toISOString().slice(0, 10), utilisation_pct: "0", status: EDC_FUNDING_STATUSES[2] });
    setError(null);
    setModalOpen(true);
  }

  function submit() {
    if (!student || !student.student_entrepreneurship_id || !form.amount || !form.disbursed_date) {
      setError("Pick a venture, amount and date are required.");
      return;
    }
    create.mutate(
      {
        student_entrepreneurship_id: student.student_entrepreneurship_id,
        source_category: form.source_category,
        source_detail: form.source_detail || undefined,
        amount: Number(form.amount),
        disbursed_date: form.disbursed_date,
        utilisation_pct: form.utilisation_pct ? Number(form.utilisation_pct) : undefined,
        status: form.status,
      },
      { onSuccess: () => setModalOpen(false), onError: (e) => setError(e instanceof Error ? e.message : "Failed to save funding record.") },
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1400 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em" }}>Funding</h1>
          <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>Monitor grants, competition prizes and external investment across startups.</p>
        </div>
        <div data-edc-btn-primary="" onClick={openModal} style={{ padding: "12px 20px", borderRadius: 11, background: "#1D4ED8", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          + Log disbursement
        </div>
      </div>

      {stats.isLoading && <div style={{ color: "#94A3B8", fontSize: 14 }}>Loading…</div>}
      {stats.isError && <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14 }}>{stats.error instanceof Error ? stats.error.message : "Failed to load funding data."}</div>}

      {stats.data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
            <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>Total funding</div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 8 }}>{lakh(stats.data.total_funding)}</div>
              <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>{stats.data.disbursement_count} disbursements</div>
            </div>
            <div data-edc-lift="" style={{ background: "#EFF6FF", border: "1px solid #CFE0F7", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 14, color: "#3B6FD4", fontWeight: 600 }}>College grant</div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 8 }}>{lakh(stats.data.college_grant)}</div>
              <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>Innovation grant</div>
            </div>
            <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>Competition prize</div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 8 }}>{lakh(stats.data.competition_prize)}</div>
              <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>Across wins</div>
            </div>
            <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>External investment</div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 8 }}>{lakh(stats.data.external_investment)}</div>
              <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>Ventures funded</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 18 }}>
            <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>Funding Distribution</h3>
                <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>{stats.data.disbursement_count} disbursements</span>
              </div>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: "#7B8AA0" }}>Number of ventures funded by each source.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {stats.data.distribution.map((d) => (
                  <div key={d.category} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>{d.category}</span>
                      <span style={{ fontWeight: 700 }}>{d.count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: "#E9EEF6" }}>
                      <div style={barSx(Math.round((d.count / maxDist) * 100))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>Utilisation</h3>
                <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>{rupee(util?.utilised ?? 0)} used</span>
              </div>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: "#7B8AA0" }}>Grant utilisation reported against disbursed amounts.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Utilised", value: util?.utilised ?? 0 },
                  { label: "Committed", value: util?.committed ?? 0 },
                  { label: "Unreported", value: util?.unreported ?? 0 },
                ].map((u) => (
                  <div key={u.label} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>{u.label}</span>
                      <span style={{ fontWeight: 700 }}>{lakh(u.value)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: "#E9EEF6" }}>
                      <div style={barSx(Math.round((u.value / maxUtil) * 100), u.label === "Unreported" ? "#94A3B8" : undefined)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px 16px" }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>Funding Records</h3>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#3B6FD4", background: "#EFF6FF", borderRadius: 99, padding: "3px 10px" }}>{records.data?.length ?? 0} shown</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr 0.9fr 0.9fr 1.1fr 0.8fr 0.6fr", gap: 16, padding: "11px 24px", background: "#fff", borderTop: "1px solid #EEF2F7", borderBottom: "1px solid #EEF2F7", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#94A3B8" }}>
          <span>SOURCE</span>
          <span>VENTURE</span>
          <span>AMOUNT</span>
          <span>DATE</span>
          <span>UTILISATION</span>
          <span>STATUS</span>
          <span style={{ textAlign: "right" }}>ACTIONS</span>
        </div>
        {records.isLoading && <div style={{ padding: "40px 24px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>Loading…</div>}
        {records.data?.length === 0 && !records.isLoading && (
          <div style={{ padding: "50px 24px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No funding disbursements logged yet.</div>
        )}
        {records.data?.map((r) => (
          <div key={r.id} data-edc-row="" style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr 0.9fr 0.9fr 1.1fr 0.8fr 0.6fr", gap: 16, alignItems: "center", padding: "14px 24px", borderBottom: "1px solid #EEF2F7" }}>
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.source_category}</div>
              {r.source_detail && <div style={{ fontSize: 12, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.source_detail}</div>}
            </div>
            <span style={{ fontSize: 13.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.venture_name ?? undefined}>{r.venture_name ?? "—"}</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{rupee(r.amount)}</span>
            <span style={{ fontSize: 13, color: "#64748B" }}>{new Date(r.disbursed_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
            <div>
              <div style={{ height: 6, borderRadius: 99, background: "#E9EEF6", marginBottom: 4 }}><div style={barSx(r.utilisation_pct)} /></div>
              <span style={{ fontSize: 11.5, color: "#64748B" }}>{r.utilisation_pct}%</span>
            </div>
            <span><span style={statusTone(r.status)}>{r.status}</span></span>
            <span style={{ textAlign: "right" }} onClick={() => remove.mutate(r.id)}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>Delete</span>
            </span>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 26, width: 460, maxHeight: "85vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Log a funding disbursement</div>
            {error && <div style={{ padding: "9px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>{error}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8" }}>VENTURE</label>
              {student ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 42, padding: "0 13px", border: "1px solid #DBEAFE", background: "#EFF6FF", borderRadius: 10 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1D4ED8" }}>{student.name}</span>
                  <span onClick={() => setStudent(null)} style={{ fontSize: 12, fontWeight: 700, color: "#64748B", cursor: "pointer" }}>Change</span>
                </div>
              ) : (
                <>
                  <input value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Search by roll number or name…" style={inputSx} />
                  {studentQuery.trim().length >= 2 && (() => {
                    const matches = (studentSearch.data ?? []).filter((s) => s.has_venture && s.student_entrepreneurship_id != null);
                    return (
                      <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #E2E8F0", borderRadius: 10 }}>
                        {studentSearch.isLoading && (
                          <div style={{ padding: "10px 13px", fontSize: 12.5, color: "#94A3B8" }}>Searching…</div>
                        )}
                        {!studentSearch.isLoading && matches.length === 0 && (
                          <div style={{ padding: "10px 13px", fontSize: 12.5, color: "#94A3B8" }}>No student with a registered venture matches this search.</div>
                        )}
                        {matches.map((s) => {
                          const rollNumber = s.roll_no ?? s.register_no ?? s.student_id_no;
                          return (
                            <div
                              key={s.id}
                              onClick={() => { setStudent(s); setStudentQuery(""); }}
                              style={{ padding: "9px 13px", cursor: "pointer", borderBottom: "1px solid #F1F5F9" }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                              <div style={{ fontSize: 11.5, color: "#94A3B8" }}>{rollNumber}{s.department ? ` · ${s.department.code}` : ""}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <div style={{ fontSize: 11.5, color: "#94A3B8" }}>Only students with a registered venture can receive funding.</div>
                </>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8" }}>SOURCE</label>
                <select style={inputSx} value={form.source_category} onChange={(e) => setForm((f) => ({ ...f, source_category: e.target.value as FundingSourceCategory }))}>
                  {EDC_FUNDING_SOURCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8" }}>STATUS</label>
                <select style={inputSx} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FundingStatus }))}>
                  {EDC_FUNDING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8" }}>SOURCE DETAIL</label>
              <input style={inputSx} value={form.source_detail} onChange={(e) => setForm((f) => ({ ...f, source_detail: e.target.value }))} placeholder="e.g. TiE Coimbatore angel round" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8" }}>AMOUNT (₹)</label>
                <input type="number" style={inputSx} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8" }}>DATE</label>
                <input type="date" style={inputSx} value={form.disbursed_date} onChange={(e) => setForm((f) => ({ ...f, disbursed_date: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8" }}>UTILISATION %</label>
              <input type="number" min={0} max={100} style={inputSx} value={form.utilisation_pct} onChange={(e) => setForm((f) => ({ ...f, utilisation_pct: e.target.value }))} />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <div onClick={() => setModalOpen(false)} data-edc-row="" style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 9, border: "1px solid #E2E8F0", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
              <div data-edc-btn-primary="" onClick={submit} style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 9, background: "#1D4ED8", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                {create.isPending ? "Saving…" : "Save"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

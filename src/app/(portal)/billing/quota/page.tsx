"use client";

// Pixel-exact port of the `isQuota` sc-if block from
// "Billing Module - Web/Billing Admin.dc.html" (lines 1134-1152), plus the
// "Assign Students to Quota" (lines 1675-1720) and "Add Quota"
// (lines 1722-1768) modal bodies, which share the same student-picker UI.
//
// Real-data pass: quotas come from GET /quotas, "students in this quota"
// counts come from the real fee-payments dashboard (grouped per student),
// the same source the Students page uses — since Billing has no access to
// a full student-roster endpoint outside the fee-payments context. GAP:
// there is no real endpoint to bulk-assign students to a quota (only
// PATCH /students/:id, which is ADMIN-only) or to create a quota with
// students already attached in one call — the picker below is left in
// place (matches the design, lets you browse real students) but selecting
// students has no backend effect yet; only the quota name itself is saved.

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, cardSx } from "@/modules/billing/PageHeader";
import { BillingModal } from "@/modules/billing/BillingModal";
import {
  useQuotas,
  useCreateQuota,
  useUpdateQuota,
  useDeleteQuota,
  useFeePaymentsDashboard,
  groupDashboardByStudent,
  type BillingStudentRow,
  type QuotaRow,
} from "@/modules/billing/api/fees";

function StudentPicker({
  students,
  pickQuery,
  setPickQuery,
  pickDept,
  setPickDept,
  pickBatch,
  setPickBatch,
  departments,
  batches,
  selected,
  toggle,
  maxHeight,
  showHeading,
}: {
  students: BillingStudentRow[];
  pickQuery: string;
  setPickQuery: (v: string) => void;
  pickDept: string;
  setPickDept: (v: string) => void;
  pickBatch: string;
  setPickBatch: (v: string) => void;
  departments: string[];
  batches: string[];
  selected: Set<number>;
  toggle: (id: number) => void;
  maxHeight: number;
  showHeading?: boolean;
}) {
  const list = useMemo(() => {
    return students.filter((s) => {
      if (pickDept !== "All" && s.department !== pickDept) return false;
      if (pickBatch !== "All" && s.batch !== pickBatch) return false;
      if (pickQuery) {
        const q = pickQuery.toLowerCase();
        if (!s.student_name.toLowerCase().includes(q) && !s.register_number.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [students, pickQuery, pickDept, pickBatch]);

  return (
    <div>
      {showHeading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Select Students</div>
          <span style={{ fontSize: 12, color: "#64748b" }}>{selected.size} selected</span>
        </div>
      )}
      <input
        value={pickQuery}
        onChange={(e) => setPickQuery(e.target.value)}
        placeholder="Search by name or register no."
        style={{ width: "100%", padding: "10px 12px", border: "1px solid #dfe4ec", borderRadius: 9, fontSize: 13, marginBottom: 8 }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select
          value={pickDept}
          onChange={(e) => setPickDept(e.target.value)}
          style={{ flex: 1, minWidth: 0, padding: "9px 10px", border: "1px solid #dfe4ec", borderRadius: 9, fontSize: 12.5, background: "#fff" }}
        >
          <option value="All">Department: All</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={pickBatch}
          onChange={(e) => setPickBatch(e.target.value)}
          style={{ flex: "0 0 150px", padding: "9px 10px", border: "1px solid #dfe4ec", borderRadius: 9, fontSize: 12.5, background: "#fff" }}
        >
          <option value="All">Year: All</option>
          {batches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <div style={{ maxHeight, overflow: "auto", border: "1px solid #eef1f6", borderRadius: 10 }}>
        {list.map((p) => {
          const isSel = selected.has(p.student_id);
          return (
            <div
              key={p.student_id}
              data-bill-pick-row
              onClick={() => toggle(p.student_id)}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderBottom: "1px solid #f5f7fa", cursor: "pointer" }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  border: isSel ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
                  background: isSel ? "#1d4ed8" : "#fff",
                  color: "#fff",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 16px",
                }}
              >
                {isSel ? "✓" : ""}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.student_name}</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#94a3b8" }}>
                  {p.register_number} <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>· {p.department}</span>
                </div>
              </div>
              <span style={{ fontSize: 11.5, color: "#94a3b8", whiteSpace: "nowrap" }}>{p.quota}</span>
            </div>
          );
        })}
        {list.length === 0 && (
          <div style={{ padding: 22, textAlign: "center", fontSize: 12.5, color: "#94a3b8" }}>No students match that search.</div>
        )}
      </div>
    </div>
  );
}

export default function QuotaPage() {
  const { data: quotas } = useQuotas();
  const { data: dashboardRows } = useFeePaymentsDashboard();
  const createQuota = useCreateQuota();
  const updateQuota = useUpdateQuota();
  const deleteQuota = useDeleteQuota();

  const students = useMemo(() => (dashboardRows ? groupDashboardByStudent(dashboardRows) : []), [dashboardRows]);
  const departments = useMemo(() => Array.from(new Set(students.map((s) => s.department))).sort(), [students]);
  const batches = useMemo(() => Array.from(new Set(students.map((s) => s.batch))).sort(), [students]);

  const quotaRows = useMemo(
    () => (quotas ?? []).map((q) => ({ ...q, students: students.filter((s) => s.quota === q.name).length })),
    [quotas, students],
  );

  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [addQuotaOpen, setAddQuotaOpen] = useState(false);
  const [editQuota, setEditQuota] = useState<QuotaRow | null>(null);
  const [editQuotaName, setEditQuotaName] = useState("");
  const [quotaName, setQuotaName] = useState("");
  const [pickQuery, setPickQuery] = useState("");
  const [pickDept, setPickDept] = useState("All");
  const [pickBatch, setPickBatch] = useState("All");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetPicker() {
    setPickQuery("");
    setPickDept("All");
    setPickBatch("All");
    setSelected(new Set());
  }

  function closeAssign() {
    setAssignTarget(null);
    resetPicker();
  }
  function closeAddQuota() {
    setAddQuotaOpen(false);
    setQuotaName("");
    resetPicker();
  }

  return (
    <div>
      <PageHeader
        title="Quota"
        sub="Manage the quotas used for fee structures and students"
        actionLabel="Add Quota"
        onAction={() => setAddQuotaOpen(true)}
      />

      <div style={cardSx}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {quotaRows.map((q) => (
            <div
              key={q.id}
              data-bill-lift
              style={{ transition: "transform .16s ease,border-color .16s ease,box-shadow .16s ease", border: "1px solid #e6e9ef", borderRadius: 11, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}
            >
              <Link href={`/billing/students?quota=${encodeURIComponent(q.name)}`} title="View students in this quota" style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#eef3ff", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 38px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth={2}>
                    <path d="M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7z"></path>
                    <path d="M9 12l2 2 4-4"></path>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{q.name}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    ID {q.id} · {q.students} students
                  </div>
                </div>
              </Link>
              <button
                data-bill-quota-assign
                onClick={() => setAssignTarget(q.name)}
                title="Assign students to this quota"
                style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#0f172a", whiteSpace: "nowrap" }}
              >
                Assign
              </button>
              <button
                data-bill-icon
                onClick={() => {
                  setEditQuota(q);
                  setEditQuotaName(q.name);
                }}
                title="Edit quota name"
                style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 7, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
              </button>
              <button
                data-bill-quota-del
                onClick={() =>
                  deleteQuota.mutate(q.id, {
                    onSuccess: () => showToast(`Quota "${q.name}" removed`),
                    onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not remove this quota"),
                  })
                }
                title="Remove"
                style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", fontSize: 15 }}
              >
                ×
              </button>
            </div>
          ))}
          {quotaRows.length === 0 && (
            <div style={{ gridColumn: "1 / -1", padding: 22, textAlign: "center", fontSize: 12.5, color: "#94a3b8" }}>No quotas yet.</div>
          )}
        </div>
      </div>

      <BillingModal
        open={!!assignTarget}
        title="Assign Students to Quota"
        sub="Choose the students who belong to this quota"
        cta="Assign"
        onClose={closeAssign}
        onSubmit={() => {
          closeAssign();
          showToast("No backend endpoint yet to save a student's quota from here");
        }}
      >
        {assignTarget && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", border: "1px solid #e6e9ef", borderRadius: 10, padding: "13px 15px", marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Quota</span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{assignTarget}</span>
            </div>
            <StudentPicker
              students={students}
              pickQuery={pickQuery}
              setPickQuery={setPickQuery}
              pickDept={pickDept}
              setPickDept={setPickDept}
              pickBatch={pickBatch}
              setPickBatch={setPickBatch}
              departments={departments}
              batches={batches}
              selected={selected}
              toggle={toggle}
              maxHeight={240}
              showHeading
            />
          </div>
        )}
      </BillingModal>

      <BillingModal
        open={addQuotaOpen}
        title="Add Quota"
        sub="Create a new quota and optionally assign students"
        cta="Add Quota"
        onClose={closeAddQuota}
        onSubmit={() => {
          if (!quotaName.trim()) return;
          createQuota.mutate(quotaName.trim(), {
            onSuccess: () => {
              closeAddQuota();
              showToast("Quota added");
            },
            onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not add this quota"),
          });
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Quota Name</div>
          <input
            value={quotaName}
            onChange={(e) => setQuotaName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Differently Abled Quota"
            style={{ width: "100%", padding: "11px 12px", border: "1px solid #dfe4ec", borderRadius: 9, fontSize: 13.5 }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 0 6px" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Assign Students</div>
            <span style={{ fontSize: 12, color: "#64748b" }}>{selected.size} selected</span>
          </div>
          <StudentPicker
            students={students}
            pickQuery={pickQuery}
            setPickQuery={setPickQuery}
            pickDept={pickDept}
            setPickDept={setPickDept}
            pickBatch={pickBatch}
            setPickBatch={setPickBatch}
            departments={departments}
            batches={batches}
            selected={selected}
            toggle={toggle}
            maxHeight={200}
          />
        </div>
      </BillingModal>

      <BillingModal
        open={editQuota !== null}
        title="Edit Quota"
        sub="Rename this quota"
        cta="Save Changes"
        onClose={() => setEditQuota(null)}
        onSubmit={() => {
          if (!editQuota || !editQuotaName.trim()) return;
          updateQuota.mutate(
            { id: editQuota.id, name: editQuotaName.trim() },
            {
              onSuccess: () => {
                setEditQuota(null);
                showToast("Quota updated");
              },
              onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not update this quota"),
            },
          );
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Quota Name</div>
          <input
            value={editQuotaName}
            onChange={(e) => setEditQuotaName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Differently Abled Quota"
            style={{ width: "100%", padding: "11px 12px", border: "1px solid #dfe4ec", borderRadius: 9, fontSize: 13.5 }}
          />
        </div>
      </BillingModal>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: 9, fontSize: 13.5, fontWeight: 600, boxShadow: "0 10px 24px rgba(15,23,42,.25)", zIndex: 80 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

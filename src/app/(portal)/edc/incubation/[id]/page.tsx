"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useIncubation, useUpdateIncubation, useAddMilestone, useUpdateMilestone, useDeleteIncubation, type IncubationMilestone } from "@/modules/edc/api/incubations";
import { pillSx, barSx } from "@/modules/edc/genericPage";

// Real backend connection — GET/PATCH /me/incubations/:id + milestone
// endpoints. Structurally the same screen the design shipped (stat cards,
// programme progress bar, milestones table, record panel) but every value
// now comes from the live `incubations` row instead of INCUBATION_FILE.

const STATUSES = ["Active", "Graduated", "Exited"] as const;
const MILESTONE_STATUSES = ["Upcoming", "In Progress", "Completed"] as const;

function milestoneToneSx(status: string) {
  if (status === "Completed") return pillSx("blue");
  if (status === "In Progress") return pillSx("amber");
  return pillSx("slate");
}

const inputSx = { height: 38, padding: "0 11px", border: "1px solid #E2E8F0", borderRadius: 9, background: "#fff", fontFamily: "inherit", fontSize: 13.5, color: "#0F172A", outline: "none", width: "100%" } as const;

// Real, freely-settable progress per milestone — before this, the ONLY way
// to move a milestone was the status pill cycling through Upcoming → In
// Progress → Completed, which hard-set progress to 0%/unchanged/100%. An
// "In Progress" milestone had no way to actually grow past 0% short of
// jumping straight to Completed — this slider+number input lets the
// coordinator set any real value (e.g. 45%) as work actually progresses,
// and the due date is now editable inline too instead of only at creation.
function MilestoneRow({
  m,
  onUpdate,
  onCycleStatus,
}: {
  m: IncubationMilestone;
  onUpdate: (input: { progress_percent?: number; due_date?: string }) => void;
  onCycleStatus: () => void;
}) {
  const [pct, setPct] = useState(m.progress_percent);
  const [due, setDue] = useState(m.due_date ? m.due_date.slice(0, 10) : "");

  useEffect(() => setPct(m.progress_percent), [m.progress_percent]);
  useEffect(() => setDue(m.due_date ? m.due_date.slice(0, 10) : ""), [m.due_date]);

  return (
    <div data-edc-row="" style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr 1.3fr 0.9fr", gap: 16, alignItems: "center", padding: "14px 24px", borderBottom: "1px solid #EEF2F7" }}>
      <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.label}</span>
      <input
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        onBlur={() => due !== (m.due_date?.slice(0, 10) ?? "") && onUpdate({ due_date: due || undefined })}
        style={{ height: 32, padding: "0 8px", border: "1px solid #E2E8F0", borderRadius: 7, background: "#fff", fontFamily: "inherit", fontSize: 12, color: "#334155", outline: "none", width: "100%" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          onMouseUp={() => pct !== m.progress_percent && onUpdate({ progress_percent: pct })}
          onTouchEnd={() => pct !== m.progress_percent && onUpdate({ progress_percent: pct })}
          style={{ flex: 1, accentColor: "#1D4ED8" }}
        />
        <input
          type="number"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setPct(Math.min(100, Math.max(0, Number(e.target.value))))}
          onBlur={() => pct !== m.progress_percent && onUpdate({ progress_percent: pct })}
          style={{ width: 48, height: 26, padding: "0 6px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, textAlign: "right" }}
        />
        <span style={{ fontSize: 12, color: "#64748B" }}>%</span>
      </div>
      <span style={{ textAlign: "right" }}>
        <span onClick={onCycleStatus} style={{ ...milestoneToneSx(m.status), cursor: "pointer" }}>{m.status}</span>
      </span>
    </div>
  );
}

export default function EdcIncubationFilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const incubation = useIncubation(id);
  const update = useUpdateIncubation(id);
  const addMilestone = useAddMilestone(id);
  const updateMilestone = useUpdateMilestone(id);
  const remove = useDeleteIncubation();

  const [edit, setEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    status: "Active" as string,
    progress_percent: 0,
    seat: "",
    review_attendance_note: "",
    last_review_note: "",
    grant_note: "",
    services_note: "",
  });
  const [newMilestone, setNewMilestone] = useState("");

  useEffect(() => {
    if (!incubation.data) return;
    setForm({
      status: incubation.data.status,
      progress_percent: incubation.data.progress_percent,
      seat: incubation.data.seat ?? "",
      review_attendance_note: incubation.data.review_attendance_note ?? "",
      last_review_note: incubation.data.last_review_note ?? "",
      grant_note: incubation.data.grant_note ?? "",
      services_note: incubation.data.services_note ?? "",
    });
  }, [incubation.data]);

  if (incubation.isLoading) {
    return <div style={{ padding: 40, color: "#94A3B8", fontSize: 14 }}>Loading…</div>;
  }
  if (incubation.isError || !incubation.data) {
    return <div style={{ padding: 40, color: "#DC2626", fontWeight: 600, fontSize: 14 }}>{incubation.error instanceof Error ? incubation.error.message : "Incubation record not found."}</div>;
  }

  const row = incubation.data;

  function save() {
    update.mutate(
      {
        status: form.status as (typeof STATUSES)[number],
        progress_percent: form.progress_percent,
        seat: form.seat || undefined,
        review_attendance_note: form.review_attendance_note || undefined,
        last_review_note: form.last_review_note || undefined,
        grant_note: form.grant_note || undefined,
        services_note: form.services_note || undefined,
      },
      { onSuccess: () => setEdit(false) },
    );
  }

  function addMilestoneRow() {
    if (!newMilestone.trim()) return;
    addMilestone.mutate({ label: newMilestone.trim() }, { onSuccess: () => setNewMilestone("") });
  }

  function cycleMilestoneStatus(milestoneId: number, current: string) {
    const next = MILESTONE_STATUSES[(MILESTONE_STATUSES.indexOf(current as any) + 1) % MILESTONE_STATUSES.length];
    updateMilestone.mutate({ milestoneId, input: { status: next, progress_percent: next === "Completed" ? 100 : next === "Upcoming" ? 0 : undefined } });
  }

  function doDelete() {
    remove.mutate(id, { onSuccess: () => router.push("/edc/incubation") });
  }

  const stats = [
    { label: "Intake", value: row.intake_label ?? "—", note: row.incubated_since ? `Joined ${new Date(row.incubated_since).toLocaleDateString()}` : "Join date not recorded", highlight: false },
    { label: "Mentor", value: row.mentor_faculty_name?.split(" ").slice(-1)[0] ?? "—", note: row.mentor_faculty_name ?? "No mentor assigned", highlight: false },
    { label: "Category", value: row.business_category ?? "—", note: row.business_name ?? "", highlight: false },
    { label: "Grant support", value: row.grant_note?.split(" ")[0] ?? "—", note: row.grant_note?.split(" ").slice(1).join(" ") ?? "No grant recorded", highlight: true },
  ];

  const record = [
    { k: "Venture", v: row.business_name ?? "—" },
    { k: "Founder", v: row.student ? `${row.student.name} · ${row.student.department?.code ?? "—"}` : "—" },
    { k: "Intake", v: row.intake_label ?? "—" },
    { k: "Seat", v: row.seat ?? "—" },
    { k: "Incubated since", v: row.incubated_since ? new Date(row.incubated_since).toLocaleDateString() : "—" },
    { k: "Assigned mentor", v: row.mentor_faculty_name ?? "Not assigned" },
    { k: "Review attendance", v: row.review_attendance_note ?? "—" },
    { k: "Last review", v: row.last_review_note ?? "—" },
    { k: "Next review", v: row.next_review_date ? new Date(row.next_review_date).toLocaleDateString() : "—" },
    { k: "Grant support", v: row.grant_note ?? "—" },
    { k: "Services availed", v: row.services_note ?? "—" },
    { k: "Current status", v: row.status },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1360 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => router.push("/edc/incubation")} data-edc-back="" style={{ fontSize: 13, fontWeight: 600, color: "#64748B", cursor: "pointer", width: "fit-content" }}>
          ← All incubated ventures
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {!edit && (
            <div onClick={() => setConfirmDelete(true)} style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid #FECACA", color: "#DC2626", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Remove from incubation
            </div>
          )}
          <div
            data-edc-btn-primary=""
            onClick={() => (edit ? save() : setEdit(true))}
            style={{ padding: "9px 18px", borderRadius: 9, background: edit ? "#1D4ED8" : "#fff", color: edit ? "#fff" : "#334155", border: edit ? "none" : "1px solid #E2E8F0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {update.isPending ? "Saving…" : edit ? "Save changes" : "Edit review"}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setConfirmDelete(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 26, width: 420, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Remove {row.business_name} from incubation?</div>
            <p style={{ margin: 0, fontSize: 13.5, color: "#64748B" }}>This removes its bay/seat/mentor/review/milestones record. The venture itself is not deleted.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <div onClick={() => setConfirmDelete(false)} data-edc-row="" style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 9, border: "1px solid #E2E8F0", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
              <div onClick={doDelete} style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 9, background: "#DC2626", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                {remove.isPending ? "Removing…" : "Remove"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "26px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em" }}>{row.business_name ?? "—"}</h1>
          <p style={{ margin: "0 0 14px", fontSize: 16, color: "#64748B" }}>
            {row.intake_label ?? "Intake not recorded"} · founded by {row.student?.name ?? "—"} · {row.student?.department?.name ?? "—"}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <span style={pillSx(row.status === "Graduated" ? "blue" : row.status === "Exited" ? "slate" : "green")}>
              {row.status === "Graduated" ? "Graduated from centre" : row.status === "Exited" ? "Exited" : "Inside college"}
            </span>
            {edit ? (
              <input style={{ ...inputSx, width: 220 }} value={form.seat} onChange={(e) => setForm((f) => ({ ...f, seat: e.target.value }))} placeholder="Seat / bay" />
            ) : (
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", background: "#fff", border: "1px solid #E6EBF2", borderRadius: 99, padding: "6px 15px" }}>{row.seat ?? "Seat not assigned"}</span>
            )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
          {stats.map((c) => (
            <div key={c.label} data-edc-lift="" style={{ background: c.highlight ? "#EFF6FF" : "#fff", border: `1px solid ${c.highlight ? "#CFE0F7" : "#E6EBF2"}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>{c.value}</div>
              <div style={{ fontSize: 12.5, color: "#94A3B8" }}>{c.note}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
            <span style={{ fontWeight: 600, color: "#334155" }}>Programme progress</span>
            {edit ? (
              <input type="number" min={0} max={100} style={{ ...inputSx, width: 90, height: 28 }} value={form.progress_percent} onChange={(e) => setForm((f) => ({ ...f, progress_percent: Number(e.target.value) }))} />
            ) : (
              <span style={{ fontWeight: 700 }}>{row.progress_percent}% complete</span>
            )}
          </div>
          <div style={{ height: 8, borderRadius: 99, background: "#E9EEF6" }}>
            <div style={barSx(edit ? form.progress_percent : row.progress_percent)} />
          </div>
        </div>
        {edit && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>STATUS</label>
              <select style={inputSx} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>REVIEW ATTENDANCE</label>
              <input style={inputSx} value={form.review_attendance_note} onChange={(e) => setForm((f) => ({ ...f, review_attendance_note: e.target.value }))} placeholder="e.g. 9 of 12 monthly reviews attended" />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>LAST REVIEW NOTE</label>
              <input style={inputSx} value={form.last_review_note} onChange={(e) => setForm((f) => ({ ...f, last_review_note: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>GRANT SUPPORT</label>
              <input style={inputSx} value={form.grant_note} onChange={(e) => setForm((f) => ({ ...f, grant_note: e.target.value }))} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>SERVICES AVAILED</label>
              <input style={inputSx} value={form.services_note} onChange={(e) => setForm((f) => ({ ...f, services_note: e.target.value }))} />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", gap: 18 }}>
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>Programme milestones</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr 1.3fr 0.9fr", gap: 16, padding: "11px 24px", background: "#fff", borderBottom: "1px solid #EEF2F7", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#94A3B8" }}>
            <span>MILESTONE</span>
            <span>DUE</span>
            <span>PROGRESS (drag or type)</span>
            <span style={{ textAlign: "right" }}>STATUS (click to advance)</span>
          </div>
          {row.milestones.length === 0 && (
            <div style={{ padding: "28px 24px", textAlign: "center", color: "#94A3B8", fontSize: 13.5 }}>No milestones added yet.</div>
          )}
          {row.milestones.map((m) => (
            <MilestoneRow
              key={m.id}
              m={m}
              onCycleStatus={() => cycleMilestoneStatus(m.id, m.status)}
              onUpdate={(input) => updateMilestone.mutate({ milestoneId: m.id, input })}
            />
          ))}
          <div style={{ display: "flex", gap: 10, padding: "14px 24px" }}>
            <input style={inputSx} value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} placeholder="Add a milestone…" onKeyDown={(e) => e.key === "Enter" && addMilestoneRow()} />
            <span onClick={addMilestoneRow} style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8", background: "#EFF6FF", borderRadius: 9, padding: "0 16px", display: "flex", alignItems: "center", cursor: "pointer", whiteSpace: "nowrap" }}>Add</span>
          </div>
        </div>

        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>Incubation record</div>
          <div style={{ padding: "6px 24px 14px" }}>
            {record.map((r) => (
              <div key={r.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, padding: "13px 0", borderBottom: "1px solid #EEF2F7" }}>
                <span style={{ fontSize: 14, color: "#64748B", flex: "none" }}>{r.k}</span>
                <span style={{ fontSize: 14, fontWeight: 700, textAlign: "right" }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

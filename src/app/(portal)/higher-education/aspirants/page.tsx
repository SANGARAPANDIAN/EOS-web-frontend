"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Badge, Button, DataTable, Input, Select, SearchBar, Icon, type BadgeTone, type DataTableColumn } from "@/components/ui";
import {
  useAspirants,
  useCreateAspirant,
  useUpdateAspirant,
  useDeleteAspirant,
  type AspirantListItem,
  type AspirantStatus,
} from "@/modules/higher-education/api/aspirants";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/types/api";

const STATUS_LABEL: Record<AspirantStatus, string> = {
  interested: "Interested",
  applied: "Applied",
  admitted: "Admitted",
  enrolled: "Enrolled",
};

const STATUS_TONE: Record<AspirantStatus, BadgeTone> = {
  interested: "neutral",
  applied: "accent",
  admitted: "accentDark",
  enrolled: "accentDark",
};

const STATUS_OPTIONS: AspirantStatus[] = ["interested", "applied", "admitted", "enrolled"];

/** Matches the Transport dashboard/routes hover-lift convention. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

function AddAspirantModal({ onClose }: { onClose: () => void }) {
  const createAspirant = useCreateAspirant();
  const [registerNo, setRegisterNo] = useState("");
  const [programme, setProgramme] = useState("");
  const [university, setUniversity] = useState("");
  const [country, setCountry] = useState("");
  const [intake, setIntake] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [percentage, setPercentage] = useState("");
  const [testScores, setTestScores] = useState("");
  const [scholarshipName, setScholarshipName] = useState("");
  const [scholarshipValue, setScholarshipValue] = useState("");
  const [stage, setStage] = useState<AspirantStatus>("interested");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!registerNo.trim() || !programme.trim() || !country.trim()) {
      setError("Register number, programme and country are required.");
      return;
    }
    setError(null);
    try {
      await createAspirant.mutateAsync({
        register_no: registerNo.trim(),
        programme: programme.trim(),
        country: country.trim(),
        university: university.trim() || undefined,
        intake: intake.trim() || undefined,
        cgpa: cgpa ? Number(cgpa) : undefined,
        percentage: percentage ? Number(percentage) : undefined,
        test_scores_summary: testScores.trim() || undefined,
        scholarship_name: scholarshipName.trim() || undefined,
        scholarship_value: scholarshipValue ? Number(scholarshipValue) : undefined,
        stage,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this aspirant.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-14">
      <div className="w-full max-w-[640px] rounded-modal bg-surface">
        <div className="flex items-start justify-between gap-5 border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Add aspirant</div>
            <div className="mt-1 text-[13px] text-muted">Fields left blank stay unrecorded and can be filled later.</div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Register number</label>
            <Input className="mt-1.5" placeholder="e.g. REG22CS003" value={registerNo} onChange={(e) => setRegisterNo(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Programme applied for</label>
            <Input className="mt-1.5" value={programme} onChange={(e) => setProgramme(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">University</label>
            <Input className="mt-1.5" value={university} onChange={(e) => setUniversity(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Country</label>
            <Input className="mt-1.5" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Intake</label>
            <Input className="mt-1.5" placeholder="e.g. Fall 2027" value={intake} onChange={(e) => setIntake(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Stage</label>
            <Select className="mt-1.5" value={stage} onChange={(e) => setStage(e.target.value as AspirantStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">UG CGPA</label>
            <Input className="mt-1.5" type="number" step="0.01" value={cgpa} onChange={(e) => setCgpa(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Percentage equivalent</label>
            <Input className="mt-1.5" type="number" step="0.01" value={percentage} onChange={(e) => setPercentage(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Test scores</label>
            <Input className="mt-1.5" placeholder="e.g. GRE 322 · TOEFL 108" value={testScores} onChange={(e) => setTestScores(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Scholarship</label>
            <Input className="mt-1.5" value={scholarshipName} onChange={(e) => setScholarshipName(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Scholarship value (₹)</label>
            <Input className="mt-1.5" type="number" value={scholarshipValue} onChange={(e) => setScholarshipValue(e.target.value)} />
          </div>
          {error && <div className="col-span-2 text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={createAspirant.isPending}>
            Save aspirant
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function HigherEducationAspirantsPage() {
  const router = useRouter();
  const updateAspirant = useUpdateAspirant();
  const deleteAspirant = useDeleteAspirant();
  const [editRow, setEditRow] = useState<AspirantListItem | null>(null);
  const [editForm, setEditForm] = useState({ programme: "", university: "", country: "", intake: "", stage: "interested" as AspirantStatus });
  const [editError, setEditError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<AspirantListItem | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function openEdit(row: AspirantListItem) {
    setEditRow(row);
    // The list shows placeholder dashes for empty values; those must not be
    // written back as literal text.
    const clean = (v: string) => (v && v !== "\u2014" ? v : "");
    setEditForm({
      programme: clean(row.programme),
      university: clean(row.university),
      country: clean(row.country),
      intake: "",
      stage: row.status,
    });
    setEditError(null);
  }

  async function saveEdit() {
    if (!editRow) return;
    setEditError(null);
    try {
      await updateAspirant.mutateAsync({
        id: editRow.aspirant_id,
        programme: editForm.programme || undefined,
        university: editForm.university || undefined,
        country: editForm.country || undefined,
        intake: editForm.intake || undefined,
        stage: editForm.stage,
      });
      setEditRow(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Could not save this record.");
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setRowError(null);
    try {
      await deleteAspirant.mutateAsync(removing.aspirant_id);
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not delete this record.");
    } finally {
      setRemoving(null);
    }
  }

  const [search, setSearch] = useState("");
  const [batch, setBatch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");

  const aspirants = useAspirants({ search, batch, department, status });
  const data = aspirants.data;
  const [showAdd, setShowAdd] = useState(false);

  const columns: DataTableColumn<AspirantListItem>[] = [
    {
      key: "student",
      header: "Student",
      width: "1.4fr",
      render: (row) => (
        <div>
          <div className="font-bold text-ink">{row.student_name}</div>
          <div className="mt-0.5 font-mono text-[12px] text-primary">{row.student_id_no}</div>
        </div>
      ),
    },
    { key: "deptBatch", header: "Dept · Batch", width: "1fr", render: (row) => <span className="text-body">{row.dept_batch}</span> },
    { key: "programme", header: "Programme", width: "1.3fr", render: (row) => <span className="font-bold text-ink">{row.programme}</span> },
    { key: "university", header: "University", width: "1.3fr", render: (row) => <span className="text-body">{row.university}</span> },
    { key: "country", header: "Country", width: "0.8fr", render: (row) => <span className="text-body">{row.country}</span> },
    { key: "scholarship", header: "Scholarship", width: "1.1fr", render: (row) => <span className="text-body">{row.scholarship}</span> },
    {
      key: "status",
      header: "Status",
      width: "0.9fr",
      align: "right",
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>,
    },
    {
      key: "actions",
      header: "",
      width: "1.1fr",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="text-[12.5px] font-bold text-primary hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setRemoving(row); }}
            className="text-[12.5px] font-bold text-muted hover:text-danger-fg"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Aspirants</h1>
          <p className="mt-1 text-[13px] text-muted">
            Every student in the postgraduate pipeline · open a student for the full higher-education file.
          </p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowAdd(true)}>
          Add student
        </Button>
      </div>

      {showAdd && <AddAspirantModal onClose={() => setShowAdd(false)} />}

      {data && !data.extended && (
        <div className="rounded-[11px] border border-border-default bg-surface-tint px-4 py-3 text-[12.5px] text-muted">
          Aspirant tracking columns aren&apos;t set up yet on student_higher_education — status, scholarship and dates below show as blank.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Total higher education</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="school" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[36px] font-extrabold tracking-[-.02em] leading-none text-ink">
            {data?.summary.total ?? 0}
          </div>
          <div className="mt-2.5 text-[13px] text-body">
            {data?.summary.withinIndia ?? 0} within India · {data?.summary.abroad ?? 0} overseas
          </div>
          <div className="mt-1 text-[12.5px] text-subtle">{data?.summary.admittedCount ?? 0} already hold a confirmed admission</div>
        </div>

        <div className={`rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Studying abroad</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="flight" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[36px] font-extrabold tracking-[-.02em] leading-none text-ink">
            {data?.summary.abroad ?? 0}
          </div>
          <div className="mt-2.5 text-[13px] text-body">Across {data?.summary.countriesAbroad ?? 0} countries</div>
          <div className="mt-1 text-[12.5px] text-subtle">
            {data && data.summary.abroad > 0 ? "See the country column for destinations" : "No overseas aspirants yet"}
          </div>
        </div>

        <div className={`rounded-card border border-border-accent bg-accent-50 p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-primary-dark">Scholarship count</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-surface">
              <Icon name="savings" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[36px] font-extrabold tracking-[-.02em] leading-none text-primary">
            {data?.summary.scholarshipCount ?? 0}
          </div>
          <div className="mt-2.5 text-[13px] text-primary-dark">Students holding a scholarship or assistantship</div>
          <div className="mt-1 text-[12.5px] text-muted">
            {data && data.summary.scholarshipNames.length > 0 ? data.summary.scholarshipNames.join(", ") : "None recorded yet"}
          </div>
        </div>
      </div>

      <div className={`flex flex-nowrap items-center gap-3 overflow-x-auto rounded-card border border-border-default bg-surface p-[16px_18px] ${HOVERABLE}`}>
        <SearchBar
          className="min-w-[220px] max-w-none flex-1"
          placeholder="Search by name, register number, university, programme or country"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select className="w-auto shrink-0" value={batch} onChange={(e) => setBatch(e.target.value)}>
          <option value="">All batches</option>
          {data?.filters.batches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
        <Select className="w-auto shrink-0" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All departments</option>
          {data?.filters.departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select className="w-auto shrink-0" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All stages</option>
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
        <div className="shrink-0 whitespace-nowrap text-[13px] text-subtle">
          {data ? `Showing ${data.meta.filtered} of ${data.meta.total} higher-education records` : ""}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        rowKey={(row) => row.aspirant_id}
        emptyMessage={aspirants.isLoading ? "Loading…" : "No aspirants found — try widening your filters."}
        hoverableRows
        onRowClick={(row) => router.push(`/higher-education/aspirants/${row.aspirant_id}`)}
      />
      {rowError && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
          {rowError}
        </div>
      )}

      {editRow &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
            <div className="w-full max-w-[500px] rounded-modal bg-surface">
              <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
                <div>
                  <div className="text-[19px] font-extrabold text-ink">Edit aspiration</div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    {editRow.student_name} · {editRow.student_id_no}
                  </div>
                </div>
                <button type="button" onClick={() => setEditRow(null)} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-4 px-[26px] py-[22px]">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Programme</label>
                  <Input className="mt-1.5" value={editForm.programme} onChange={(e) => setEditForm((f) => ({ ...f, programme: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">University</label>
                    <Input className="mt-1.5" value={editForm.university} onChange={(e) => setEditForm((f) => ({ ...f, university: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Country</label>
                    <Input className="mt-1.5" value={editForm.country} onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Intake</label>
                    <Input className="mt-1.5" value={editForm.intake} onChange={(e) => setEditForm((f) => ({ ...f, intake: e.target.value }))} placeholder="e.g. Fall 2027" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Stage</label>
                    <Select className="mt-1.5" value={editForm.stage} onChange={(e) => setEditForm((f) => ({ ...f, stage: e.target.value as AspirantStatus }))}>
                      <option value="interested">Interested</option>
                      <option value="applied">Applied</option>
                      <option value="admitted">Admitted</option>
                      <option value="enrolled">Enrolled</option>
                    </Select>
                  </div>
                </div>
                {/* Register number is deliberately not editable: it identifies
                    which student this record belongs to. */}
                {editError && <div className="text-[13px] font-semibold text-danger-fg">{editError}</div>}
              </div>
              <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
                <Button variant="secondary" className="w-auto" onClick={() => setEditRow(null)}>
                  Cancel
                </Button>
                <Button variant="primarySmall" onClick={() => void saveEdit()} disabled={updateAspirant.isPending}>
                  {updateAspirant.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={removing != null}
        title="Delete this aspiration record?"
        description={removing ? `${removing.student_name}'s higher-education record will be removed. The student itself is untouched.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, Badge, Button, Input, Select, Textarea, EmptyState, SkeletonRows } from "@/components/ui";
import {
  useHodHrPayrollRequests,
  useCreateHodHrPayrollRequest,
  type HodHrPayrollRequestRow,
} from "@/modules/hod/api/employeeHrPayroll";
import { formatDisplayDate } from "@/lib/utils/date";

const CATEGORIES = [
  "Select a category",
  "PF / ESI query",
  "Increment / arrears",
  "Bank account change",
  "Income tax / Form 16",
  "Salary deduction query",
  "Other HR request",
];

function statusTone(status: string): "accent" | "neutral" {
  return status === "resolved" ? "accent" : "neutral";
}

function statusLabel(status: string): string {
  return status.replace("_", " ").toUpperCase();
}

export default function HodEmployeeHrPayrollPage() {
  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">HR Payroll</h1>
        <p className="mt-1 text-[13px] text-muted">Payroll &amp; HR queries</p>
      </div>

      <div className="grid grid-cols-[1.1fr_1.3fr] items-start gap-5">
        <RequestForm />
        <RequestStatusList />
      </div>
    </div>
  );
}

function RequestForm() {
  const create = useCreateHodHrPayrollRequest();

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (category === CATEGORIES[0] || !subject) return;
    await create.mutateAsync({ category, subject, description: description || undefined });
    setSubmitted(true);
    setCategory(CATEGORIES[0]);
    setSubject("");
    setDescription("");
  }

  return (
    <Card className="hod-hover-card">
      {submitted && (
        <div className="mb-4 rounded-[10px] bg-accent-50 px-4 py-3 text-[13px] font-bold text-primary">
          Request submitted.
        </div>
      )}
      <label className="mb-1.5 block text-[13px] font-bold text-ink">Request Category</label>
      <Select value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>

      <div className="mt-5">
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Subject</label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Revised PF contribution query" />
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Description</label>
        <Textarea
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your request in detail"
        />
      </div>

      <button
        type="button"
        disabled
        title="Attachment upload isn't wired up yet"
        className="mt-5 w-full rounded-[10px] border border-dashed border-border-default py-3 text-center text-[13.5px] font-bold text-primary opacity-60"
      >
        Attach a file (optional)
      </button>

      <Button
        variant="primary"
        className="mt-6"
        onClick={submit}
        disabled={category === CATEGORIES[0] || !subject || create.isPending}
      >
        {create.isPending ? "Submitting…" : "Submit Request"}
      </Button>
    </Card>
  );
}

function RequestStatusList() {
  const requests = useHodHrPayrollRequests();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Request Status</div>
      {requests.isLoading ? (
        <SkeletonRows count={3} />
      ) : !requests.data || requests.data.length === 0 ? (
        <Card>
          <EmptyState message="No HR/Payroll requests yet." />
        </Card>
      ) : (
        requests.data.map((r: HodHrPayrollRequestRow) => (
          <Card key={r.id} className="hod-hover-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">
                  HRM-{new Date(r.created_at).getFullYear()}-{String(r.id).padStart(3, "0")}
                </div>
                <div className="mt-1 text-[16px] font-extrabold text-ink">{r.subject}</div>
                <div className="mt-0.5 text-[12.5px] text-muted">{r.category}</div>
              </div>
              <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-divider pt-3.5">
              <div>
                <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">Submitted</div>
                <div className="mt-0.5 text-[13.5px] font-bold text-ink">{formatDisplayDate(r.created_at)}</div>
              </div>
              <div>
                <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">HR Assigned</div>
                <div className="mt-0.5 text-[13.5px] font-bold text-ink">{r.hr_assigned_name ?? "Unassigned"}</div>
              </div>
              <div>
                <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">Resolution</div>
                <div className="mt-0.5 text-[13.5px] font-bold text-ink">{r.resolution_note ?? "Awaiting"}</div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

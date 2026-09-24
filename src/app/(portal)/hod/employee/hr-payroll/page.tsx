"use client";

import { useRef, useState } from "react";
import { Card, Badge, Button, Input, Select, Textarea, EmptyState, SkeletonRows } from "@/components/ui";
import { useMyHrQueries, useCreateHrQuery, HR_QUERY_CATEGORIES, type HrQueryRow } from "@/modules/advisor/api/hr-queries";
import { formatDisplayDate } from "@/lib/utils/date";

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

/** Same /me/hr-queries multipart endpoint Faculty and Secretary's own HR
 * Payroll pages already use (src/app/(portal)/faculty/payroll/page.tsx) —
 * this used to call a separate, HoD-only proxy route that never actually
 * wired the file through, which is why "Attach a file" did nothing. */
function RequestForm() {
  const create = useCreateHrQuery();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit() {
    if (!category || !subject.trim()) return;
    setFormError(null);
    setSubmitted(false);
    try {
      await create.mutateAsync({
        category,
        subject: subject.trim(),
        description: description.trim() || undefined,
        file: file ?? undefined,
      });
      setSubmitted(true);
      setCategory("");
      setSubject("");
      setDescription("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not submit this request. Please try again.");
    }
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
        <option value="">Select a category</option>
        {HR_QUERY_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>

      <div className="mt-5">
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Subject</label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 200))} placeholder="e.g. Revised PF contribution query" />
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

      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-5 w-full truncate rounded-[10px] border border-dashed border-border-default px-3 py-3 text-center text-[13.5px] font-bold text-primary"
      >
        {file ? `📎 ${file.name}` : "Attach a file (optional)"}
      </button>

      {formError && <p className="mt-3 text-[12.5px] font-semibold text-danger-fg">{formError}</p>}

      <Button
        variant="primary"
        className="mt-6"
        onClick={submit}
        disabled={!category || !subject.trim()}
        loading={create.isPending}
      >
        Submit Request
      </Button>
    </Card>
  );
}

function RequestStatusList() {
  const requests = useMyHrQueries();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Request Status</div>
      {requests.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load HR/Payroll requests — please try again.
        </div>
      )}
      {requests.isLoading ? (
        <SkeletonRows count={3} />
      ) : requests.isError ? null : !requests.data || requests.data.length === 0 ? (
        <Card>
          <EmptyState message="No HR/Payroll requests yet." />
        </Card>
      ) : (
        requests.data.map((r: HrQueryRow) => (
          <Card key={r.id} className="hod-hover-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">{r.ticket_no}</div>
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
                <div className="mt-0.5 text-[13.5px] font-bold text-ink">{r.assigned_to_name ?? "Unassigned"}</div>
              </div>
              <div>
                <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">Resolution</div>
                <div className="mt-0.5 text-[13.5px] font-bold text-ink">{r.resolution_note ?? "Awaiting"}</div>
              </div>
            </div>
            {r.file_url && (
              <a
                href={r.file_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-[12.5px] font-bold text-primary hover:text-primary-dark"
              >
                View attachment →
              </a>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

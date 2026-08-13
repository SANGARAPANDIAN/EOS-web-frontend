"use client";

import { useState } from "react";
import { Card, Badge, Button, Input, Select, Textarea, EmptyState, SkeletonRows } from "@/components/ui";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useHodOdHistory, useApplyHodOd } from "@/modules/hod/api/employeeOd";
import { formatDisplayDate } from "@/lib/utils/date";

const OD_TYPES = ["Conference / Seminar", "FDP / Workshop", "University duty", "Other"];
const PERIOD_OPTIONS = ["All periods", "Forenoon periods", "Afternoon periods"];

function statusTone(status: string): "accent" | "danger" | "neutral" {
  if (status === "approved") return "accent";
  if (status === "rejected") return "danger";
  return "neutral";
}

export default function HodEmployeeOdPage() {
  const [tab, setTab] = useState<"apply" | "history">("apply");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Staff OD</h1>
          <p className="mt-1 text-[13px] text-muted">Apply for on-duty and track your applications</p>
        </div>
        <SegmentedTabs
          value={tab}
          onChange={(k) => setTab(k as "apply" | "history")}
          options={[
            { key: "apply", label: "Apply" },
            { key: "history", label: "History" },
          ]}
        />
      </div>

      {tab === "apply" ? <ApplyForm /> : <HistoryList />}
    </div>
  );
}

function ApplyForm() {
  const apply = useApplyHodOd();

  const [odType, setOdType] = useState(OD_TYPES[0]);
  const [periods, setPeriods] = useState(PERIOD_OPTIONS[0]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [venue, setVenue] = useState("");
  const [classAdjustment, setClassAdjustment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!fromDate || !toDate) return;
    await apply.mutateAsync({
      from_date: fromDate,
      to_date: toDate,
      purpose: purpose || undefined,
      organization_visited: venue || undefined,
      od_type: odType || undefined,
      periods_affected: periods || undefined,
      class_adjustment: classAdjustment || undefined,
    });
    setSubmitted(true);
    setFromDate("");
    setToDate("");
    setPurpose("");
    setVenue("");
    setClassAdjustment("");
  }

  return (
    <Card className="hod-hover-card">
      {submitted && (
        <div className="mb-4 rounded-[10px] bg-accent-50 px-4 py-3 text-[13px] font-bold text-primary">
          OD request submitted.
        </div>
      )}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">OD Type</label>
          <Select value={odType} onChange={(e) => setOdType(e.target.value)}>
            {OD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Periods Affected</label>
          <Select value={periods} onChange={(e) => setPeriods(e.target.value)}>
            {PERIOD_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">From Date</label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">To Date</label>
          <Input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Event / Purpose</label>
        <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. ICACCS 2026 paper presentation" />
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Venue / Organisation</label>
        <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. PSG College of Technology, Coimbatore" />
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Class Adjustment</label>
        <Textarea
          rows={3}
          value={classAdjustment}
          onChange={(e) => setClassAdjustment(e.target.value)}
          placeholder="Mention who will handle your classes"
        />
      </div>

      <button
        type="button"
        disabled
        title="Attachment upload isn't wired up yet — see query.md"
        className="mt-5 w-full rounded-[10px] border border-dashed border-border-default py-3 text-center text-[13.5px] font-bold text-primary opacity-60"
      >
        Attach invitation / brochure (optional)
      </button>

      <Button variant="primary" className="mt-6" onClick={submit} disabled={!fromDate || !toDate || apply.isPending}>
        {apply.isPending ? "Submitting…" : "Submit OD Request"}
      </Button>
    </Card>
  );
}

function HistoryList() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | undefined>(undefined);
  const history = useHodOdHistory(status);

  return (
    <div className="flex flex-col gap-4">
      <SegmentedTabs
        value={status ?? "all"}
        onChange={(k) => setStatus(k === "all" ? undefined : (k as "pending" | "approved" | "rejected"))}
        options={[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
        ]}
      />
      {history.isLoading ? (
        <SkeletonRows count={4} />
      ) : !history.data || history.data.length === 0 ? (
        <Card>
          <EmptyState message="No OD requests yet." />
        </Card>
      ) : (
        history.data.map((h) => (
          <Card key={h.id} className="hod-hover-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">
                  OD-{new Date(h.created_at).getFullYear()}-{String(h.id).padStart(3, "0")}
                </div>
                <div className="mt-1 text-[16px] font-extrabold text-ink">{h.purpose ?? "On-duty request"}</div>
                <div className="mt-0.5 text-[13px] text-body">
                  {h.from_date === h.to_date
                    ? formatDisplayDate(h.from_date)
                    : `${formatDisplayDate(h.from_date)} – ${formatDisplayDate(h.to_date)}`}
                </div>
                {h.organization_visited && <div className="mt-1 text-[12.5px] text-muted">{h.organization_visited}</div>}
                <div className="mt-2 text-[11.5px] text-subtle">Applied {formatDisplayDate(h.created_at)}</div>
              </div>
              <Badge tone={statusTone(h.overall_status)}>{h.overall_status.toUpperCase()}</Badge>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

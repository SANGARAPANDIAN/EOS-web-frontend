"use client";

import { useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Banner, EmptyState, Icon } from "@/components/ui";
import { useBonafideReasons, useMyBonafideRequests, useCreateBonafideRequest, type BonafideRequestRow, type BonafideStatus } from "@/modules/student/api/bonafide";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";
import { cn } from "@/lib/utils/cn";

type Tab = "apply" | "history";

const STATUS_LABEL: Record<BonafideStatus, string> = {
  pending: "Pending",
  faculty_approved: "Faculty approved",
  issued: "Issued",
  rejected: "Rejected",
};

// Purely decorative — bonafide_reasons has no icon/category column, so this
// is a keyword guess over the real reason_text for a nicer card, not a claim
// about any stored data.
const ICON_KEYWORDS: [RegExp, string][] = [
  [/bank|loan/i, "account_balance"],
  [/bus|transport|pass/i, "directions_bus"],
  [/scholarship/i, "school"],
  [/passport/i, "badge"],
  [/visa|travel/i, "flight"],
  [/insurance/i, "health_and_safety"],
  [/hostel/i, "apartment"],
  [/internship|placement|job/i, "work"],
];

function iconForReason(text: string): string {
  return ICON_KEYWORDS.find(([re]) => re.test(text))?.[1] ?? "description";
}

function ReasonCard({ reason, selected, onSelect }: { reason: { id: number; reason_text: string }; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 rounded-card border p-4 text-left transition-colors",
        selected ? "border-border-accent bg-accent-50" : "border-border-default bg-surface hover:border-border-accent hover:bg-nav-hover",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-primary" : "border-disabled",
        )}
      >
        {selected && <span className="size-[9px] rounded-full bg-primary" />}
      </span>
      <div className="flex-1">
        <Icon name={iconForReason(reason.reason_text)} size={19} className={selected ? "text-primary" : "text-subtle"} />
        <div className={cn("mt-1.5 text-[14px] font-bold", selected ? "text-primary-dark" : "text-ink")}>{reason.reason_text}</div>
      </div>
    </button>
  );
}

export default function BonafidePage() {
  const [tab, setTab] = useState<Tab>("apply");
  const reasons = useBonafideReasons();
  const requests = useMyBonafideRequests();
  const createRequest = useCreateBonafideRequest();

  const [reasonId, setReasonId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (reasonId === null) return;
    setError(null);
    try {
      await createRequest.mutateAsync(reasonId);
      setSuccess(true);
      setReasonId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Bonafide certificate</h1>
          <p className="mt-1 text-[13.5px] text-muted">Issued by the office within two working days</p>
        </div>
        <SegmentedTabs
          options={[
            { key: "apply", label: "Apply" },
            { key: "history", label: "History" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </div>

      {tab === "apply" ? (
        <Card className="p-[22px_24px]">
          <label className="text-[11.5px] font-bold text-muted">Purpose</label>
          {reasons.isLoading ? (
            <div className="mt-2">
              <EmptyState message="Loading…" />
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-4 gap-3">
              {reasons.data?.map((r) => (
                <ReasonCard
                  key={r.id}
                  reason={r}
                  selected={reasonId === r.id}
                  onSelect={() => {
                    setReasonId(r.id);
                    setSuccess(false);
                    setError(null);
                  }}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4">
              <Banner>Your bonafide certificate request has been submitted.</Banner>
            </div>
          )}

          <Button className="mt-4" disabled={reasonId === null || createRequest.isPending} onClick={handleSubmit}>
            {createRequest.isPending ? "Submitting…" : "Request certificate"}
          </Button>
        </Card>
      ) : requests.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <BonafideHistoryTable rows={requests.data?.data ?? []} />
      )}
    </div>
  );
}

function BonafideHistoryTable({ rows }: { rows: BonafideRequestRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState message="No bonafide requests yet." />
      </Card>
    );
  }

  const gridCols = "1fr 2fr 1.2fr 1fr";

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-2 bg-surface-muted px-5 py-3 text-[10.5px] font-extrabold tracking-[.09em] text-subtle" style={{ gridTemplateColumns: gridCols }}>
        <div>REQUEST ID</div>
        <div>PURPOSE</div>
        <div>APPLIED</div>
        <div className="text-right">STATUS</div>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="grid items-center gap-2 border-t border-divider px-5 py-3.5" style={{ gridTemplateColumns: gridCols }}>
          <div className="font-mono text-[12.5px] font-bold text-ink">BF-{r.id}</div>
          <div className="text-[13.5px] font-bold text-ink">{r.reason_text}</div>
          <div className="text-[13px] text-muted">{formatDisplayDate(r.requested_at)}</div>
          <div className="text-right">
            {r.status === "issued" && r.file_url ? (
              <a href={r.file_url} target="_blank" rel="noreferrer" className="text-[12.5px] font-bold text-primary">
                Download
              </a>
            ) : (
              <Badge tone={r.status === "rejected" ? "accentDark" : "accent"}>{STATUS_LABEL[r.status]}</Badge>
            )}
          </div>
        </div>
      ))}
    </Card>
  );
}

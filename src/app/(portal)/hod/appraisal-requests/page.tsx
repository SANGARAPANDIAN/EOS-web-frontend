"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Avatar, Badge, Button, PillTabs, Textarea, SkeletonTable } from "@/components/ui";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import {
  useHodAppraisalRequests,
  useDecideHodAppraisal,
  type HodAppraisalRow,
} from "@/modules/hod/api/appraisalRequests";
import { formatDisplayDate } from "@/lib/utils/date";

type Tab = "pending" | "sent_to_principal" | "sent_back" | "all";

export default function HodAppraisalRequestsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [sendBackTarget, setSendBackTarget] = useState<HodAppraisalRow | null>(null);
  const requests = useHodAppraisalRequests();
  const decide = useDecideHodAppraisal();

  const c = requests.data?.counts;
  const rows = (requests.data?.rows ?? []).filter((r) => tab === "all" || r.status === tab);

  const columns: DataTableColumn<HodAppraisalRow>[] = [
    {
      key: "faculty",
      header: "Faculty",
      width: "2fr",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.faculty_name} size={32} className="bg-icon-chip text-primary" />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-bold text-ink">{r.faculty_name}</div>
            <div className="truncate text-[11.5px] text-subtle">{r.designation}</div>
          </div>
        </div>
      ),
    },
    {
      key: "submitted",
      header: "Submitted",
      width: "1fr",
      render: (r) => (
        <div>
          <div className="text-[13.5px] font-bold text-ink">{formatDisplayDate(r.submitted_at)}</div>
          <div className="text-[11.5px] text-subtle">cycle {r.cycle_academic_year}</div>
        </div>
      ),
    },
    {
      key: "entries",
      header: "Entries",
      width: "80px",
      align: "right",
      render: (r) => <span className="text-[13.5px] font-bold text-ink">{r.entries_count}</span>,
    },
    {
      key: "self_score",
      header: "Self score",
      width: "110px",
      align: "right",
      render: (r) => <span className="text-[13.5px] font-bold text-ink">{r.self_score != null ? `${r.self_score} / 100` : "—"}</span>,
    },
    {
      key: "decision",
      header: "Decision",
      width: "2.2fr",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2.5">
          {r.status === "pending" && <Badge tone="accentDark">Pending review</Badge>}
          {r.status === "sent_to_principal" && <Badge tone="accent">Sent to Principal</Badge>}
          {r.status === "sent_back" && <Badge tone="danger">Sent back</Badge>}
          <Link href={`/hod/appraisal-requests/${r.id}`}>
            <Button variant="text">View</Button>
          </Link>
          {r.can_act && (
            <>
              <Button
                variant="secondary"
                onClick={() => setSendBackTarget(r)}
                disabled={decide.isPending}
              >
                Send back
              </Button>
              <Button
                variant="primarySmall"
                onClick={() => decide.mutate({ id: r.id, decision: "approved" })}
                disabled={decide.isPending}
              >
                To Principal
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Appraisal Requests</h1>
        <p className="mt-1 text-[13px] text-muted">
          Self-appraisals submitted by faculty of {requests.data?.department.name ?? "your department"}
          {rows[0] ? ` · cycle ${rows[0].cycle_academic_year}` : ""}
        </p>
      </div>

      <PillTabs
        value={tab}
        onChange={(k) => setTab(k as Tab)}
        options={[
          { key: "pending", label: `Pending (${c?.pending ?? 0})` },
          { key: "sent_to_principal", label: `Sent to Principal (${c?.sent_to_principal ?? 0})` },
          { key: "sent_back", label: `Sent back (${c?.sent_back ?? 0})` },
          { key: "all", label: `All (${c?.all ?? 0})` },
        ]}
      />

      {requests.isLoading ? (
        <SkeletonTable rows={5} />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          rowClassName="hod-hover-row"
          emptyMessage="No appraisal requests in this view."
        />
      )}

      {sendBackTarget && (
        <SendBackModal
          target={sendBackTarget}
          isPending={decide.isPending}
          onClose={() => setSendBackTarget(null)}
          onConfirm={(remarks) => {
            decide.mutate(
              { id: sendBackTarget.id, decision: "rejected", remarks: remarks || undefined },
              { onSuccess: () => setSendBackTarget(null) },
            );
          }}
        />
      )}
    </div>
  );
}

function SendBackModal({
  target,
  isPending,
  onClose,
  onConfirm,
}: {
  target: HodAppraisalRow;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1e3d]/45 p-4">
      <div className="w-full max-w-[520px] rounded-modal bg-surface p-7 shadow-modal">
        <h2 className="text-[20px] font-extrabold text-ink">Send back to {target.faculty_name}</h2>
        <p className="mt-1 text-[13px] text-muted">
          Let them know what needs to change before resubmitting.
        </p>
        <Textarea
          className="mt-4"
          rows={4}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Remarks (optional)"
        />
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={() => onConfirm(remarks)} disabled={isPending}>
            {isPending ? "Sending…" : "Send back"}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { friendlyError } from "@/lib/utils/errors";
import { Badge, Button, Card, EmptyState, PageHeader, QueueRow, SegmentedPillToggle, useToast, type BadgeTone } from "@/modules/admin/components/ui";
import { useBorrowRequests, useAcceptBorrowRequest, useRejectBorrowRequest, type BorrowRequest, type BorrowRequestStatus } from "@/modules/library/api/borrowRequests";
import { formatDate } from "@/modules/library/lib/borrow-record-format";
import { ReasonDialog } from "@/components/ui/ReasonDialog";

// Direct self-checkout was replaced with this request/accept workflow for
// every role that had one — a student's "Request" on the Catalog page and a
// faculty/HoD's "Request" on their own Library "Search" tab both hit the
// same POST /me/library/borrow-requests and only ever create a pending row
// here; the book is genuinely borrowed only once accepted below, which
// calls the exact same create() the Issue desk uses (so overdue block,
// duplicate borrow, per-student/faculty cap and the atomic copy decrement
// all still apply — accept can fail for a real reason).

function requesterLabel(r: BorrowRequest): string {
  if (r.borrower_type === "student" && r.student) return `${r.student.name} (${r.student.student_id_no})`;
  if (r.borrower_type === "faculty" && r.faculty) return `${r.faculty.name} · Faculty`;
  return "Unknown";
}

type Tab = "pending" | "reviewed";

const STATUS_TONE: Record<BorrowRequestStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  rejected: "neutral",
};

const STATUS_LABEL: Record<BorrowRequestStatus, string> = {
  pending: "Pending",
  approved: "Accepted",
  rejected: "Rejected",
};

export default function LibraryRequestsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rejecting, setRejecting] = useState<BorrowRequest | null>(null);
  const { show } = useToast();

  const requests = useBorrowRequests();
  const accept = useAcceptBorrowRequest();
  const reject = useRejectBorrowRequest();

  const rows = (requests.data ?? []).filter((r) => (tab === "pending" ? r.status === "pending" : r.status !== "pending"));
  const pendingCount = (requests.data ?? []).filter((r) => r.status === "pending").length;

  function handleAccept(r: BorrowRequest) {
    accept.mutate(r.id, {
      onSuccess: () => show(`"${r.book?.title ?? "Book"}" issued to ${r.student?.name ?? r.faculty?.name ?? "borrower"}.`, "success"),
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  function confirmReject(remarks: string) {
    if (!rejecting) return;
    const r = rejecting;
    reject.mutate(
      { id: r.id, remarks: remarks || undefined },
      {
        onSuccess: () => show(`Request for "${r.book?.title ?? "book"}" rejected.`, "success"),
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
    setRejecting(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Borrow requests" description="Students and staff request a book from their own library screen; accepting here issues it, exactly like the Issue desk." />

      <SegmentedPillToggle<Tab>
        options={[
          { value: "pending", label: `Pending (${pendingCount})` },
          { value: "reviewed", label: "Reviewed" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <Card hoverable={false} className="p-0">
        {rows.length === 0 && !requests.isLoading ? (
          <EmptyState
            icon="inventory_2"
            title={tab === "pending" ? "No pending requests" : "No reviewed requests yet"}
            description={tab === "pending" ? "New requests from students, faculty and HoDs will show up here." : undefined}
          />
        ) : (
          rows.map((r) => {
            const acceptingThis = accept.isPending && accept.variables === r.id;
            const rejectingThis = reject.isPending && reject.variables?.id === r.id;
            const anyPendingOnThisRow = acceptingThis || rejectingThis;
            return (
              <QueueRow
                key={r.id}
                icon="menu_book"
                tag={<Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>}
                title={r.book?.title ?? "—"}
                meta={`${requesterLabel(r)} · requested ${formatDate(r.requested_at)}`}
                actions={
                  r.status === "pending" ? (
                    <>
                      <Button size="sm" variant="secondary" disabled={anyPendingOnThisRow} onClick={() => setRejecting(r)}>
                        {rejectingThis ? "Rejecting…" : "Reject"}
                      </Button>
                      <Button size="sm" variant="primary" disabled={anyPendingOnThisRow} onClick={() => handleAccept(r)}>
                        {acceptingThis ? "Accepting…" : "Accept"}
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-admin-muted">{r.reviewed_at ? formatDate(r.reviewed_at) : ""}</span>
                  )
                }
              />
            );
          })
        )}
      </Card>

      <ReasonDialog
        open={!!rejecting}
        title={`Reject request for "${rejecting?.book?.title ?? "this book"}"?`}
        label="Reason for rejection"
        loading={reject.isPending}
        onConfirm={confirmReject}
        onCancel={() => setRejecting(null)}
      />
    </div>
  );
}

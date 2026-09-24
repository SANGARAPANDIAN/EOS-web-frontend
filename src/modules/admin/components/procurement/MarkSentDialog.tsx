"use client";

import { useState } from "react";
import { Button, DatePicker, Input, Modal, useToast } from "@/modules/admin/components/ui";
import { ApiError } from "@/types/api";
import { friendlyError } from "@/lib/utils/errors";
import { useMarkOrderSent, type ProposalKind, type ProposalView } from "@/modules/admin/api/procurement";

const todayIso = () => new Date().toISOString().slice(0, 10);

export function MarkSentDialog({
  open,
  onClose,
  proposal,
  orderId,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  proposal: ProposalView;
  orderId: number;
  kind: ProposalKind;
}) {
  const { show } = useToast();
  const markSent = useMarkOrderSent(kind);
  const [sentDate, setSentDate] = useState(todayIso());
  const [fileUrl, setFileUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (!sentDate) return setError("Choose the date it was sent.");
    setError(null);
    markSent.mutate(
      { orderId, sent_to_vendor_at: sentDate, file_url: fileUrl.trim() || undefined },
      {
        onSuccess: () => {
          show(`${proposal.order_number ?? proposal.reference} marked as sent to vendor.`, "success");
          onClose();
        },
        onError: (err: unknown) => setError(err instanceof ApiError ? err.message : friendlyError(err)),
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Mark sent to vendor" widthClassName="max-w-lg">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-admin-body">
          Order <strong>{proposal.order_number}</strong> for <strong>{proposal.vendor}</strong> — {proposal.title}
        </p>
        <div>
          <label className="mb-1 block text-[12.5px] font-semibold text-admin-body">Sent on *</label>
          <DatePicker value={sentDate} onChange={(e) => setSentDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-semibold text-admin-body">Document link</label>
          <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="Optional — link to the signed PO/SO document" />
        </div>
        {error && <p className="text-[11.5px] text-admin-danger">{error}</p>}
        <div className="flex justify-end gap-2.5 border-t border-admin-divider pt-4">
          <Button variant="secondary" onClick={onClose} disabled={markSent.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={markSent.isPending}>
            {markSent.isPending ? "Saving…" : "Mark as sent"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

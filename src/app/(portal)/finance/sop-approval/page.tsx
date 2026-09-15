"use client";

import { ApprovalQueue } from "@/modules/finance/ApprovalQueue";

// SOP = Service Order Proposal (service_order_proposals).
export default function SopApprovalPage() {
  return (
    <ApprovalQueue
      kind="sop"
      title="SOP Approval"
      sub="Service order proposals awaiting a Finance decision — approving commits money out of the fund"
      entityLabel="SOP"
    />
  );
}

"use client";

import { ApprovalQueue } from "@/modules/finance/ApprovalQueue";

// POP = Purchase Order Proposal. Real backend entity
// (purchase_order_proposals), reviewed here at the Finance stage.
export default function PopApprovalPage() {
  return (
    <ApprovalQueue
      kind="pop"
      title="POP Approval"
      sub="Purchase order proposals awaiting a Finance decision — approving commits money out of the fund"
      entityLabel="POP"
    />
  );
}

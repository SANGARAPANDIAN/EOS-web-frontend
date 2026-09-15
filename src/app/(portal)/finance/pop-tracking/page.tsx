"use client";

import { Suspense } from "react";
import { TrackingBoard } from "@/modules/finance/TrackingBoard";

// One destination for purchase orders. The Tracking / History switch inside the
// board changes the view (and the ?view= query), so History is not a separate
// sidebar row. Suspense is required because the board reads searchParams.
export default function PopTrackingPage() {
  return (
    <Suspense fallback={null}>
      <TrackingBoard
        kind="purchase"
        title="POP Tracking"
        sub="Follow every purchase order from dispatch to delivery, then allot it to a faculty member"
        entityLabel="purchase"
      />
    </Suspense>
  );
}

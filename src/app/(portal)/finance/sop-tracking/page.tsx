"use client";

import { Suspense } from "react";
import { TrackingBoard } from "@/modules/finance/TrackingBoard";

export default function SopTrackingPage() {
  return (
    <Suspense fallback={null}>
      <TrackingBoard
        kind="service"
        title="SOP Tracking"
        sub="Follow every service order through reported, fixed and committed, then allot it to a faculty member"
        entityLabel="service"
      />
    </Suspense>
  );
}

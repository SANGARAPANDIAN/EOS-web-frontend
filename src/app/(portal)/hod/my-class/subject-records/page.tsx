"use client";

import { useState } from "react";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { GradebookTab } from "@/modules/shared/marks/GradebookTab";
import { MarkEntryPanel } from "@/modules/shared/marks/MarkEntryPanel";

export default function HodSubjectRecordsPage() {
  const [tab, setTab] = useState<"gradebook" | "enter">("gradebook");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Subject Records</h1>
          <p className="mt-1 text-[13px] text-muted">
            {tab === "gradebook" ? "Marks for the subjects you handle personally" : "Enter marks · Save keeps a draft, Publish makes it visible"}
          </p>
        </div>
        <SegmentedTabs
          value={tab}
          onChange={(k) => setTab(k as "gradebook" | "enter")}
          options={[
            { key: "gradebook", label: "Gradebook" },
            { key: "enter", label: "Enter marks" },
          ]}
        />
      </div>

      {tab === "gradebook" ? <GradebookTab /> : <MarkEntryPanel />}
    </div>
  );
}

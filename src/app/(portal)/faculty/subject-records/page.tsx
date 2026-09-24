"use client";

import { useState } from "react";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { GradebookTab } from "@/modules/shared/marks/GradebookTab";
import { MarkEntryPanel } from "@/modules/shared/marks/MarkEntryPanel";

// Two tabs: "Enter marks" (every faculty who teaches a subject enters marks
// for it here, scoped by the real backend to their own
// faculty_subject_class_mapping via GET /me/subject-records — never other
// faculty's subjects; "Save" enters/updates marks via POST
// /me/exams/:id/marks and PATCH /me/exam-marks/:id, "Publish" calls POST
// /me/subject-records/:id/publish, the exact moment those marks become
// visible elsewhere) and "Gradebook" (a read-only per-student × per-exam
// grid, previously HoD-only — see GradebookTab's own doc comment for why
// it's now shared here too).
//
// MarkEntryPanel and GradebookTab (src/modules/shared/marks/) are the
// exact same components HoD's own Subject Records page uses.

export default function AdvisorSubjectRecordsPage() {
  const [tab, setTab] = useState<"gradebook" | "enter">("enter");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[28px] font-extrabold tracking-[-0.03em] text-ink">Subject Records</div>
          <div className="mt-1.5 text-sm font-medium text-muted">
            {tab === "enter" ? "Enter marks for every subject you teach · Save keeps a draft, Publish makes it visible" : "Marks for the subjects you teach"}
          </div>
        </div>
        <SegmentedTabs
          value={tab}
          onChange={(k) => setTab(k as "gradebook" | "enter")}
          options={[
            { key: "enter", label: "Enter marks" },
            { key: "gradebook", label: "Gradebook" },
          ]}
        />
      </div>
      {tab === "enter" ? <MarkEntryPanel /> : <GradebookTab />}
    </div>
  );
}

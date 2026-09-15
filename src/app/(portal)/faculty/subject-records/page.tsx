"use client";

import { MarkEntryPanel } from "@/modules/shared/marks/MarkEntryPanel";

// Subject Records = the ENTRY page. Every faculty who teaches a subject
// enters marks for it here, for every class they teach that subject in —
// scoped by the real backend to subjects on their own faculty_subject_class_mapping
// (GET /me/subject-records), never other faculty's subjects. Two real
// actions: "Save" enters/updates marks via POST /me/exams/:id/marks and
// PATCH /me/exam-marks/:id (marks now exist, is_published stays false);
// "Publish" calls POST /me/subject-records/:id/publish, which is the exact
// moment those marks become visible elsewhere (Examination & Results, the
// student's own results, etc.) — this screen only ever publishes what was
// actually saved, never a synthetic action.
// Per instruction, all per-student marks entry now lives HERE, not on
// Examination & Results (that screen is now pure view-only).
//
// MarkEntryPanel (src/modules/shared/marks/) is the exact same component
// HoD's own Subject Records "Enter marks" tab uses — this page used to be a
// byte-for-byte duplicate differing only in inline-style vs Tailwind
// markup.

export default function AdvisorSubjectRecordsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-[28px] font-extrabold tracking-[-0.03em] text-ink">Subject Records</div>
        <div className="mt-1.5 text-sm font-medium text-muted">
          Enter marks for every subject you teach · Save keeps a draft, Publish makes it visible
        </div>
      </div>
      <MarkEntryPanel />
    </div>
  );
}

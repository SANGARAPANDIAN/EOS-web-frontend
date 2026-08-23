"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCourseProgress } from "@/modules/academic-coordinator/hooks/useCourseProgressQueries";
import { useAcademicYear } from "@/modules/academic-coordinator/context/AcademicYearContext";

export default function CoordinatorCourseProgressPage() {
  const progress = useCourseProgress();
  const { batchId } = useAcademicYear();
  const [search, setSearch] = useState("");

  const inBatch = useMemo(() => (progress.data ?? []).filter((p) => p.batchId === batchId), [progress.data, batchId]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = inBatch.filter(
      (p) => !q || p.subjectCode.toLowerCase().includes(q) || p.subjectName.toLowerCase().includes(q) || p.facultyName.toLowerCase().includes(q),
    );
    return [...filtered].sort((a, b) => (b.percentComplete ?? -1) - (a.percentComplete ?? -1));
  }, [inBatch, search]);

  const withData = inBatch.filter((p) => p.totalSessions > 0).length;

  return (
    <div className="flex flex-col gap-4.5">
      <div>
        <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Course Progress</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Lesson plans and syllabus completion. {withData} of {inBatch.length} lesson plans have session-level records so far.
        </p>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by subject or faculty"
        className="max-w-90"
      />

      {progress.isLoading ? (
        <EmptyState loading />
      ) : rows.length === 0 ? (
        <Card className="py-10 text-center">
          <EmptyState message="No lesson plans match this search." />
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
          {rows.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-bold text-ink">
                    {p.subjectCode} · {p.subjectName}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {p.facultyName} · {p.classLabel} · Sem {p.semester}
                  </div>
                </div>
                <div className="shrink-0 text-[20px] font-bold text-primary">{p.percentComplete != null ? `${p.percentComplete}%` : "—"}</div>
              </div>

              <ProgressBar percent={p.percentComplete ?? 0} height={6} className="mt-3" />

              <div className="mt-3">
                {p.totalSessions === 0 ? (
                  <p className="m-0 text-[12px] text-subtle">No sessions recorded yet.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {p.sessions.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-[12px]">
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: s.isCovered ? "#16a34a" : "#cbd5e1" }} />
                        <span className="flex-1 truncate text-body">
                          {s.unitTitle ? `${s.unitTitle} — ` : ""}
                          {s.topic}
                        </span>
                        <span className="shrink-0" style={{ color: s.isCovered ? "#166534" : "#94a3b8" }}>
                          {s.isCovered ? "Completed" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

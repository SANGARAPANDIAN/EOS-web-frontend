"use client";

import { useState } from "react";
import { useDepartments } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useDepartmentAudit } from "@/modules/academic-coordinator/hooks/useAuditQueries";
import { useAcademicYear } from "@/modules/academic-coordinator/context/AcademicYearContext";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AuditStatus } from "@/modules/academic-coordinator/types";

const STATUS_STYLE: Record<AuditStatus, { bg: string; border: string; badgeBg: string; fg: string; glyph: string }> = {
  Completed: { bg: "#f0fdf4", border: "#bbf7d0", badgeBg: "#dcfce7", fg: "#166534", glyph: "✓" },
  Pending: { bg: "#fefce8", border: "#fef08a", badgeBg: "#fef08a", fg: "#854d0e", glyph: "!" },
  Overdue: { bg: "#fef2f2", border: "#fecaca", badgeBg: "#fecaca", fg: "#991b1b", glyph: "!" },
  "Not started": { bg: "#f8fafc", border: "#eef2f8", badgeBg: "#f1f5f9", fg: "#64748b", glyph: "○" },
};

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function CoordinatorAcademicAuditPage() {
  const departments = useDepartments();
  const { batchId, selectedBatch } = useAcademicYear();
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [semester, setSemester] = useState(5);

  const effectiveDeptId = departmentId ?? departments.data?.[0]?.id ?? null;
  const dept = departments.data?.find((d) => d.id === effectiveDeptId) ?? null;
  const audit = useDepartmentAudit(effectiveDeptId, semester, batchId);

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Academic Audit</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            Completion of the academic process by department, for the{" "}
            {selectedBatch ? `${selectedBatch.start_year}-${selectedBatch.end_year}` : "selected"} batch — computed live.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Select value={effectiveDeptId ?? ""} onChange={(e) => setDepartmentId(Number(e.target.value))} className="min-w-35">
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select value={semester} onChange={(e) => setSemester(Number(e.target.value))} className="min-w-35">
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[16px] font-bold text-ink">{dept?.code ?? "—"} academic audit</div>
            <div className="mt-0.5 text-[12.5px] text-muted">Semester {semester}</div>
          </div>
          <div className="text-right">
            <div className="text-[28px] font-bold text-primary">{audit.data ? `${audit.data.percentComplete}%` : "—"}</div>
            <div className="text-[11px] text-subtle">overall completion</div>
          </div>
        </div>
        <ProgressBar percent={audit.data?.percentComplete ?? 0} height={8} className="mt-3.5" />
      </Card>

      <Card>
        <h2 className="m-0 text-[15px] font-bold text-ink">Milestones</h2>
        {audit.isLoading ? (
          <EmptyState loading />
        ) : (audit.data?.milestones ?? []).length === 0 ? (
          <EmptyState message="No milestones defined for this department yet." />
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {(audit.data?.milestones ?? []).map((m) => {
              const s = STATUS_STYLE[m.status];
              return (
                <div
                  key={m.label}
                  className="flex items-center gap-3 rounded-[10px] px-4 py-3"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}
                >
                  <span
                    className="flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: s.badgeBg, color: s.fg }}
                  >
                    {s.glyph}
                  </span>
                  <span className="flex-1 text-[13px] font-semibold text-ink">{m.label}</span>
                  <span className="text-[12.5px] font-semibold" style={{ color: s.fg }}>
                    {m.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

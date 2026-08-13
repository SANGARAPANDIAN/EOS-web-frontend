"use client";

import { Card, Badge, ProgressBar, SkeletonCardGrid } from "@/components/ui";
import { useHodCurrentSemester, type HodCurrentSemesterSubject } from "@/modules/hod/api/myClassCurrentSemester";

function SubjectCard({ s }: { s: HodCurrentSemesterSubject }) {
  return (
    <Card className="hod-hover-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-accent-50 text-[13px] font-extrabold text-primary">
            {s.initials}
          </div>
          <div>
            <div className="text-[16px] font-extrabold leading-[1.2] text-ink">{s.subject_name}</div>
            <div className="mt-0.5 text-[12.5px] text-subtle">
              {s.subject_code} · {s.section}
            </div>
          </div>
        </div>
        <Badge tone="accent" className="shrink-0 whitespace-nowrap">
          {s.hours_per_week} hrs / week
        </Badge>
      </div>

      <ProgressBar percent={s.percent_covered ?? 0} className="mt-4" />

      <div className="mt-3 flex items-center justify-between text-[12.5px] text-muted">
        <span>
          {s.materials_count} material{s.materials_count === 1 ? "" : "s"} · {s.tasks_count} task
          {s.tasks_count === 1 ? "" : "s"}
        </span>
        <span className="font-extrabold text-primary">
          {s.percent_covered != null ? `${s.percent_covered}% covered` : "Not started"}
        </span>
      </div>
    </Card>
  );
}

export default function HodCurrentSemesterPage() {
  const overview = useHodCurrentSemester();
  const o = overview.data;
  const subjects = o?.subjects ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Current Semester</h1>
        <p className="mt-1 text-[13px] text-muted">
          {o ? `${o.academic_year.replace("-", "–")} · ` : ""}
          Subjects you handle personally
        </p>
      </div>

      {overview.isLoading ? (
        <SkeletonCardGrid count={3} columns={3} />
      ) : subjects.length === 0 ? (
        <Card>
          <div className="text-[13px] text-subtle">You are not mapped to teach any class/subject yet.</div>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {subjects.map((s) => (
            <SubjectCard key={`${s.class_id}-${s.subject_id}`} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}

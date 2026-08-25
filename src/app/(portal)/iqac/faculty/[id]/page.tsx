"use client";

import { useParams, useRouter } from "next/navigation";
import { Badge, EmptyState, type BadgeTone } from "@/components/ui";
import { useFacultyList, type FacultyRow } from "@/modules/iqac/api/faculty";

const STATUS_TONE: Record<FacultyRow["status"], BadgeTone> = { active: "accent", inactive: "neutral" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">{label}</div>
      <div className="mt-1 text-[15px] font-bold text-ink">{value}</div>
    </div>
  );
}

export default function FacultyProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const list = useFacultyList({ status: "all" });

  const faculty = list.data?.faculty.find((f) => String(f.id) === params.id);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button type="button" onClick={() => router.push("/iqac/faculty")} className="w-fit text-[13px] font-bold text-primary hover:underline">
        ← Back to faculty register
      </button>

      {list.isLoading && (
        <div className="rounded-card border border-border-default bg-surface p-5">
          <EmptyState loading />
        </div>
      )}

      {!list.isLoading && !faculty && (
        <div className="rounded-card border border-border-default bg-surface p-5">
          <EmptyState message="Faculty member not found." />
        </div>
      )}

      {faculty && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">{faculty.name}</h1>
              <p className="mt-1 text-[13.5px] text-muted">
                {faculty.designation} · {faculty.department?.name ?? "No department on file"}
              </p>
            </div>
            <Badge tone={STATUS_TONE[faculty.status]}>{faculty.status === "active" ? "Active" : "Inactive"}</Badge>
          </div>

          <div className="grid grid-cols-4 gap-5 rounded-card border border-border-default bg-surface p-6">
            <Field label="Staff ID" value={faculty.staff_code ?? "—"} />
            <Field label="Qualification" value={faculty.qualification ?? "—"} />
            <Field label="Doctorate" value={faculty.has_doctorate ? "Yes" : "No"} />
            <Field label="Experience" value={faculty.experience_years != null ? `${faculty.experience_years} years` : "—"} />
            <Field label="Department" value={faculty.department?.code ?? "—"} />
            <Field label="Classes this year" value={faculty.classes_count} />
            <Field label="Attendance" value={faculty.attendance_percentage != null ? `${faculty.attendance_percentage}%` : "Not tracked"} />
            <Field label="Publications" value={faculty.publications_count} />
            <Field label="Email" value={faculty.email} />
            <Field label="Phone" value={faculty.phone ?? "—"} />
          </div>

          <p className="text-[12px] text-subtle">FDP/STTP attendance isn&apos;t shown — no real table tracks it yet.</p>
        </>
      )}
    </div>
  );
}

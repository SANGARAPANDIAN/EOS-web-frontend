"use client";

import { useState } from "react";
import { Card, StatCard, PillTabs, SearchBar, Button, Badge, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import {
  useConvocationRegistrations,
  useConvocationStats,
  useRegisterForConvocation,
  useAwardDegree,
  type ConvocationRegistration,
  type ConvocationStatus,
} from "@/modules/coe/api/convocation";

const TABS: { key: "all" | ConvocationStatus; label: string }[] = [
  { key: "all", label: "All students" },
  { key: "eligible", label: "Eligible" },
  { key: "shortfall", label: "Shortfall" },
  { key: "registered", label: "Registered" },
  { key: "degree_awarded", label: "Degree awarded" },
];

const STATUS_TONE: Record<ConvocationStatus, BadgeTone> = {
  eligible: "accentDark",
  shortfall: "danger",
  registered: "accent",
  degree_awarded: "neutral",
};

function studentName(r: ConvocationRegistration) {
  const s = r.students;
  return s.soa_applications ? [s.soa_applications.first_name, s.soa_applications.last_name].filter(Boolean).join(" ") : s.register_no ?? s.student_id_no;
}

export default function CoeConvocationDegreePage() {
  const [status, setStatus] = useState<"all" | ConvocationStatus>("all");
  const [search, setSearch] = useState("");

  const stats = useConvocationStats();
  const rows = useConvocationRegistrations({ status: status === "all" ? null : status, search });
  const register = useRegisterForConvocation();
  const awardDegree = useAwardDegree();

  const data = rows.data ?? [];

  function handleExport() {
    downloadCsv(
      "convocation-registrations",
      [
        { header: "Student", value: (r: ConvocationRegistration) => studentName(r) },
        { header: "Register no", value: (r: ConvocationRegistration) => r.students.register_no ?? r.students.student_id_no },
        { header: "CGPA", value: (r: ConvocationRegistration) => r.cgpa ?? "" },
        { header: "Arrears", value: (r: ConvocationRegistration) => r.arrears_count },
        { header: "Classification", value: (r: ConvocationRegistration) => r.classification ?? "" },
        { header: "Status", value: (r: ConvocationRegistration) => r.status },
        { header: "Registered at", value: (r: ConvocationRegistration) => r.registered_at?.slice(0, 10) ?? "" },
      ],
      data,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Convocation & Degree"
        subtitle="CGPA, arrears and classification-based convocation eligibility, registration and degree award."
        actions={
          <Button variant="secondary" className="w-auto" onClick={handleExport}>
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Eligible" value={stats.data?.eligible ?? (stats.isLoading ? "…" : 0)} icon="verified" />
        <StatCard label="Shortfall" value={stats.data?.shortfall ?? (stats.isLoading ? "…" : 0)} icon="trending_down" />
        <StatCard label="Registered" value={stats.data?.registered ?? (stats.isLoading ? "…" : 0)} icon="how_to_reg" />
        <StatCard label="Degree awarded" value={stats.data?.degree_awarded ?? (stats.isLoading ? "…" : 0)} icon="school" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs options={TABS} value={status} onChange={(k) => setStatus(k as typeof status)} />
          <SearchBar placeholder="Search by register number…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[260px]" />
        </div>
      </Card>

      {rows.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Students</span>
            <span className="text-[12.5px] text-muted">{data.length} records</span>
          </div>
          {data.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No students match the current filters.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Student</div>
                <div className="w-[90px]">CGPA</div>
                <div className="w-[90px]">Arrears</div>
                <div className="w-[210px]">Classification</div>
                <div className="w-[140px]">Status</div>
                <div className="w-[150px] text-right">Actions</div>
              </div>
              {data.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="flex-1">
                    <div className="text-[13.5px] font-bold text-ink">{studentName(r)}</div>
                    <div className="text-[11.5px] text-muted">{r.students.register_no ?? r.students.student_id_no}</div>
                  </div>
                  <div className="w-[90px] text-[13px] font-bold text-ink">{r.cgpa != null ? r.cgpa.toFixed(2) : "—"}</div>
                  <div className="w-[90px] text-[12.5px] text-ink">{r.arrears_count} arrears</div>
                  <div className="w-[210px] text-[12.5px] text-ink">{r.classification ?? "—"}</div>
                  <div className="w-[140px]">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status.replace(/_/g, " ").toUpperCase()}</Badge>
                  </div>
                  <div className="w-[150px] text-right">
                    {r.status === "eligible" && (
                      <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" disabled={register.isPending} onClick={() => register.mutate(r.id)}>
                        Register
                      </Button>
                    )}
                    {r.status === "registered" && (
                      <Button variant="primarySmall" className="w-auto px-3 py-1.5 text-[12px]" disabled={awardDegree.isPending} onClick={() => awardDegree.mutate(r.id)}>
                        Award degree
                      </Button>
                    )}
                    {(r.status === "shortfall" || r.status === "degree_awarded") && <span className="text-[12px] text-subtle">—</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

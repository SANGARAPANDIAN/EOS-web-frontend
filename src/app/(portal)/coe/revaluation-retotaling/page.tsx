"use client";

import { useMemo, useState } from "react";
import { Card, StatCard, PillTabs, SearchBar, Badge, Button, Input } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useRevaluationRequests, useUpdateRevaluationRequest, type RevaluationRequest, type RevaluationStatus } from "@/modules/coe/api/revaluation";
import { usePhotocopyRequests, useUpdatePhotocopyRequest, type PhotocopyRequest } from "@/modules/coe/api/photocopyRequests";

type ApplicationType = "revaluation" | "retotaling" | "photocopy";

const TYPE_TABS: { key: "all" | ApplicationType; label: string }[] = [
  { key: "all", label: "All applications" },
  { key: "revaluation", label: "Revaluation" },
  { key: "retotaling", label: "Retotaling" },
  { key: "photocopy", label: "Photocopy" },
];

function studentName(s: { soa_applications: { first_name: string; last_name: string | null } | null }): string | null {
  if (!s.soa_applications) return null;
  return [s.soa_applications.first_name, s.soa_applications.last_name].filter(Boolean).join(" ");
}

export default function CoeRevaluationRetotalingPage() {
  const revaluation = useRevaluationRequests();
  const photocopy = usePhotocopyRequests();
  const [type, setType] = useState<"all" | ApplicationType>("all");
  const [search, setSearch] = useState("");

  const revRows = revaluation.data ?? [];
  const pcRows = photocopy.data?.data ?? [];

  const filteredRev = revRows.filter(
    (r) =>
      (type === "all" || type === r.request_kind) &&
      (!search.trim() ||
        (r.students.register_no ?? r.students.student_id_no).toLowerCase().includes(search.toLowerCase()) ||
        (studentName(r.students) ?? "").toLowerCase().includes(search.toLowerCase())),
  );
  const filteredPc = pcRows.filter(
    (p) =>
      (type === "all" || type === "photocopy") &&
      (!search.trim() ||
        (p.students.register_no ?? p.students.student_id_no).toLowerCase().includes(search.toLowerCase()) ||
        (studentName(p.students) ?? "").toLowerCase().includes(search.toLowerCase())),
  );

  const allCount = revRows.length + pcRows.length;
  const feeCollected = revRows.filter((r) => r.fee_paid).length + pcRows.filter((p) => p.status !== "requested").length;
  const marksChanged = revRows.filter((r) => r.status === "approved" && r.revised_marks != null).length;
  const completed = revRows.filter((r) => r.status === "approved" || r.status === "rejected").length + pcRows.filter((p) => p.status === "issued" || p.status === "rejected").length;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Revaluation & Retotaling" subtitle="Student applications, fee tracking, re-valuation allocation and revised result updates." />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Applications" value={allCount} icon="autorenew" />
        <StatCard label="Fee collected" value={feeCollected} icon="payments" sub={`of ${allCount} applications`} />
        <StatCard label="Marks changed" value={marksChanged} icon="difference" />
        <StatCard label="Completed" value={completed} icon="task_alt" sub={`of ${allCount} applications`} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs options={TYPE_TABS} value={type} onChange={(k) => setType(k as typeof type)} />
          <SearchBar placeholder="Search roll/application…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[260px]" />
        </div>
      </Card>

      {revaluation.isLoading || photocopy.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Applications</span>
            <span className="text-[12.5px] text-muted">{filteredRev.length + filteredPc.length} records</span>
          </div>
          {filteredRev.length === 0 && filteredPc.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No applications match the current filters.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Student</div>
                <div className="w-[220px]">Course</div>
                <div className="w-[100px]">Type</div>
                <div className="w-[90px]">Fee</div>
                <div className="w-[130px]">Outcome</div>
                <div className="w-[110px]">Status</div>
                <div className="w-[220px] text-right">Actions</div>
              </div>
              {filteredRev.map((r) => (
                <RevaluationRow key={`rv-${r.id}`} row={r} />
              ))}
              {filteredPc.map((p) => (
                <PhotocopyRow key={`pc-${p.id}`} row={p} />
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<RevaluationStatus, string> = {
  requested: "Requested",
  under_review: "Under review",
  revised: "Revised",
  no_change: "No change",
  approved: "Approved",
  rejected: "Rejected",
};

function RevaluationRow({ row: r }: { row: RevaluationRequest }) {
  const update = useUpdateRevaluationRequest();
  const [marksInput, setMarksInput] = useState(r.revised_marks != null ? String(r.revised_marks) : "");
  const outcome = r.revised_marks != null ? `${r.exam_marks.marks_obtained ?? "—"} → ${r.revised_marks}` : r.status === "no_change" ? "No change" : "Awaiting";

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="flex-1">
        <div className="text-[13.5px] font-bold text-ink">{studentName(r.students) ?? r.students.register_no}</div>
        <div className="text-[11.5px] text-muted">{r.students.register_no ?? r.students.student_id_no}</div>
      </div>
      <div className="w-[220px] text-[12.5px] text-ink">
        {r.exam_marks.exam_subject_mapping.subjects.subject_code} · {r.exam_marks.exam_subject_mapping.subjects.name}
      </div>
      <div className="w-[100px]">
        <Badge tone="neutral">{r.request_kind.toUpperCase()}</Badge>
      </div>
      <div className="w-[90px]">
        <Badge tone={r.fee_paid ? "accentDark" : "danger"}>{r.fee_paid ? "PAID" : "UNPAID"}</Badge>
      </div>
      <div className="w-[130px] text-[12.5px] text-ink">{outcome}</div>
      <div className="w-[110px] text-[12.5px] font-bold text-ink">{STATUS_LABEL[r.status]}</div>
      <div className="flex w-[220px] items-center justify-end gap-2">
        {r.status === "requested" && (
          <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, status: "under_review" })}>
            Start review
          </Button>
        )}
        {r.status === "under_review" && (
          <>
            <Input value={marksInput} onChange={(e) => setMarksInput(e.target.value)} placeholder="Revised marks" className="w-24 text-[12px]" />
            <Button
              variant="secondary"
              className="w-auto px-3 py-1.5 text-[12px]"
              disabled={update.isPending}
              onClick={() => update.mutate({ id: r.id, status: "no_change" })}
            >
              No change
            </Button>
            <Button
              variant="primarySmall"
              className="w-auto px-3 py-1.5 text-[12px]"
              disabled={update.isPending || !marksInput.trim()}
              onClick={() => update.mutate({ id: r.id, status: "revised", revised_marks: Number(marksInput) })}
            >
              Save revision
            </Button>
          </>
        )}
        {(r.status === "revised" || r.status === "no_change") && (
          <>
            <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, status: "rejected" })}>
              Reject
            </Button>
            <Button variant="primarySmall" className="w-auto px-3 py-1.5 text-[12px]" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, status: "approved" })}>
              Approve
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

const PC_STATUS_LABEL: Record<string, string> = { requested: "Requested", scanned: "Scanned", issued: "Issued", rejected: "Rejected" };

function PhotocopyRow({ row: p }: { row: PhotocopyRequest }) {
  const update = useUpdatePhotocopyRequest();

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="flex-1">
        <div className="text-[13.5px] font-bold text-ink">{studentName(p.students) ?? p.students.register_no}</div>
        <div className="text-[11.5px] text-muted">{p.students.register_no ?? p.students.student_id_no}</div>
      </div>
      <div className="w-[220px] text-[12.5px] text-ink">
        {p.exam_marks.exam_subject_mapping.subjects.subject_code} · {p.exam_marks.exam_subject_mapping.subjects.name}
      </div>
      <div className="w-[100px]">
        <Badge tone="neutral">PHOTOCOPY</Badge>
      </div>
      <div className="w-[90px]">
        <Badge tone={p.status !== "requested" ? "accentDark" : "danger"}>{p.status !== "requested" ? "PAID" : "UNPAID"}</Badge>
      </div>
      <div className="w-[130px] text-[12.5px] text-ink">—</div>
      <div className="w-[110px] text-[12.5px] font-bold text-ink">{PC_STATUS_LABEL[p.status]}</div>
      <div className="flex w-[220px] items-center justify-end gap-2">
        {p.status === "requested" && (
          <>
            <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" disabled={update.isPending} onClick={() => update.mutate({ id: p.id, status: "rejected" })}>
              Reject
            </Button>
            <Button variant="primarySmall" className="w-auto px-3 py-1.5 text-[12px]" disabled={update.isPending} onClick={() => update.mutate({ id: p.id, status: "scanned" })}>
              Mark scanned
            </Button>
          </>
        )}
        {p.status === "scanned" && (
          <Button variant="primarySmall" className="w-auto px-3 py-1.5 text-[12px]" disabled={update.isPending} onClick={() => update.mutate({ id: p.id, status: "issued" })}>
            Mark issued
          </Button>
        )}
      </div>
    </div>
  );
}

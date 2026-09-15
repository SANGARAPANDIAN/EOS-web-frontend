"use client";

import { useState } from "react";
import { Card, StatCard, PillTabs, SearchBar, Select, Input, Textarea, Button, Badge, Modal } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonFilterBar, SkeletonTable } from "@/components/ui/Skeleton";
import { useDepartments } from "@/modules/shared/api/departments";
import {
  useSpecialAdmissionStudents,
  useNotifySpecialAdmissionStudent,
  type SpecialAdmissionCategory,
  type SpecialAdmissionStudent,
} from "@/modules/coe/api/specialAdmissions";

const CATEGORY_TABS: { key: "all" | SpecialAdmissionCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "lateral_entry", label: "Lateral entry" },
  { key: "transfer", label: "Transfer" },
];

export default function CoeSpecialAdmissionsPage() {
  const departments = useDepartments();

  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [category, setCategory] = useState<"all" | SpecialAdmissionCategory>("all");
  const [search, setSearch] = useState("");
  const [notifyTarget, setNotifyTarget] = useState<SpecialAdmissionStudent | null>(null);

  const students = useSpecialAdmissionStudents({
    department_id: departmentId,
    category: category === "all" ? null : category,
    search,
  });

  const rows = students.data?.data ?? [];
  const stats = students.data?.stats;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Lateral entry & transfer students" subtitle="Monitor non-regular admissions and their exam readiness" />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total tracked" value={stats?.total ?? 0} icon="groups" loading={students.isLoading} />
        <StatCard label="Lateral entry" value={stats?.lateral_entry_count ?? 0} icon="move_up" loading={students.isLoading} />
        <StatCard label="Transfer" value={stats?.transfer_count ?? 0} icon="swap_horiz" loading={students.isLoading} />
      </div>

      {departments.isLoading ? (
        <SkeletonFilterBar />
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PillTabs options={CATEGORY_TABS} value={category} onChange={(k) => setCategory(k as typeof category)} />
            <div className="flex items-center gap-3">
              <Select value={departmentId ?? ""} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)} className="w-44">
                <option value="">All departments</option>
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </Select>
              <SearchBar placeholder="Search name, reg no…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[240px]" />
            </div>
          </div>
        </Card>
      )}

      {students.isLoading ? (
        <SkeletonTable rows={5} />
      ) : students.isError ? (
        <Card className="border-danger-border bg-danger-bg">
          <p className="text-[13px] text-danger-fg">{(students.error as Error).message}</p>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Students</span>
            <span className="text-[12.5px] text-muted">{rows.length} shown</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">
              No lateral entry or transfer students found — either none are tagged in <code>admission_type</code>/
              <code>joined_academic_year</code> yet, or the current filters exclude them.
            </p>
          ) : (
            <div className="flex flex-col">
              {rows.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-extrabold text-ink">{s.name ?? s.register_no ?? s.student_id_no}</span>
                      <span className="text-[12px] text-muted">{s.register_no ?? s.student_id_no}</span>
                      <Badge tone={s.category === "lateral_entry" ? "accent" : "accentDark"}>
                        {s.category === "lateral_entry" ? "LATERAL ENTRY" : "TRANSFER"}
                      </Badge>
                    </div>
                    <div className="text-[12px] text-muted">
                      {s.department ? `${s.department.code} · ` : ""}
                      {s.class ? `Semester ${s.class.current_semester ?? "—"} Sec ${s.class.section}` : "Class not assigned"} · Batch {s.batch.name}
                    </div>
                    <div className="text-[12px] text-subtle">
                      Admission type: {s.admission_type ?? "—"} · Joined {s.joined_academic_year ?? "—"} (batch expected {s.batch.expected_academic_year})
                    </div>
                    <div className="mt-1 flex flex-wrap gap-4 text-[11.5px] text-muted">
                      <span>{s.papers_with_marks} papers with marks</span>
                      <span>{s.malpractice_count} malpractice cases</span>
                      <span>{s.revaluation_count} revaluation requests</span>
                    </div>
                  </div>
                  <Button variant="secondary" className="w-auto shrink-0 px-3 py-1.5 text-[12px]" onClick={() => setNotifyTarget(s)}>
                    Notify
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <NotifyModal student={notifyTarget} onClose={() => setNotifyTarget(null)} />
    </div>
  );
}

function NotifyModal({ student, onClose }: { student: SpecialAdmissionStudent | null; onClose: () => void }) {
  const notify = useNotifySpecialAdmissionStudent();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  function handleClose() {
    setTitle("");
    setMessage("");
    notify.reset();
    onClose();
  }

  function handleSend() {
    if (!student || !title.trim() || !message.trim()) return;
    notify.mutate(
      { studentId: student.id, title: title.trim(), message: message.trim() },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal
      open={student != null}
      onClose={handleClose}
      title="Send notification"
      subtitle={student ? `To ${student.name ?? student.register_no ?? student.student_id_no}` : undefined}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Submit transfer credit certificates" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Message</label>
          <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Details for the student…" />
        </div>
        {notify.isError && <p className="text-[12px] text-danger-fg">{(notify.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" disabled={!title.trim() || !message.trim() || notify.isPending} onClick={handleSend}>
            {notify.isPending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

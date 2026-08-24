"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, StatCard, PillTabs, SearchBar, Select, Button, Badge, Modal, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useExams } from "@/modules/coe/api/exams";
import { useDepartments } from "@/modules/coe/api/reference";
import { useFacultyDirectory } from "@/modules/coe/api/faculty";
import { useAllScriptBundles } from "@/modules/coe/api/scriptBundles";
import { useQuestionPapers, useQuestionPaperStats, useUpsertQuestionPaper, type QuestionPaperRow, type QuestionPaperStatus } from "@/modules/coe/api/questionPapers";

const TABS: { key: "all" | QuestionPaperStatus; label: string }[] = [
  { key: "all", label: "All papers" },
  { key: "awaiting_upload", label: "Awaiting upload" },
  { key: "under_moderation", label: "Under moderation" },
  { key: "sealed", label: "Sealed" },
];

const TONE: Record<QuestionPaperStatus, BadgeTone> = { sealed: "accentDark", under_moderation: "accent", awaiting_upload: "danger" };
const LABEL: Record<QuestionPaperStatus, string> = { sealed: "Sealed", under_moderation: "Submitted", awaiting_upload: "Awaiting" };

export default function CoeQuestionPapersPage() {
  const exams = useExams();
  const departments = useDepartments();
  const faculty = useFacultyDirectory();
  const [examId, setExamId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [status, setStatus] = useState<"all" | QuestionPaperStatus>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<QuestionPaperRow | null>(null);

  // Defaulting to the highest-id exam often lands on one with zero real
  // question papers uploaded yet — default instead to whichever exam
  // actually has the most script-bundle activity (the real, busiest exam).
  const allScriptBundles = useAllScriptBundles();
  const busiestExamId = useMemo(() => {
    const counts = new Map<number, number>();
    for (const b of allScriptBundles.data ?? []) counts.set(b.exam_id, (counts.get(b.exam_id) ?? 0) + 1);
    let best: number | null = null;
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    return best;
  }, [allScriptBundles.data]);
  const effectiveExamId = examId ?? busiestExamId ?? [...(exams.data ?? [])].sort((a, b) => b.id - a.id)[0]?.id ?? null;
  const stats = useQuestionPaperStats(effectiveExamId);
  const papers = useQuestionPapers(effectiveExamId, { department_id: departmentId, status: status === "all" ? null : status, search });

  const rows = papers.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Question Papers"
        subtitle="Secure setter upload, moderation, sealing and hall-wise distribution tracking."
        actions={
          <Select value={effectiveExamId ?? ""} onChange={(e) => setExamId(Number(e.target.value))} className="w-64">
            {[...(exams.data ?? [])].sort((a, b) => b.id - a.id).map((e) => (
              <option key={e.id} value={e.id}>
                {e.exam_category} · {e.academic_year} · Sem {e.semester}
              </option>
            ))}
          </Select>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Papers required" value={stats.data?.required ?? (stats.isLoading ? "…" : 0)} icon="description" />
        <StatCard label="Sealed & vaulted" value={stats.data?.sealed ?? (stats.isLoading ? "…" : 0)} icon="lock" />
        <StatCard label="Awaiting setter upload" value={stats.data?.awaiting_upload ?? (stats.isLoading ? "…" : 0)} icon="upload" />
        <StatCard label="Under moderation" value={stats.data?.under_moderation ?? (stats.isLoading ? "…" : 0)} icon="fact_check" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs options={TABS} value={status} onChange={(k) => setStatus(k as typeof status)} />
          <div className="flex items-center gap-3">
            <Select value={departmentId ?? ""} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)} className="w-40">
              <option value="">All departments</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>
            <SearchBar placeholder="Search by course code or setter…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[260px]" />
          </div>
        </div>
      </Card>

      {papers.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Papers</span>
            <span className="text-[12.5px] text-muted">{rows.length} records</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No courses match the current filters.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Course</div>
                <div className="w-[150px]">Setter</div>
                <div className="w-[60px]">Sets</div>
                <div className="w-[150px]">Moderator</div>
                <div className="w-[110px]">Vault</div>
                <div className="w-[110px]">Status</div>
                <div className="w-[100px] text-right">Actions</div>
              </div>
              {rows.map((r) => (
                <div key={r.exam_subject_mapping_id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="flex-1">
                    <div className="text-[13.5px] font-bold text-ink">
                      {r.subject.subject_code} · {r.subject.name}
                    </div>
                    <div className="text-[11.5px] text-muted">
                      {r.department?.code ?? "—"} · Sem {r.semester ?? "—"}
                    </div>
                  </div>
                  <div className="w-[150px] text-[12.5px] text-ink">{r.setter ? `${r.setter.first_name} ${r.setter.last_name}` : "— Not uploaded"}</div>
                  <div className="w-[60px] text-[12.5px] text-ink">{r.sets_count}</div>
                  <div className="w-[150px] text-[12.5px] text-ink">{r.moderator ? `${r.moderator.first_name} ${r.moderator.last_name}` : "—"}</div>
                  <div className="w-[110px]">
                    <Badge tone={r.vaulted ? "accentDark" : "accent"}>{r.vaulted ? "STRONG ROOM" : "PENDING"}</Badge>
                  </div>
                  <div className="w-[110px]">
                    <Badge tone={TONE[r.status]}>{LABEL[r.status].toUpperCase()}</Badge>
                  </div>
                  <div className="w-[100px] text-right">
                    <Button variant="secondary" className="w-auto shrink-0 px-3 py-1.5 text-[12px]" onClick={() => setEditing(r)}>
                      {r.status === "sealed" ? "Track" : r.status === "under_moderation" ? "Moderate" : "Remind"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <EditPaperModal row={editing} facultyOptions={faculty.data ?? []} onClose={() => setEditing(null)} />
    </div>
  );
}

function EditPaperModal({
  row,
  facultyOptions,
  onClose,
}: {
  row: QuestionPaperRow | null;
  facultyOptions: { id: number; name: string; designation: string }[];
  onClose: () => void;
}) {
  const upsert = useUpsertQuestionPaper();
  const [setterFacultyId, setSetterFacultyId] = useState("");
  const [moderatorFacultyId, setModeratorFacultyId] = useState("");
  const [setsCount, setSetsCount] = useState("2");
  const [status, setStatus] = useState<QuestionPaperStatus>("awaiting_upload");

  // Re-initializes the form whenever a different row is opened — as an
  // effect, not during render, since it sets state on this component from
  // a child (ModalBody used to do this inline during render, which React
  // flags as an invalid cross-component setState).
  useEffect(() => {
    if (!row) return;
    setSetterFacultyId(row.setter?.id ? String(row.setter.id) : "");
    setModeratorFacultyId(row.moderator?.id ? String(row.moderator.id) : "");
    setSetsCount(String(row.sets_count ?? 2));
    setStatus(row.status ?? "awaiting_upload");
  }, [row?.exam_subject_mapping_id]);

  function handleClose() {
    upsert.reset();
    onClose();
  }

  function handleSave() {
    if (!row) return;
    upsert.mutate(
      {
        exam_subject_mapping_id: row.exam_subject_mapping_id,
        setter_faculty_id: setterFacultyId ? Number(setterFacultyId) : undefined,
        moderator_faculty_id: moderatorFacultyId ? Number(moderatorFacultyId) : undefined,
        sets_count: Number(setsCount),
        status,
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal
      open={row != null}
      onClose={handleClose}
      title={row ? `${row.subject.subject_code} · ${row.subject.name}` : ""}
      subtitle="Setter, moderator, sets and vault status."
      className="max-w-[520px]"
    >
      {row && (
        <ModalBody
          row={row}
          setterFacultyId={setterFacultyId}
          setSetterFacultyId={setSetterFacultyId}
          moderatorFacultyId={moderatorFacultyId}
          setModeratorFacultyId={setModeratorFacultyId}
          setsCount={setsCount}
          setSetsCount={setSetsCount}
          status={status}
          setStatus={setStatus}
          facultyOptions={facultyOptions}
        />
      )}
      {upsert.isError && <p className="mt-2 text-[12px] text-danger-fg">{(upsert.error as Error).message}</p>}
      <div className="mt-4 flex justify-end gap-3">
        <Button variant="secondary" className="w-auto" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primarySmall" disabled={upsert.isPending} onClick={handleSave}>
          {upsert.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </Modal>
  );
}

function ModalBody(props: {
  row: QuestionPaperRow;
  setterFacultyId: string;
  setSetterFacultyId: (v: string) => void;
  moderatorFacultyId: string;
  setModeratorFacultyId: (v: string) => void;
  setsCount: string;
  setSetsCount: (v: string) => void;
  status: QuestionPaperStatus;
  setStatus: (v: QuestionPaperStatus) => void;
  facultyOptions: { id: number; name: string; designation: string }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Setter</label>
        <Select value={props.setterFacultyId} onChange={(e) => props.setSetterFacultyId(e.target.value)}>
          <option value="">Not uploaded</option>
          {props.facultyOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Moderator</label>
        <Select value={props.moderatorFacultyId} onChange={(e) => props.setModeratorFacultyId(e.target.value)}>
          <option value="">Not assigned</option>
          {props.facultyOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Sets</label>
          <Select value={props.setsCount} onChange={(e) => props.setSetsCount(e.target.value)}>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Status</label>
          <Select value={props.status} onChange={(e) => props.setStatus(e.target.value as QuestionPaperStatus)}>
            <option value="awaiting_upload">Awaiting upload</option>
            <option value="under_moderation">Under moderation</option>
            <option value="sealed">Sealed</option>
          </Select>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Card, Badge, Button, Input, Select, Textarea, ProgressBar, SkeletonCardGrid, Avatar } from "@/components/ui";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useHodCurrentSemester, type HodCurrentSemesterSubject } from "@/modules/hod/api/myClassCurrentSemester";
import {
  useFacultyFolders,
  useCreateFolder,
  useFolderResources,
  useAddLinkResource,
  useAddFileResource,
  useFacultyTasks,
  useCreateLmsTask,
  useTaskSubmissions,
  useFacultyLessonPlan,
  useCreateLessonSession,
} from "@/modules/advisor/api/lms";
import { useHodAssignmentStatus, useMarkHodAssignmentStatus, type HodAssignmentStudentRow } from "@/modules/hod/api/myClassAssignmentStatus";
import { formatDisplayDate, formatDayAndTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

// Reuses the same real, already HOD-accessible LMS endpoints
// (@Roles(FACULTY, HOD) on every /me/lms/* route — see that module's own
// comment) that the advisor role's Current Semester screen already uses,
// rebuilt here with this module's own Tailwind/UI-kit look instead of that
// page's inline-style JSX. A HOD is also faculty for the subjects they
// personally teach, so nothing on the backend needed to change.

type Tab = "material" | "task" | "assignment" | "lesson";

function ClassChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-pill border px-3.5 py-1.5 text-[12px] font-extrabold transition-colors " +
        (active ? "border-primary bg-accent-50 text-primary" : "border-border-default bg-surface text-body hover:bg-nav-hover")
      }
    >
      {label}
    </button>
  );
}

function SubjectCard({ s, onClick }: { s: HodCurrentSemesterSubject; onClick: () => void }) {
  return (
    <Card className="hod-hover-card cursor-pointer" onClick={onClick}>
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

function MaterialTab({ subject, classOptions }: { subject: HodCurrentSemesterSubject; classOptions: HodCurrentSemesterSubject[] }) {
  const folders = useFacultyFolders(subject.subject_id);
  const createFolder = useCreateFolder();
  const [folderId, setFolderId] = useState<number | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([subject.class_id]);

  const activeFolderId = folderId ?? folders.data?.[0]?.id ?? null;
  const activeFolder = folders.data?.find((f) => f.id === activeFolderId);
  const resources = useFolderResources(activeFolderId ?? undefined);
  const addLink = useAddLinkResource();
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const addFile = useAddFileResource();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleClass(classId: number) {
    setSelectedClassIds((prev) => (prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]));
  }

  function openNewFolder() {
    setSelectedClassIds([subject.class_id]);
    setTitle("");
    setDescription("");
    setShowNewFolder(true);
  }

  function submitNewFolder() {
    if (!title.trim() || selectedClassIds.length === 0) return;
    createFolder.mutate(
      { subject_id: subject.subject_id, title: title.trim(), description: description.trim() || undefined, class_ids: selectedClassIds },
      { onSuccess: (res) => { setTitle(""); setDescription(""); setShowNewFolder(false); setFolderId(res.id); } },
    );
  }

  function submitAddLink() {
    if (!linkTitle.trim() || !linkUrl.trim() || !activeFolderId) return;
    addLink.mutate(
      { folderId: activeFolderId, title: linkTitle.trim(), link_url: linkUrl.trim() },
      { onSuccess: () => { setLinkTitle(""); setLinkUrl(""); setShowAddLink(false); } },
    );
  }

  return (
    <div className="mt-5 grid grid-cols-[1fr_1.3fr] gap-4 items-start">
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-extrabold tracking-[.09em] text-subtle uppercase">Your folders</div>
          <div className="text-[12px] font-extrabold text-primary">{(folders.data ?? []).length}</div>
        </div>

        {showNewFolder ? (
          <div className="mt-3.5 flex flex-col gap-2.5 rounded-[12px] border border-divider bg-surface-tint p-3.5">
            <div className="text-[11px] font-extrabold tracking-[.08em] text-primary uppercase">New folder</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Folder title" />
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
            <div>
              <div className="mb-1.5 text-[11px] font-bold text-subtle">Share to classes</div>
              <div className="flex flex-wrap gap-2">
                {classOptions.map((c) => (
                  <ClassChip key={c.class_id} label={c.section} active={selectedClassIds.includes(c.class_id)} onClick={() => toggleClass(c.class_id)} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowNewFolder(false)}>
                Cancel
              </Button>
              <Button variant="primarySmall" className="flex-1" onClick={submitNewFolder} loading={createFolder.isPending}>
                Create
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openNewFolder}
            className="mt-3.5 flex w-full items-center gap-2.5 rounded-[11px] border-[1.5px] border-dashed border-border-accent px-4 py-3.5 text-[13.5px] font-bold text-primary hover:bg-nav-hover"
          >
            <span className="flex size-[22px] items-center justify-center rounded-full bg-primary text-[14px] font-extrabold text-white">+</span>
            Create new folder
          </button>
        )}

        <div className="mt-3.5 flex flex-col gap-2.5">
          {(folders.data ?? []).map((f) => {
            const active = activeFolderId === f.id;
            return (
              <button
                type="button"
                key={f.id}
                onClick={() => setFolderId(f.id)}
                className={
                  "flex items-center gap-3 rounded-[11px] border px-3.5 py-3 text-left " +
                  (active ? "border-border-accent bg-accent-50" : "border-transparent hover:bg-nav-hover")
                }
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-accent-50">
                  <div className="size-3.5 rounded-[3px] border-2 border-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-ink">{f.title}</div>
                  {f.description && <div className="mt-0.5 text-[11.5px] text-subtle">{f.description}</div>}
                  <div className="mt-0.5 text-[11.5px] text-subtle">
                    {f.resource_count} item{f.resource_count === 1 ? "" : "s"} · shared to {f.classes.map((c) => c.label).join(", ") || "—"}
                  </div>
                </div>
              </button>
            );
          })}
          {(folders.data ?? []).length === 0 && !folders.isLoading && (
            <div className="py-3 text-[13px] font-semibold text-subtle">No folders yet.</div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-[17px] font-extrabold text-ink">{activeFolder?.title ?? "No folder selected"}</div>
          <div className="text-[12.5px] text-muted">{(resources.data ?? []).length} items in this folder</div>
        </div>

        {activeFolderId && (
          <div className="mt-4 flex gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || !activeFolderId) return;
                addFile.mutate({ folderId: activeFolderId, title: file.name, file });
                e.target.value = "";
              }}
            />
            <Button variant="secondary" className="flex-1 border-border-accent text-primary" onClick={() => fileInputRef.current?.click()} loading={addFile.isPending}>
              Upload file
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddLink((v) => !v)}>
              Add link
            </Button>
          </div>
        )}

        {showAddLink && (
          <div className="mt-3 flex flex-col gap-2">
            <Input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Link title" />
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
            <Button variant="primarySmall" onClick={submitAddLink} loading={addLink.isPending}>
              Add
            </Button>
          </div>
        )}

        <div className="mt-3 flex flex-col">
          {(resources.data ?? []).map((item) => (
            <div key={item.id} className="flex items-center gap-3.5 border-b border-divider py-3.5 last:border-b-0">
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold text-ink">{item.title}</div>
                <div className="mt-0.5 text-[11.5px] text-subtle">Added {formatDisplayDate(item.created_at)}</div>
              </div>
              <Badge tone="accent" className="shrink-0 uppercase">
                {item.resource_type}
              </Badge>
              <a
                href={item.link_url ?? item.file_url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-[9px] border border-border-default px-3.5 py-2 text-[12.5px] font-bold text-body hover:bg-nav-hover"
              >
                Open
              </a>
            </div>
          ))}
          {activeFolderId && (resources.data ?? []).length === 0 && !resources.isLoading && (
            <div className="py-3 text-[13px] font-semibold text-subtle">No items in this folder yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function TaskTab({ subject, classOptions }: { subject: HodCurrentSemesterSubject; classOptions: HodCurrentSemesterSubject[] }) {
  const tasks = useFacultyTasks(subject.subject_id, subject.class_id);
  const createTask = useCreateLmsTask();
  const [taskId, setTaskId] = useState<number | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([subject.class_id]);

  const activeTaskId = taskId ?? tasks.data?.[0]?.id ?? null;
  const activeTask = tasks.data?.find((t) => t.id === activeTaskId);
  const submissions = useTaskSubmissions(activeTaskId ?? undefined);

  function toggleClass(classId: number) {
    setSelectedClassIds((prev) => (prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]));
  }

  function openNewTask() {
    setSelectedClassIds([subject.class_id]);
    setTitle("");
    setDescription("");
    setDueDate("");
    setMaxMarks("");
    setShowNewTask(true);
  }

  function submitNewTask() {
    if (!title.trim() || selectedClassIds.length === 0) return;
    createTask.mutate(
      {
        subject_id: subject.subject_id,
        class_ids: selectedClassIds,
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        max_marks: maxMarks ? Number(maxMarks) : undefined,
        task_type: "assignment",
      },
      {
        onSuccess: (res) => {
          setTitle("");
          setDescription("");
          setDueDate("");
          setMaxMarks("");
          setShowNewTask(false);
          if (res[0]) setTaskId(res[0].id);
        },
      },
    );
  }

  return (
    <div className="mt-5 grid grid-cols-[1fr_1.4fr] gap-4 items-start">
      <Card>
        <div className="text-[11px] font-extrabold tracking-[.09em] text-subtle uppercase">Tasks &amp; assignments</div>

        {showNewTask ? (
          <div className="mt-3.5 flex flex-col gap-2.5 rounded-[12px] border border-divider bg-surface-tint p-3.5">
            <div className="text-[11px] font-extrabold tracking-[.08em] text-primary uppercase">New task</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Assignment 3 · Unit 3)" />
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="mb-1 text-[11px] font-bold text-subtle">Due date</div>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-[11px] font-bold text-subtle">Max marks</div>
                <Input value={maxMarks} onChange={(e) => setMaxMarks(e.target.value.replace(/\D/g, ""))} placeholder="20" />
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-bold text-subtle">Share to classes</div>
              <div className="flex flex-wrap gap-2">
                {classOptions.map((c) => (
                  <ClassChip key={c.class_id} label={c.section} active={selectedClassIds.includes(c.class_id)} onClick={() => toggleClass(c.class_id)} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowNewTask(false)}>
                Cancel
              </Button>
              <Button variant="primarySmall" className="flex-1" onClick={submitNewTask} loading={createTask.isPending}>
                Create
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openNewTask}
            className="mt-3.5 flex w-full items-center gap-2.5 rounded-[11px] border-[1.5px] border-dashed border-border-accent px-4 py-3.5 text-[13.5px] font-bold text-primary hover:bg-nav-hover"
          >
            <span className="flex size-[22px] items-center justify-center rounded-full bg-primary text-[14px] font-extrabold text-white">+</span>
            Create new task
          </button>
        )}

        <div className="mt-3.5 flex flex-col gap-2.5">
          {(tasks.data ?? []).map((t) => {
            const active = activeTaskId === t.id;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => setTaskId(t.id)}
                className={
                  "flex items-center gap-2.5 rounded-[11px] border px-3.5 py-3 text-left " +
                  (active ? "border-border-accent bg-accent-50" : "border-transparent hover:bg-nav-hover")
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-ink">{t.title}</div>
                  <div className="mt-0.5 text-[11.5px] text-subtle">
                    {t.due_date ? `Due ${formatDisplayDate(t.due_date)}` : "No due date"}
                    {t.max_marks ? ` · max ${t.max_marks} marks` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-[12px] font-extrabold text-primary">{t.submitted_count}</div>
              </button>
            );
          })}
          {(tasks.data ?? []).length === 0 && !tasks.isLoading && (
            <div className="py-3 text-[13px] font-semibold text-subtle">No tasks yet.</div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-[17px] font-extrabold text-ink">{activeTask?.title ?? "No task selected"}</div>
          <div className="text-[12.5px] text-muted">
            {(submissions.data ?? []).filter((r) => r.is_submitted).length} of {(submissions.data ?? []).length} submitted
          </div>
        </div>
        <div className="mt-3.5 flex flex-col">
          {(submissions.data ?? []).map((r) => (
            <div key={r.student_id} className="flex items-center gap-3.5 border-b border-divider py-3 last:border-b-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11.5px] font-extrabold text-primary">
                {r.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-ink">{r.name}</div>
                <div className="mt-0.5 text-[11px] text-subtle">{r.student_id_no}</div>
              </div>
              {r.submission_file_url ? (
                <a href={r.submission_file_url} target="_blank" rel="noreferrer" className="shrink-0 text-[12.5px] font-bold text-primary">
                  View submission
                </a>
              ) : (
                <div className="shrink-0 text-[12.5px] font-bold text-subtle">—</div>
              )}
              <div className="w-[60px] shrink-0 text-right text-[12.5px] font-bold text-ink">
                {r.marks_obtained !== null ? r.marks_obtained : "—"}
              </div>
              <Badge tone={r.is_submitted ? "accent" : "neutral"} className="shrink-0 uppercase">
                {r.is_submitted ? "Submitted" : "Not submitted"}
              </Badge>
            </div>
          ))}
          {activeTaskId && (submissions.data ?? []).length === 0 && !submissions.isLoading && (
            <div className="py-3 text-[13px] font-semibold text-subtle">No submissions to show yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function assignmentLabel(a: { sequence_no: number; title: string | null }): string {
  return a.title ? `Assignment ${a.sequence_no} · ${a.title}` : `Assignment ${a.sequence_no}`;
}

// Assignment Status, folded in here instead of its own sidebar page — a
// genuinely different backend feature from Task above (real `assignments` +
// `student_assignment_status` tables, sequence-numbered, submitted/not
// toggled by hand, no file/marks fields at all), already subject+class
// scoped server-side via useHodAssignmentStatus's params.
function AssignmentTab({ subject }: { subject: HodCurrentSemesterSubject }) {
  const [assignmentId, setAssignmentId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Submitted" | "Not submitted">("All");

  const overview = useHodAssignmentStatus(subject.class_id, subject.subject_id, assignmentId ?? undefined);
  const mark = useMarkHodAssignmentStatus();

  const o = overview.data;
  const assignments = o?.assignments ?? [];
  const students = o?.students ?? [];
  const submittedCount = students.filter((s) => s.is_submitted).length;

  const filteredStudents = students.filter((r) => {
    const q = query.trim().toLowerCase();
    if (q && !(r.name.toLowerCase().includes(q) || r.student_id_no.toLowerCase().includes(q))) return false;
    if (filter === "Submitted") return r.is_submitted;
    if (filter === "Not submitted") return !r.is_submitted;
    return true;
  });

  function markStudent(row: HodAssignmentStudentRow, isSubmitted: boolean) {
    if (!o?.assignment) return;
    mark.mutate({ assignment_id: o.assignment.id, student_id: row.student_id, status_id: row.status_id, is_submitted: isSubmitted });
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      <Card>
        <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Assignment</label>
        <Select
          value={assignmentId ?? o?.assignment?.id ?? ""}
          onChange={(e) => setAssignmentId(Number(e.target.value))}
          disabled={assignments.length === 0}
          className="text-[15px] font-bold"
        >
          {assignments.length === 0 ? (
            <option value="">No assignments yet</option>
          ) : (
            assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {assignmentLabel(a)}
              </option>
            ))
          )}
        </Select>
        {o?.assignment && (
          <div className="mt-4 flex items-center gap-5">
            <span className="shrink-0 text-[14px] font-extrabold text-primary">
              {submittedCount} of {students.length} submitted
            </span>
            <ProgressBar percent={students.length > 0 ? (submittedCount / students.length) * 100 : 0} className="flex-1" />
          </div>
        )}
      </Card>

      {!o?.assignment ? (
        <Card>
          <div className="text-[13px] text-subtle">No assignments created for this subject yet.</div>
        </Card>
      ) : (
        <>
          <Card className="flex flex-wrap items-center gap-2.5">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or roll number" className="min-w-[220px] flex-1" />
            {(["All", "Submitted", "Not submitted"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-[10px] border px-4 py-2.5 text-[12.5px] font-bold whitespace-nowrap",
                  filter === f ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-body hover:bg-nav-hover",
                )}
              >
                {f}
              </button>
            ))}
          </Card>

          <div className="flex flex-col gap-3">
            {filteredStudents.map((s) => (
              <Card key={s.student_id} className="hod-hover-card">
                <div className="flex items-center gap-3.5">
                  <Avatar name={s.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-bold text-ink">{s.name}</div>
                    <div className="truncate text-[12.5px] text-subtle">{[s.student_id_no, s.email].filter(Boolean).join(" · ")}</div>
                  </div>
                  <span className="w-[92px] shrink-0 text-right text-[12.5px] text-subtle">
                    {s.is_submitted && s.marked_at ? formatDayAndTime(s.marked_at) : "—"}
                  </span>
                  <span className={cn("shrink-0 rounded-[11px] px-[18px] py-[10px] text-center text-[13px] font-bold", s.is_submitted ? "bg-primary text-white" : "bg-surface-tint text-subtle")}>
                    {s.is_submitted ? "Submitted" : "Not submitted"}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => markStudent(s, !s.is_submitted)}
                    disabled={mark.isPending}
                    loading={mark.isPending && mark.variables?.student_id === s.student_id}
                  >
                    {s.is_submitted ? "Mark not submitted" : "Mark submitted"}
                  </Button>
                </div>
              </Card>
            ))}
            {filteredStudents.length === 0 && !overview.isLoading && (
              <Card>
                <div className="text-center text-[13px] text-subtle">
                  {students.length === 0 ? "No students found for this assignment." : "No students match this filter."}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LessonPlanTab({ subject }: { subject: HodCurrentSemesterSubject }) {
  const lessonPlan = useFacultyLessonPlan(subject.subject_id, subject.class_id);
  const createSession = useCreateLessonSession();
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTopic, setSessionTopic] = useState("");

  const sessions = lessonPlan.data?.sessions ?? [];
  const coveredCount = sessions.filter((s) => s.is_covered).length;
  const progressPct = sessions.length ? Math.round((coveredCount / sessions.length) * 100) : 0;

  function submitAddSession() {
    if (!sessionDate || !sessionTopic.trim()) return;
    createSession.mutate(
      { subject_id: subject.subject_id, class_id: subject.class_id, session_date: sessionDate, topic: sessionTopic.trim() },
      { onSuccess: () => { setSessionDate(""); setSessionTopic(""); setShowAddSession(false); } },
    );
  }

  return (
    <Card className="mt-5">
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={() => setShowAddSession((v) => !v)}
          className="flex items-center gap-2.5 rounded-[11px] border-[1.5px] border-dashed border-border-accent px-4 py-3 text-[13.5px] font-bold text-primary hover:bg-nav-hover"
        >
          <span className="flex size-[22px] items-center justify-center rounded-full bg-primary text-[14px] font-extrabold text-white">+</span>
          Add session
        </button>
        <div className="min-w-[220px] flex-1">
          <div className="flex items-center justify-between text-[12.5px] font-bold text-body">
            <span>Syllabus progress</span>
            <span className="text-primary">{progressPct}%</span>
          </div>
          <ProgressBar percent={progressPct} className="mt-2" />
        </div>
      </div>

      {showAddSession && (
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="max-w-[180px]" />
          <Input value={sessionTopic} onChange={(e) => setSessionTopic(e.target.value)} placeholder="Topic" className="min-w-[200px] flex-1" />
          <Button variant="primarySmall" onClick={submitAddSession} loading={createSession.isPending}>
            Add
          </Button>
        </div>
      )}

      <div className="mt-4 flex flex-col">
        {sessions.map((l) => {
          const d = new Date(l.session_date);
          return (
            <div key={l.id} className="flex items-center gap-4 border-b border-divider py-3.5 last:border-b-0">
              <div className="w-[52px] shrink-0 text-center">
                <div className="text-[16px] font-extrabold text-primary">{String(d.getDate()).padStart(2, "0")}</div>
                <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">
                  {d.toLocaleDateString("en-IN", { month: "short" })}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold text-ink">{l.topic}</div>
                {l.unit_title && <div className="mt-0.5 text-[11.5px] text-subtle">{l.unit_title}</div>}
              </div>
              <Badge tone={l.is_covered ? "accent" : "neutral"} className="shrink-0 uppercase">
                {l.is_covered ? "Covered" : "Planned"}
              </Badge>
            </div>
          );
        })}
        {sessions.length === 0 && !lessonPlan.isLoading && (
          <div className="py-3 text-[13px] font-semibold text-subtle">No lesson sessions recorded yet.</div>
        )}
      </div>
    </Card>
  );
}

function SubjectDetail({
  subject,
  classOptions,
  onBack,
}: {
  subject: HodCurrentSemesterSubject;
  classOptions: HodCurrentSemesterSubject[];
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>("material");

  return (
    <div>
      <button type="button" onClick={onBack} className="text-[13.5px] font-bold text-primary hover:underline">
        ← All subjects
      </button>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">{subject.subject_name}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {subject.subject_code} · {subject.section} · {subject.hours_per_week || "—"} hrs / week
          </p>
        </div>
        <SegmentedTabs
          value={tab}
          onChange={(k) => setTab(k as Tab)}
          options={[
            { key: "material", label: "Material" },
            { key: "task", label: "Task" },
            { key: "assignment", label: "Assignments" },
            { key: "lesson", label: "Lesson plan" },
          ]}
        />
      </div>

      {tab === "material" && <MaterialTab subject={subject} classOptions={classOptions} />}
      {tab === "task" && <TaskTab subject={subject} classOptions={classOptions} />}
      {tab === "assignment" && <AssignmentTab subject={subject} />}
      {tab === "lesson" && <LessonPlanTab subject={subject} />}
    </div>
  );
}

export default function HodCurrentSemesterPage() {
  const overview = useHodCurrentSemester();
  const o = overview.data;
  const subjects = o?.subjects ?? [];
  const [subjectKey, setSubjectKey] = useState<string | null>(null);

  const selected = subjects.find((s) => `${s.class_id}-${s.subject_id}` === subjectKey);

  if (selected) {
    const classOptions = subjects.filter((s) => s.subject_id === selected.subject_id);
    return (
      <div className="flex flex-col gap-5 animate-pop-in">
        <SubjectDetail subject={selected} classOptions={classOptions} onBack={() => setSubjectKey(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">LMS</h1>
        <p className="mt-1 text-[13px] text-muted">
          {o ? `${o.academic_year.replace("-", "–")} · ` : ""}
          Open a subject to manage material, tasks and lesson plan
        </p>
      </div>

      {overview.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load current-semester data — please try again.
        </div>
      )}

      {overview.isLoading ? (
        <SkeletonCardGrid count={3} columns={3} />
      ) : overview.isError ? null : subjects.length === 0 ? (
        <Card>
          <div className="text-[13px] text-subtle">You are not mapped to teach any class/subject yet.</div>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {subjects.map((s) => (
            <SubjectCard key={`${s.class_id}-${s.subject_id}`} s={s} onClick={() => setSubjectKey(`${s.class_id}-${s.subject_id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

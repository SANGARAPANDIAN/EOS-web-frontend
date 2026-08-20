"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Badge, SegmentedTabs, EmptyState, Icon, Button } from "@/components/ui";
import {
  useMyLmsSubjects,
  useLmsMaterials,
  useLmsTasks,
  useSubmitLmsTask,
  useLmsLessonPlan,
  type LmsMaterialItem,
  type LmsTask,
  type LessonPlanSession,
} from "@/modules/student/api/lms";
import { formatDisplayDate } from "@/lib/utils/date";

type Tab = "material" | "assignments" | "lessonplan";

const FORMAT_BY_EXT: Record<string, { label: string; icon: string }> = {
  pdf: { label: "PDF", icon: "picture_as_pdf" },
  ppt: { label: "PPT", icon: "slideshow" },
  pptx: { label: "PPT", icon: "slideshow" },
  doc: { label: "DOC", icon: "description" },
  docx: { label: "DOC", icon: "description" },
  xls: { label: "XLS", icon: "table_chart" },
  xlsx: { label: "XLS", icon: "table_chart" },
  mp4: { label: "VIDEO", icon: "play_circle" },
  mov: { label: "VIDEO", icon: "play_circle" },
  webm: { label: "VIDEO", icon: "play_circle" },
};

// No mime/format column exists on lms_resources — the extension is recovered
// honestly from the stored file_url (the original filename survives in it).
function resourceFormat(resource: LmsMaterialItem): { label: string; icon: string } {
  if (resource.resource_type === "link") return { label: "LINK", icon: "open_in_new" };
  const ext = resource.file_url?.split(".").pop()?.toLowerCase().split("?")[0];
  return (ext && FORMAT_BY_EXT[ext]) || { label: "FILE", icon: "description" };
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

interface LessonUnit {
  roman: string;
  unitTitle: string;
  topics: string;
  sessionCount: number;
  status: "Completed" | "In progress" | "Planned";
}

// lesson_plan_sessions is per-session, not per-unit — there's no hours column
// at that grain, so this aggregates real sessions sharing the same
// unit_title into a unit row (session count and covered-status derived, not
// fabricated) rather than showing a made-up "9 hours per unit" figure.
function aggregateLessonPlan(sessions: LessonPlanSession[]): LessonUnit[] {
  const byUnit = new Map<string, { topics: string[]; sessionCount: number; coveredCount: number; firstDate: string }>();
  for (const s of sessions) {
    const key = s.unit_title || "Unassigned";
    const entry = byUnit.get(key) ?? { topics: [], sessionCount: 0, coveredCount: 0, firstDate: s.session_date };
    entry.topics.push(s.topic);
    entry.sessionCount += 1;
    if (s.is_covered) entry.coveredCount += 1;
    if (s.session_date < entry.firstDate) entry.firstDate = s.session_date;
    byUnit.set(key, entry);
  }
  return Array.from(byUnit.entries())
    .sort((a, b) => a[1].firstDate.localeCompare(b[1].firstDate))
    .map(([unitTitle, e], i) => ({
      roman: ROMAN[i] ?? String(i + 1),
      unitTitle,
      topics: e.topics.join(", "),
      sessionCount: e.sessionCount,
      status: e.coveredCount === 0 ? "Planned" : e.coveredCount === e.sessionCount ? "Completed" : "In progress",
    }));
}

function MaterialRow({ item, showFolder }: { item: LmsMaterialItem; showFolder: boolean }) {
  const format = resourceFormat(item);
  const href = item.file_url ?? item.link_url ?? "#";
  return (
    <div className="flex items-center gap-3.5 border-t border-divider px-5 py-3.5 first:border-0">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-icon-chip">
        <Icon name={format.icon} size={19} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold text-ink">{item.title}</div>
        <div className="mt-0.5 text-[11.5px] text-subtle">
          Uploaded {formatDisplayDate(item.created_at)}
          {showFolder ? ` · ${item.folder_title}` : ""}
        </div>
      </div>
      <Badge tone="accent">{format.label}</Badge>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 rounded-[9px] border border-border-default bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink-soft hover:bg-nav-hover"
      >
        <Icon name="download" size={16} />
        Open
      </a>
    </div>
  );
}

function AssignmentCard({ task, onSubmit, submitting }: { task: LmsTask; onSubmit: (file: File) => void; submitting: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const graded = task.marks_obtained !== null;
  const status = graded ? "Evaluated" : task.is_submitted ? "Submitted" : "Pending";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3.5">
        <div>
          <div className="text-[15.5px] font-extrabold tracking-[-.02em] text-ink">{task.title}</div>
          <div className="mt-[3px] text-[12.5px] text-muted">
            {task.due_date ? `Due ${formatDisplayDate(task.due_date)}` : "No due date"}
            {task.max_marks !== null ? ` · ${task.max_marks} marks` : ""}
          </div>
          {task.description && <p className="mt-2 text-[13px] leading-[1.6] text-body">{task.description}</p>}
        </div>
        <Badge tone={status === "Pending" ? "accentDark" : "accent"}>{status}</Badge>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-divider pt-3.5">
        {task.attachment_url && (
          <a
            href={task.attachment_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-[9px] border border-border-default bg-surface-muted px-3 py-[7px] text-[12.5px] font-bold text-ink-soft"
          >
            <Icon name="attach_file" size={17} className="text-primary" />
            Task attachment
          </a>
        )}
        <div className="flex-1" />
        {graded ? (
          <span className="text-[12.5px] font-bold text-primary">
            Evaluated · {task.marks_obtained} / {task.max_marks}
          </span>
        ) : task.is_submitted ? (
          <span className="text-[12.5px] font-bold text-primary">
            Submitted {task.submitted_at ? formatDisplayDate(task.submitted_at) : ""} · awaiting evaluation
          </span>
        ) : (
          <>
            <label className="flex cursor-pointer items-center gap-2 rounded-[9px] border border-dashed border-border-accent bg-[#f8faff] px-3.5 py-2 text-[12.5px] font-bold text-primary">
              <Icon name="upload_file" size={17} />
              {file ? file.name : "Choose file"}
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <Button
              variant="primarySmall"
              disabled={!file || submitting}
              onClick={() => {
                if (file) onSubmit(file);
              }}
            >
              {submitting ? "Submitting…" : "Submit assignment"}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

export default function LmsSubjectPage() {
  const params = useParams<{ subjectId: string }>();
  const subjectId = Number(params.subjectId);

  const subjects = useMyLmsSubjects();
  const subject = subjects.data?.find((s) => s.subject_id === subjectId);
  const materials = useLmsMaterials(subjectId);
  const tasks = useLmsTasks(subjectId);
  const lessonPlan = useLmsLessonPlan(subjectId);
  const submitMutation = useSubmitLmsTask(subjectId);

  const [tab, setTab] = useState<Tab>("material");
  const [submittingTaskId, setSubmittingTaskId] = useState<number | null>(null);

  const lessonUnits = useMemo(() => aggregateLessonPlan(lessonPlan.data?.sessions ?? []), [lessonPlan.data]);
  const totalSessions = lessonUnits.reduce((sum, u) => sum + u.sessionCount, 0);

  const subtitle = [subject?.subject_code, subject?.faculty_name, subject?.credits != null ? `${subject.credits} credits` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/student/lms" className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary">
            <Icon name="arrow_back" size={16} />
            All courses
          </Link>
          <h1 className="text-[24px] font-extrabold tracking-[-.02em] text-ink">{subject?.subject_name ?? "Course"}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
        <SegmentedTabs
          options={[
            { key: "material", label: "Material" },
            { key: "assignments", label: "Assignments" },
            { key: "lessonplan", label: "Lesson plan" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </div>

      {tab === "material" && (
        <Card className="overflow-hidden p-0">
          <div className="px-5 pt-4 pb-1 text-[16px] font-extrabold tracking-[-.02em] text-ink">Course material</div>
          {materials.isLoading ? (
            <EmptyState message="Loading…" className="px-5" />
          ) : materials.items.length === 0 ? (
            <EmptyState message="No material shared yet." className="px-5" />
          ) : (
            materials.items.map((item) => <MaterialRow key={item.id} item={item} showFolder={materials.folderCount > 1} />)
          )}
        </Card>
      )}

      {tab === "assignments" && (
        <>
          {tasks.isLoading ? (
            <Card>
              <EmptyState message="Loading…" />
            </Card>
          ) : !tasks.data || tasks.data.length === 0 ? (
            <Card>
              <EmptyState message="No assignments posted yet." />
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {tasks.data.map((task) => (
                <AssignmentCard
                  key={task.id}
                  task={task}
                  submitting={submitMutation.isPending && submittingTaskId === task.id}
                  onSubmit={(file) => {
                    setSubmittingTaskId(task.id);
                    submitMutation.mutate({ taskId: task.id, file });
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "lessonplan" && (
        <Card className="overflow-hidden p-0">
          <div className="px-5 pt-4 pb-3.5 text-[16px] font-extrabold tracking-[-.02em] text-ink">
            Lesson plan
            {lessonUnits.length > 0 && (
              <div className="mt-[3px] text-[12.5px] font-normal text-muted">
                {lessonUnits.length} unit{lessonUnits.length === 1 ? "" : "s"} · {totalSessions} session{totalSessions === 1 ? "" : "s"}
              </div>
            )}
          </div>
          {lessonPlan.isLoading ? (
            <EmptyState message="Loading…" className="px-5" />
          ) : lessonUnits.length === 0 ? (
            <EmptyState message="No lesson plan published yet." className="px-5" />
          ) : (
            <>
              <div className="grid grid-cols-[.7fr_2.2fr_1fr_1fr] bg-surface-muted px-5 py-2.5 text-[10.5px] font-extrabold tracking-[.09em] text-subtle">
                <div>UNIT</div>
                <div>TOPICS</div>
                <div className="text-center">SESSIONS</div>
                <div className="text-right">STATUS</div>
              </div>
              {lessonUnits.map((u) => (
                <div key={u.roman} className="grid grid-cols-[.7fr_2.2fr_1fr_1fr] items-center border-t border-divider px-5 py-3.5">
                  <div className="text-[13px] font-extrabold text-primary">{u.roman}</div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold text-ink">{u.unitTitle}</div>
                    <div className="mt-0.5 text-[12px] leading-[1.5] text-muted">{u.topics}</div>
                  </div>
                  <div className="text-center text-[13px] text-muted">{u.sessionCount}</div>
                  <div className="text-right">
                    <Badge tone={u.status === "Completed" ? "accent" : u.status === "In progress" ? "accentDark" : "neutral"}>
                      {u.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

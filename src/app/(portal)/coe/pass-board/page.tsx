"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, StatCard, Select, Input, Button, Badge } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useExams } from "@/modules/coe/api/exams";
import { useAllScriptBundles } from "@/modules/coe/api/scriptBundles";
import { usePassBoardSheet, useSetGrace, useResetModeration, useAddSignoff, useSignOff, useFreezeSheet, type PassBoardCourse } from "@/modules/coe/api/passBoard";

export default function CoePassBoardPage() {
  const exams = useExams();
  // Results Management's "Analysis" action links here with ?exam_id=... so
  // the board opens already scoped to the course the COE was looking at.
  const searchParams = useSearchParams();
  const examIdFromQuery = Number(searchParams.get("exam_id")) || null;
  const [examId, setExamId] = useState<number | null>(null);

  // Defaulting to the highest-id exam often lands on one with zero real
  // marks entered yet; default instead to whichever exam actually has the
  // most script bundles (and therefore real exam_marks), so the sheet
  // shows real data out of the box.
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
  const effectiveExamId = examId ?? examIdFromQuery ?? busiestExamId ?? [...(exams.data ?? [])].sort((a, b) => b.id - a.id)[0]?.id ?? null;
  const currentExam = (exams.data ?? []).find((e) => e.id === effectiveExamId);

  const board = usePassBoardSheet(effectiveExamId);
  const setGrace = useSetGrace(effectiveExamId);
  const resetModeration = useResetModeration(effectiveExamId);
  const freeze = useFreezeSheet(effectiveExamId);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const addSignoff = useAddSignoff(effectiveExamId);
  const signOff = useSignOff(effectiveExamId);

  const data = board.data;
  const frozen = data?.sheet.status === "frozen";

  const subtitle = data
    ? `${data.exam_title ?? data.exam_type_name ?? "Exam"} · ${data.sheet.phase} — moderation and approval sheet${
        data.sheet.meeting_at ? ` placed before the board on ${new Date(data.sheet.meeting_at).toLocaleDateString()}` : ""
      }. Grace marks apply within a ceiling of ±${data.grace_ceiling}.`
    : "Course-wise moderation sheet placed before the board for grace marks and approval.";

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Pass Board"
        subtitle={subtitle}
        actions={
          <>
            <Select value={effectiveExamId ?? ""} onChange={(e) => setExamId(Number(e.target.value))} className="w-56">
              {[...(exams.data ?? [])].sort((a, b) => b.id - a.id).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.exam_category} · {e.academic_year} · Sem {e.semester}
                </option>
              ))}
            </Select>
            <Button variant="secondary" className="w-auto" disabled={frozen || resetModeration.isPending || !data?.courses_graced_count} onClick={() => resetModeration.mutate()}>
              Reset moderation
            </Button>
            <Button variant="primarySmall" className="w-auto" disabled={frozen || freeze.isPending} onClick={() => freeze.mutate()}>
              {freeze.isPending ? "Freezing…" : frozen ? "Frozen" : "Approve & freeze sheet"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Courses on the sheet" value={data?.courses.length ?? 0} icon="fact_check" sub={data ? `${data.sheet.phase} · ${data.departments_represented.join(", ") || "—"}` : undefined} />
        <StatCard label="Candidates" value={data?.overall_appeared ?? 0} icon="groups" sub="appeared across all courses" />
        <StatCard label="Overall pass" value={`${data?.overall_pass_pct_before ?? 0}%`} icon="trending_up" sub="before any moderation" />
        <StatCard
          label="Courses graced"
          value={data?.courses_graced_count ?? 0}
          icon="edit"
          sub={data?.courses_graced_count ? "moderation applied" : "no moderation applied yet"}
        />
      </div>

      {board.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="border-b border-divider px-5 py-3.5">
            <div className="text-[15px] font-extrabold text-ink">Course-wise moderation</div>
            <p className="mt-0.5 text-[12px] text-muted">Adjust grace marks per course. The board sees the pass percentage before and after moderation, and how many candidates the grace actually moves.</p>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <div className="flex-1">Course</div>
              <div className="w-[80px]">Appeared</div>
              <div className="w-[70px]">Pass %</div>
              <div className="w-[130px]">Grace</div>
              <div className="w-[70px]">After</div>
              <div className="w-[70px]">Moved</div>
              <div className="w-[220px]">Board note</div>
            </div>
            {(data?.courses ?? []).map((c) => (
              <CourseRow key={c.exam_subject_mapping_id} course={c} frozen={frozen} onSave={(grace, note) => setGrace.mutate({ exam_subject_mapping_id: c.exam_subject_mapping_id, grace_marks: grace, board_note: note })} />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-[15px] font-extrabold text-ink">Board sign-off</h2>
        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted">
            <span>Member</span>
            <span>Status</span>
          </div>
          {(data?.signoffs ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between">
              <div>
                <span className="text-[13px] font-bold text-ink">{s.member_name}</span>
                <span className="ml-2 text-[12px] text-muted">{s.member_role}</span>
              </div>
              {s.status === "signed" ? (
                <Badge tone="accentDark">SIGNED</Badge>
              ) : (
                <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" disabled={frozen} onClick={() => signOff.mutate(s.id)}>
                  Sign
                </Button>
              )}
            </div>
          ))}
        </div>
        {!frozen && (
          <div className="mt-4 flex items-center gap-2">
            <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Member name" className="flex-1" />
            <Input value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} placeholder="Role" className="flex-1" />
            <Button
              variant="secondary"
              className="w-auto"
              disabled={!newMemberName.trim() || !newMemberRole.trim() || addSignoff.isPending}
              onClick={() =>
                addSignoff.mutate(
                  { member_name: newMemberName.trim(), member_role: newMemberRole.trim() },
                  { onSuccess: () => { setNewMemberName(""); setNewMemberRole(""); } },
                )
              }
            >
              Add
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function CourseRow({ course: c, frozen, onSave }: { course: PassBoardCourse; frozen: boolean; onSave: (grace: number, note: string | undefined) => void }) {
  const [grace, setGrace] = useState(c.grace_marks);
  const [note, setNote] = useState(c.board_note ?? "");

  function commit(nextGrace: number) {
    setGrace(nextGrace);
    onSave(nextGrace, note || undefined);
  }

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="flex-1">
        <div className="text-[13.5px] font-bold text-ink">
          {c.subject.subject_code} · {c.subject.name}
        </div>
        <div className="text-[11.5px] text-muted">{c.department?.name ?? "—"}</div>
      </div>
      <div className="w-[80px] text-[12.5px] text-ink">{c.appeared}</div>
      <div className="w-[70px] text-[13px] font-bold text-ink">{c.pass_pct_before}%</div>
      <div className="flex w-[130px] items-center gap-1.5">
        <button
          type="button"
          disabled={frozen || grace <= 0}
          className="flex size-7 shrink-0 items-center justify-center rounded-input border border-border-default text-[13px] font-bold text-ink disabled:opacity-40"
          onClick={() => commit(Math.max(0, grace - 1))}
        >
          −
        </button>
        <span className="w-6 text-center text-[13px] font-bold text-ink">{grace}</span>
        <button
          type="button"
          disabled={frozen || grace >= 3}
          className="flex size-7 shrink-0 items-center justify-center rounded-input border border-border-default text-[13px] font-bold text-ink disabled:opacity-40"
          onClick={() => commit(Math.min(3, grace + 1))}
        >
          +
        </button>
      </div>
      <div className="w-[70px] text-[13px] font-bold text-ink">{c.pass_pct_after}%</div>
      <div className="w-[70px] text-[12.5px] text-ink">{c.moved > 0 ? `+${c.moved}` : "—"}</div>
      <div className="w-[220px]">
        <Input
          className="text-[12px]"
          disabled={frozen}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => onSave(grace, note || undefined)}
          placeholder="Board note…"
        />
      </div>
    </div>
  );
}

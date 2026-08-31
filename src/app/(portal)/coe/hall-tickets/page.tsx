"use client";

import { useMemo, useState } from "react";
import { Card, StatCard, SearchBar, Select, Button, Badge, Input, Modal, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useExams } from "@/modules/coe/api/exams";
import { useExamRegistrations } from "@/modules/coe/api/examRegistrations";
import {
  useHallTicketRoster,
  useGenerateHallTicket,
  useMarkHallTicketDownloaded,
  useReportMismatch,
  useHallTicketSchedule,
  type HallTicketRosterRow,
} from "@/modules/coe/api/hallTicketsManagement";
import { downloadCsv } from "@/lib/utils/csv";

type RowStatus = "issued" | "generated" | "withheld" | "not_eligible" | "pending";

const SEMESTER_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;
function yearOfSemester(semester: number | null | undefined): number | null {
  return semester ? Math.ceil(semester / 2) : null;
}
const YEAR_ROMAN = ["I", "II", "III", "IV", "V", "VI"] as const;
function yearLabel(year: number | null): string {
  if (year == null) return "—";
  return `${YEAR_ROMAN[year - 1] ?? year} Year`;
}

function studentName(s: HallTicketRosterRow["student"]): string {
  if (s.soa_applications) return [s.soa_applications.first_name, s.soa_applications.last_name].filter(Boolean).join(" ");
  return s.register_no ?? s.student_id_no;
}

// Once a ticket exists, generation already refused it for a detained student
// (see hall-tickets.service.ts#generate), so a ticket's presence trumps the
// current eligibility snapshot — no need to re-check attendance for it.
function rowStatus(r: HallTicketRosterRow): RowStatus {
  if (r.hall_ticket) return r.hall_ticket.downloaded_at ? "issued" : "generated";
  if (r.attendance_eligibility === "detained") return "not_eligible";
  return r.fee_status !== "paid" ? "withheld" : "pending";
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-subtle">{label}</div>
      <div className="mt-0.5 text-[13px] font-bold text-ink">{value}</div>
    </div>
  );
}

const STATUS_LABEL: Record<RowStatus, string> = { issued: "Issued", generated: "Generated", withheld: "Withheld", not_eligible: "Not eligible", pending: "Pending" };
const STATUS_TONE: Record<RowStatus, BadgeTone> = { issued: "accentDark", generated: "accent", withheld: "danger", not_eligible: "danger", pending: "neutral" };
function examLabel(e: { title: string | null; exam_category: string | null; academic_year: string; semester: number }): string {
  return e.title ?? `${e.exam_category} · ${e.academic_year} · Sem ${e.semester}`;
}

export default function CoeHallTicketsPage() {
  const exams = useExams();
  const [examId, setExamId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RowStatus>("all");
  const [selected, setSelected] = useState<HallTicketRosterRow | null>(null);
  const [mismatchTarget, setMismatchTarget] = useState<HallTicketRosterRow | null>(null);

  // Same reasoning as Exam Registration: default to the exam with the most
  // approved registrations rather than the highest id, so this page shows
  // real tickets/candidates out of the box instead of an empty roster.
  const allRegistrations = useExamRegistrations({});
  const busiestExamId = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of allRegistrations.data ?? []) counts.set(r.exam_id, (counts.get(r.exam_id) ?? 0) + 1);
    let best: number | null = null;
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    return best;
  }, [allRegistrations.data]);
  const effectiveExamId = examId ?? busiestExamId ?? [...(exams.data ?? [])].sort((a, b) => b.id - a.id)[0]?.id ?? null;
  const currentExam = (exams.data ?? []).find((e) => e.id === effectiveExamId) ?? null;
  const roster = useHallTicketRoster(effectiveExamId);
  const generate = useGenerateHallTicket();
  const markDownloaded = useMarkHallTicketDownloaded();

  const allRows = useMemo(() => roster.data ?? [], [roster.data]);
  const rows = useMemo(() => {
    let list = allRows;
    if (statusFilter !== "all") list = list.filter((r) => rowStatus(r) === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => studentName(r.student).toLowerCase().includes(q) || (r.student.register_no ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [allRows, statusFilter, search]);

  const ticketed = allRows.filter((r) => r.hall_ticket).length;
  const downloaded = allRows.filter((r) => r.hall_ticket?.downloaded_at).length;
  // "Withheld" is the one tile for every reason a ticket hasn't issued yet —
  // fee dues or an attendance detention — even though the row list keeps the
  // two reasons labeled separately so COE staff know which to chase.
  const withheld = allRows.filter((r) => rowStatus(r) === "withheld" || rowStatus(r) === "not_eligible").length;
  const mismatches = allRows.filter((r) => r.hall_ticket?.mismatch_reported).length;

  const activeRow = selected ?? rows[0] ?? null;
  const schedule = useHallTicketSchedule(effectiveExamId, activeRow?.student.id ?? null);
  const notGenerated = allRows.filter((r) => !r.hall_ticket && r.fee_status === "paid" && r.attendance_eligibility !== "detained");
  const [bulkGenerating, setBulkGenerating] = useState(false);

  function handleBulkDownload() {
    downloadCsv(
      "hall-tickets",
      [
        { header: "Register no", value: (r: HallTicketRosterRow) => r.student.register_no ?? r.student.student_id_no },
        { header: "Name", value: (r: HallTicketRosterRow) => studentName(r.student) },
        { header: "Department", value: (r: HallTicketRosterRow) => r.student.classes?.departments.code ?? "" },
        { header: "Status", value: (r: HallTicketRosterRow) => STATUS_LABEL[rowStatus(r)] },
        { header: "File", value: (r: HallTicketRosterRow) => r.hall_ticket?.file_url ?? "" },
        { header: "Generated at", value: (r: HallTicketRosterRow) => (r.hall_ticket ? new Date(r.hall_ticket.generated_at).toLocaleString() : "") },
        { header: "Downloaded at", value: (r: HallTicketRosterRow) => (r.hall_ticket?.downloaded_at ? new Date(r.hall_ticket.downloaded_at).toLocaleString() : "") },
      ],
      allRows.filter((r) => r.hall_ticket),
    );
  }

  async function handleBulkGenerate() {
    if (!effectiveExamId || notGenerated.length === 0) return;
    setBulkGenerating(true);
    try {
      for (const row of notGenerated) {
        try {
          await generate.mutateAsync({ examId: effectiveExamId, studentId: row.student.id });
        } catch {
          // A real per-student failure (e.g. a concurrent generation) shouldn't stop the rest of the batch.
        }
      }
    } finally {
      setBulkGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Hall Ticket Management"
        subtitle={`Generation, eligibility check, preview, download and print${currentExam ? ` for ${examLabel(currentExam)}` : ""}.`}
        actions={
          <>
            <Select value={effectiveExamId ?? ""} onChange={(e) => setExamId(Number(e.target.value))} className="w-56">
              {[...(exams.data ?? [])].sort((a, b) => b.id - a.id).map((e) => (
                <option key={e.id} value={e.id}>
                  {examLabel(e)}
                </option>
              ))}
            </Select>
            <Button variant="secondary" className="w-auto" disabled={ticketed === 0} onClick={handleBulkDownload}>
              Bulk download
            </Button>
            <Button variant="primarySmall" className="w-auto" disabled={notGenerated.length === 0 || bulkGenerating} onClick={handleBulkGenerate}>
              {bulkGenerating ? "Generating…" : `Generate tickets${notGenerated.length ? ` (${notGenerated.length})` : ""}`}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Hall tickets issued"
          value={ticketed}
          icon="badge"
          sub={allRows.length > 0 ? `${Math.round((ticketed / allRows.length) * 100)}% of registered` : undefined}
        />
        <StatCard label="Withheld" value={withheld} icon="block" sub="fee dues and attendance" />
        <StatCard label="Downloaded" value={downloaded} icon="download" sub={ticketed > 0 ? `${Math.round((downloaded / ticketed) * 100)}% of issued` : undefined} />
        <StatCard label="Mismatch reports" value={mismatches} icon="report" sub="photo and name errors" />
      </div>

      <div className="grid grid-cols-[1fr_1.4fr] gap-4 items-start">
        <Card className="p-0">
          <div className="flex items-center gap-3 border-b border-divider p-4">
            <SearchBar placeholder="Search roll number or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-none flex-1" />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="w-auto min-w-[130px]">
              <option value="all">All students</option>
              <option value="issued">Issued</option>
              <option value="generated">Generated</option>
              <option value="withheld">Withheld</option>
              <option value="pending">Pending</option>
            </Select>
          </div>
          {roster.isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={5} />
            </div>
          ) : rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No approved registrations for this exam yet.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Student</div>
                <div className="w-[100px] text-right">Ticket status</div>
              </div>
              {rows.map((r) => (
                <button
                  key={r.student.id}
                  type="button"
                  onClick={() => setSelected(r)}
                  className={`flex items-center justify-between gap-3 border-b border-divider px-5 py-3.5 text-left last:border-0 ${activeRow?.student.id === r.student.id ? "bg-accent-50" : "hover:bg-surface-tint"}`}
                >
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-ink">{studentName(r.student)}</div>
                    <div className="text-[11.5px] text-muted">
                      {r.student.register_no ?? r.student.student_id_no} · {r.student.classes?.departments.code ?? "—"} ·{" "}
                      {yearLabel(yearOfSemester(r.student.classes?.current_semester))}
                    </div>
                  </div>
                  <div className="w-[100px] text-right">
                    <Badge tone={r.hall_ticket?.mismatch_reported ? "danger" : STATUS_TONE[rowStatus(r)]}>
                      {r.hall_ticket?.mismatch_reported ? "NOT ELIGIBLE" : STATUS_LABEL[rowStatus(r)].toUpperCase()}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          {!activeRow ? (
            <p className="text-[13px] text-subtle">Select a student to preview their hall ticket.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-extrabold text-ink">Hall ticket preview</span>
                {activeRow.hall_ticket && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="w-auto px-3 py-1.5 text-[12px]"
                      onClick={() => {
                        const t = activeRow.hall_ticket!;
                        const blob = new Blob(
                          [
                            `Hall Ticket\nCandidate: ${studentName(activeRow.student)}\nRegister number: ${activeRow.student.register_no ?? activeRow.student.student_id_no}\nDepartment: ${activeRow.student.classes?.departments.name ?? "—"}\nSemester: ${activeRow.student.classes?.current_semester ?? "—"}\nTicket file: ${t.file_url}\nGenerated: ${new Date(t.generated_at).toLocaleString()}\n`,
                          ],
                          { type: "text/plain;charset=utf-8" },
                        );
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `hall-ticket-${activeRow.student.register_no ?? activeRow.student.student_id_no}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        if (effectiveExamId) markDownloaded.mutate({ examId: effectiveExamId, studentId: activeRow.student.id });
                      }}
                    >
                      Download
                    </Button>
                    <Button variant="primarySmall" className="w-auto px-3 py-1.5 text-[12px]" onClick={() => window.print()}>
                      Print
                    </Button>
                  </div>
                )}
              </div>
              {!activeRow.hall_ticket && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-extrabold text-ink">{studentName(activeRow.student)}</div>
                    <div className="text-[12px] text-muted">
                      {activeRow.student.register_no ?? activeRow.student.student_id_no} · {activeRow.student.classes?.departments.name ?? "—"} · Sem{" "}
                      {activeRow.student.classes?.current_semester ?? "—"}
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[rowStatus(activeRow)]}>{STATUS_LABEL[rowStatus(activeRow)].toUpperCase()}</Badge>
                </div>
              )}
              {activeRow.hall_ticket ? (
                <>
                  <div className="rounded-input border border-border-default p-4">
                    <div className="flex items-center justify-between border-b border-divider pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[13px] font-extrabold text-primary">SE</div>
                        <div>
                          <div className="text-[14px] font-extrabold text-ink">Sri Eshwar College of Engineering</div>
                          <div className="text-[11.5px] text-muted">Autonomous · Hall ticket · {currentExam ? examLabel(currentExam) : "—"}</div>
                        </div>
                      </div>
                      <Badge tone={activeRow.hall_ticket.mismatch_reported ? "danger" : STATUS_TONE[rowStatus(activeRow)]}>
                        {activeRow.hall_ticket.mismatch_reported ? "NOT ELIGIBLE" : STATUS_LABEL[rowStatus(activeRow)].toUpperCase()}
                      </Badge>
                    </div>

                    <div className="mt-4 flex gap-4">
                      <div className="flex h-[112px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-input border border-dashed border-border-default bg-surface-subtle text-center text-[11.5px] text-subtle">
                        {activeRow.student.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={activeRow.student.photo_url} alt={studentName(activeRow.student)} className="size-full object-cover" />
                        ) : (
                          "Student photograph"
                        )}
                      </div>
                      <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3">
                        <DetailField label="Candidate" value={studentName(activeRow.student)} />
                        <DetailField label="Register number" value={activeRow.student.register_no ?? activeRow.student.student_id_no} />
                        <DetailField label="Programme" value={activeRow.student.classes?.courses?.name ?? activeRow.student.classes?.departments.name ?? "—"} />
                        <DetailField
                          label="Semester"
                          value={
                            activeRow.student.classes?.current_semester
                              ? `Semester ${SEMESTER_ROMAN[activeRow.student.classes.current_semester - 1] ?? activeRow.student.classes.current_semester}${activeRow.regulation_code ? ` · ${activeRow.regulation_code}` : ""}`
                              : "—"
                          }
                        />
                        <DetailField label="Examination" value={currentExam ? examLabel(currentExam) : "—"} />
                        <DetailField label="Courses registered" value={schedule.data ? String(schedule.data.length) : "…"} />
                        <DetailField
                          label="Eligibility"
                          value={
                            activeRow.attendance_eligibility === "detained"
                              ? "Detained (attendance)"
                              : activeRow.fee_status !== "paid"
                                ? "Fee pending"
                                : activeRow.attendance_eligibility === "pending"
                                  ? "Condonation pending"
                                  : "Cleared"
                          }
                        />
                        <DetailField
                          label="Ticket number"
                          value={`HT-${currentExam?.academic_year.slice(0, 4) ?? "----"}-${activeRow.student.register_no ?? activeRow.student.student_id_no}`}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col overflow-hidden rounded-input border border-border-default">
                      <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-3 py-2 text-[10.5px] font-bold uppercase tracking-wide text-muted">
                        <div className="w-[80px]">Date</div>
                        <div className="w-[60px]">Session</div>
                        <div className="flex-1">Course</div>
                        <div className="w-[100px]">Hall</div>
                        <div className="w-[60px]">Seat</div>
                      </div>
                      {schedule.isLoading ? (
                        <div className="px-3 py-4 text-[12px] text-subtle">Loading schedule…</div>
                      ) : (schedule.data ?? []).length === 0 ? (
                        <div className="px-3 py-4 text-[12px] text-subtle">No timetable published for this student&apos;s courses yet.</div>
                      ) : (
                        schedule.data!.map((s, i) => (
                          <div key={i} className="flex items-center gap-4 border-b border-divider px-3 py-2.5 text-[12px] text-ink last:border-0">
                            <div className="w-[80px]">{new Date(s.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                            <div className="w-[60px]">{s.session}</div>
                            <div className="flex-1">
                              {s.subject_code} · {s.subject_name}
                            </div>
                            <div className="w-[100px]">{s.hall ?? "—"}</div>
                            <div className="w-[60px]">{s.seat ?? "—"}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-6">
                      <p className="max-w-[420px] text-[11.5px] leading-relaxed text-subtle">
                        Candidates must carry this hall ticket and the college identity card to every session. Entry closes 30 minutes after the start of the examination.
                      </p>
                      <div className="w-[160px] shrink-0 border-t border-divider pt-1.5 text-center text-[11px] text-subtle">Controller of Examinations</div>
                    </div>
                  </div>
                  {activeRow.hall_ticket.mismatch_reported && (
                    <p className="text-[12px] text-danger-fg">Not eligible — reason: {activeRow.hall_ticket.mismatch_note}</p>
                  )}
                  {!activeRow.hall_ticket.mismatch_reported && (
                    <Button variant="secondary" className="w-auto" onClick={() => setMismatchTarget(activeRow)}>
                      Report mismatch
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[12.5px] text-subtle">
                    {activeRow.attendance_eligibility === "detained"
                      ? "Not eligible — detained for attendance shortfall."
                      : activeRow.fee_status !== "paid"
                        ? "Withheld — fee not fully paid."
                        : "Registered and eligible, ticket not generated yet."}
                  </p>
                  <Button
                    variant="primarySmall"
                    className="w-auto"
                    disabled={generate.isPending || !effectiveExamId || activeRow.attendance_eligibility === "detained"}
                    onClick={() => effectiveExamId && generate.mutate({ examId: effectiveExamId, studentId: activeRow.student.id })}
                  >
                    {generate.isPending ? "Generating…" : "Generate hall ticket"}
                  </Button>
                  {generate.isError && <p className="text-[12px] text-danger-fg">{(generate.error as Error).message}</p>}
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      <MismatchModal row={mismatchTarget} examId={effectiveExamId} onClose={() => setMismatchTarget(null)} />
    </div>
  );
}

function MismatchModal({ row, examId, onClose }: { row: HallTicketRosterRow | null; examId: number | null; onClose: () => void }) {
  const report = useReportMismatch();
  const [note, setNote] = useState("");

  function handleClose() {
    setNote("");
    report.reset();
    onClose();
  }

  return (
    <Modal open={row != null} onClose={handleClose} title="Report mismatch" subtitle={row ? `${studentName(row.student)} — photo or name discrepancy` : undefined}>
      <div className="flex flex-col gap-4">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Describe the mismatch…" />
        {report.isError && <p className="text-[12px] text-danger-fg">{(report.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primarySmall"
            disabled={!note.trim() || report.isPending || !row || !examId}
            onClick={() => row && examId && report.mutate({ examId, studentId: row.student.id, note: note.trim() }, { onSuccess: handleClose })}
          >
            {report.isPending ? "Reporting…" : "Report"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

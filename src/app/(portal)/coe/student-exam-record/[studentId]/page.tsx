"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Input, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useLookupStudentByRegisterNo, isNotFound } from "@/modules/coe/api/malpractice";
import { useStudentExamRecord } from "@/modules/coe/api/studentExamRecord";

const ELIGIBILITY_TONE: Record<string, BadgeTone> = { eligible: "accentDark", condonation: "accent", detained: "danger" };
const ELIGIBILITY_LABEL: Record<string, string> = { eligible: "Eligible", condonation: "Condonation", detained: "Detained" };
// Real certificate_request_status_enum values only — "blocked"/"rejected" don't exist in the schema.
const CERT_TONE: Record<string, BadgeTone> = { pending: "accent", ready_to_print: "accent", printed: "accentDark", issued: "accentDark" };
const CERT_LABEL: Record<string, string> = { pending: "Pending", ready_to_print: "Ready to print", printed: "Printed", issued: "Issued" };
const SEMESTER_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;

export default function CoeStudentExamRecordProfilePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId: studentIdParam } = use(params);
  const studentId = Number(studentIdParam);
  const router = useRouter();
  const record = useStudentExamRecord(studentId);
  const lookup = useLookupStudentByRegisterNo();
  const [searchValue, setSearchValue] = useState("");

  function handleSearch() {
    if (!searchValue.trim()) return;
    lookup.mutate(searchValue.trim(), { onSuccess: (s) => router.push(`/coe/student-exam-record/${s.id}`) });
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Student Exam Record"
        subtitle="Everything the examination section holds on one candidate — registrations, eligibility, marks, arrears, dues and certificates."
        backHref="/coe/student-exam-record"
        actions={
          <>
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Roll number or name…"
              className="w-56"
            />
            <Button variant="secondary" className="w-auto" onClick={() => window.print()}>
              Print record
            </Button>
          </>
        }
      />
      {lookup.isError && <p className="text-[12px] text-danger-fg">{isNotFound(lookup.error) ? "No student found." : (lookup.error as Error).message}</p>}

      {record.isLoading ? (
        <SkeletonTable rows={8} />
      ) : !record.data ? (
        <Card>
          <p className="text-[13px] text-subtle">Student not found.</p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[20px] font-extrabold text-primary">
                  {(record.data.student.name ?? record.data.student.register_no).slice(0, 1).toUpperCase()}
                  {(record.data.student.name ?? "").split(" ")[1]?.slice(0, 1).toUpperCase() ?? ""}
                </div>
                <div>
                  <div className="text-[18px] font-extrabold text-ink">{record.data.student.name ?? record.data.student.register_no}</div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    {record.data.student.register_no} · {record.data.student.programme ?? record.data.student.department?.name ?? "—"}
                    {record.data.student.year ? ` · ${["I", "II", "III", "IV"][record.data.student.year - 1] ?? record.data.student.year} Year` : ""}
                    {record.data.student.semester ? ` · Semester ${SEMESTER_ROMAN[record.data.student.semester - 1] ?? record.data.student.semester}` : ""}
                    {record.data.student.regulation_code ? ` · Regulation ${record.data.student.regulation_code}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-8">
                <Stat label="CGPA" value={record.data.stats.cgpa != null ? record.data.stats.cgpa.toFixed(2) : "—"} />
                <Stat label="Credits earned" value={`${record.data.stats.credits_earned} / ${record.data.stats.credits_total}`} />
                <Stat label="Arrears" value={String(record.data.stats.arrears_count)} danger={record.data.stats.arrears_count > 0} />
                <Stat label="Attendance" value={record.data.stats.attendance_pct != null ? `${record.data.stats.attendance_pct}%` : "—"} />
                {record.data.stats.attendance_hold && <Badge tone="accent">Hold</Badge>}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-[1.6fr_1fr] gap-4 items-start">
            <Card className="p-0">
              <div className="border-b border-divider px-5 py-3.5">
                <span className="text-[15px] font-extrabold text-ink">
                  Current registration{record.data.currentRegistration ? ` — ${record.data.currentRegistration.exam_label}` : ""}
                </span>
              </div>
              {!record.data.currentRegistration || record.data.currentRegistration.courses.length === 0 ? (
                <p className="px-5 py-6 text-[13px] text-subtle">No current registration found for this student.</p>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                    <div className="flex-1">Course</div>
                    <div className="w-[100px]">Attendance</div>
                    <div className="w-[90px]">Internal</div>
                    <div className="w-[120px]">Eligibility</div>
                  </div>
                  {record.data.currentRegistration.courses.map((c) => (
                    <div key={c.subject_code} className="flex items-center gap-4 border-b border-divider px-5 py-3 last:border-0">
                      <div className="flex-1">
                        <div className="text-[13px] font-bold text-ink">{c.subject_code}</div>
                        <div className="text-[11.5px] text-muted">{c.subject_name}</div>
                      </div>
                      <div className="w-[100px] text-[12.5px] text-ink">{c.attendance_pct != null ? `${c.attendance_pct}%` : "—"}</div>
                      <div className="w-[90px] text-[12.5px] text-ink">{c.internal_marks != null ? `${c.internal_marks} / ${c.internal_max}` : "—"}</div>
                      <div className="w-[120px]">
                        <Badge tone={ELIGIBILITY_TONE[c.eligibility]}>{ELIGIBILITY_LABEL[c.eligibility].toUpperCase()}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-divider px-5 py-4">
                <div className="mb-3 text-[15px] font-extrabold text-ink">Semester history</div>
                {record.data.semesterHistory.length === 0 ? (
                  <p className="text-[13px] text-subtle">No completed semesters with computed grades yet.</p>
                ) : (
                  <div className="flex items-end gap-4">
                    {record.data.semesterHistory.map((s) => (
                      <div key={s.semester} className="flex flex-col items-center gap-1.5">
                        <span className="text-[12.5px] font-bold text-ink">{s.gpa != null ? s.gpa.toFixed(2) : "—"}</span>
                        <div
                          className="w-12 rounded-t-[6px] bg-primary"
                          style={{ height: `${Math.max(8, ((s.gpa ?? 0) / 10) * 100)}px` }}
                        />
                        <span className="text-[11px] text-muted">Sem {s.semester}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <div className="flex flex-col gap-4">
              <Card>
                <div className="text-[15px] font-extrabold text-ink">Standing arrears</div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {record.data.standingArrears.length === 0 ? (
                    <p className="text-[12.5px] text-subtle">No standing arrears.</p>
                  ) : (
                    record.data.standingArrears.map((a) => (
                      <div key={a.subject_code} className="flex items-center justify-between gap-3 rounded-input border border-danger-border bg-danger-bg px-3 py-2.5">
                        <div>
                          <div className="text-[13px] font-bold text-ink">
                            {a.subject_code} · {a.subject_name}
                          </div>
                          <div className="text-[11.5px] text-muted">{a.standing_since ? `Standing since ${a.standing_since}` : "Standing since —"}</div>
                        </div>
                        <span className="shrink-0 text-[12px] font-bold text-danger-fg">{a.attempts} attempt{a.attempts === 1 ? "" : "s"}</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card>
                <div className="text-[15px] font-extrabold text-ink">Fees &amp; dues</div>
                <div className="mt-3 flex flex-col gap-2">
                  {record.data.feesAndDues.length === 0 ? (
                    <p className="text-[12.5px] text-subtle">No fee records found.</p>
                  ) : (
                    record.data.feesAndDues.map((f, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-divider py-2 text-[12.5px] last:border-0">
                        <span className="text-ink">{f.label}</span>
                        <span className={f.status === "paid" ? "font-bold text-primary-dark" : "font-bold text-danger-fg"}>
                          ₹{f.amount.toLocaleString("en-IN")} {f.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card>
                <div className="text-[15px] font-extrabold text-ink">Certificates &amp; requests</div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {record.data.certificates.length === 0 ? (
                    <p className="text-[12.5px] text-subtle">No certificate requests found.</p>
                  ) : (
                    record.data.certificates.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[13px] font-bold text-ink">{c.type_name}</div>
                          <div className="text-[11.5px] text-muted">{c.issued_at ? `Issued ${c.issued_at}` : `Requested ${c.requested_at}`}</div>
                        </div>
                        <Badge tone={CERT_TONE[c.status] ?? "neutral"}>{(CERT_LABEL[c.status] ?? c.status).toUpperCase()}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-0.5 text-[20px] font-extrabold ${danger ? "text-danger-fg" : "text-ink"}`}>{value}</div>
    </div>
  );
}

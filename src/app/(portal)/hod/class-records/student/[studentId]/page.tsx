"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Badge, Button, EmptyState, Input, Textarea, ProfilePhoto, SkeletonBlock } from "@/components/ui";
import { useHodStudentProfile, useHodMeetingNotes, useAddHodMeetingNote } from "@/modules/hod/api/studentProfile";
import { formatDisplayDate } from "@/lib/utils/date";
import { SubjectMarksTable } from "@/modules/shared/marks/SubjectMarksTable";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-divider py-3.5 first:border-t-0">
      <span className="text-[14px] text-muted">{label}</span>
      <span className="text-[14.5px] font-bold text-ink">{value}</span>
    </div>
  );
}

function feeStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function placementLabel(status: string): string {
  if (status === "placed") return "Placed";
  if (status === "in_process") return "In process";
  return "Unplaced";
}

function addressLine(a: {
  address_line: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
}): string {
  return [a.address_line, a.city, a.district, a.state, a.pincode].filter(Boolean).join(", ") || "—";
}

function MeetingNotesCard({ studentId }: { studentId: number }) {
  const notes = useHodMeetingNotes(studentId);
  const addNote = useAddHodMeetingNote(studentId);
  const [meetingDate, setMeetingDate] = useState("");
  const [note, setNote] = useState("");

  async function submit() {
    if (!meetingDate || !note.trim()) return;
    await addNote.mutateAsync({ meeting_date: meetingDate, note: note.trim() });
    setMeetingDate("");
    setNote("");
  }

  return (
    <Card>
      <h2 className="text-[17px] font-extrabold text-ink">Parent-teacher meeting notes</h2>

      {notes.isError && (
        <div className="mt-3 rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load meeting notes — please try again.
        </div>
      )}
      {notes.isLoading ? (
        <div className="mt-3 text-[13px] text-muted">Loading…</div>
      ) : notes.isError ? null : !notes.data || notes.data.length === 0 ? (
        <div className="mt-3">
          <EmptyState message="No meeting notes recorded yet." />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          {notes.data.map((n) => (
            <div key={n.id} className="hod-hover-row rounded-[8px] border border-border-default p-3.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] font-bold text-ink">{formatDisplayDate(n.meeting_date)}</span>
                {n.recorded_by && <span className="text-[11.5px] text-subtle">Recorded by {n.recorded_by}</span>}
              </div>
              <p className="mt-1.5 text-[13.5px] text-body">{n.note}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-divider pt-4">
        <div className="grid grid-cols-[160px_1fr] gap-3">
          <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note from today's meeting with the parent/guardian…"
          />
        </div>
        <Button
          variant="primarySmall"
          className="mt-3"
          onClick={submit}
          disabled={!meetingDate || !note.trim()}
          loading={addNote.isPending}
        >
          Add note
        </Button>
      </div>
    </Card>
  );
}

export default function HodStudentProfilePage() {
  const params = useParams<{ studentId: string }>();
  const studentId = Number(params.studentId);
  const router = useRouter();
  const profile = useHodStudentProfile(studentId);

  if (profile.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }
  if (profile.isError) {
    return (
      <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
        Couldn&apos;t load this student&apos;s profile — please try again.
      </div>
    );
  }
  if (!profile.data) {
    return (
      <Card>
        <EmptyState message="Student not found." />
      </Card>
    );
  }

  const {
    student,
    stats,
    advisor,
    mentor,
    addresses,
    family,
    guardian,
    entrance_cutoff,
    certificates,
    semester_wise_gpa,
    monthly_attendance,
    fees,
    placement_status,
  } = profile.data;

  const guardianEmail = guardian?.relation === "father" ? family?.father?.email : family?.mother?.email;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Button variant="secondary" className="shrink-0" onClick={() => router.push("/hod/class-records")}>
            ← Back to students
          </Button>
          <div>
            <h1 className="text-[21px] font-extrabold text-ink">{student.name ?? student.student_id_no}</h1>
            <p className="font-mono text-[13px] text-subtle">
              {student.student_id_no} · {student.department_code} · Semester {student.semester ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <Button variant="secondary" onClick={() => window.print()}>
            Print profile
          </Button>
          {guardian && (
            <a href={guardianEmail ? `mailto:${guardianEmail}` : guardian.mobile ? `tel:${guardian.mobile}` : undefined}>
              <Button variant="primarySmall">Contact guardian</Button>
            </a>
          )}
        </div>
      </div>

      <Card>
        <div className="flex items-start gap-5">
          <ProfilePhoto
            imageUrl={student.photo_url}
            alt={student.name ?? student.student_id_no}
            label="student photo"
            caption="35 x 45 mm"
            className="h-[230px] w-[180px] shrink-0 text-[12px]"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-[32px] font-extrabold tracking-[-.02em] text-ink">{student.name ?? student.student_id_no}</h2>
            <p className="mt-1.5 text-[15.5px] text-muted">
              {student.department_name} · Semester {student.semester ?? "—"} · Section {student.section ?? "—"}
              {student.batch_label ? ` · Batch ${student.batch_label}` : ""}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {student.register_no && <Badge tone="neutral">Reg {student.register_no}</Badge>}
              {student.roll_no && <Badge tone="neutral">Roll {student.roll_no}</Badge>}
              {student.residence && (
                <Badge tone="neutral">{student.residence.type === "day_scholar" ? "Day scholar" : "Hosteller"}</Badge>
              )}
              <Badge tone={fees.status === "paid" ? "accent" : "danger"}>Fees: {feeStatusLabel(fees.status)}</Badge>
              <Badge tone={placement_status === "placed" ? "accent" : "neutral"}>{placementLabel(placement_status)}</Badge>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-4">
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-muted">Attendance</div>
                <div className="mt-1.5 text-[32px] font-extrabold text-ink">
                  {stats.attendance_percent != null ? `${stats.attendance_percent}%` : "—"}
                </div>
                {stats.attendance_percent != null && (
                  <div className="mt-2 h-[6px] overflow-hidden rounded-[4px] bg-surface-tint">
                    <div className="h-full rounded-[4px] bg-primary" style={{ width: `${stats.attendance_percent}%` }} />
                  </div>
                )}
              </div>
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-muted">CGPA</div>
                <div className="mt-1.5 text-[32px] font-extrabold text-ink">{stats.cgpa ?? "—"}</div>
              </div>
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-muted">Percentage (CGPA × 9.5)</div>
                <div className="mt-1.5 text-[32px] font-extrabold text-ink">
                  {stats.percentage != null ? `${stats.percentage}%` : "—"}
                </div>
              </div>
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-muted">Arrears</div>
                <div className="mt-1.5 text-[32px] font-extrabold text-ink">{stats.arrears}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">Personal details</h2>
          <div className="mt-3">
            <Row label="Date of birth" value={student.date_of_birth ? formatDisplayDate(student.date_of_birth) : "—"} />
            <Row label="Gender" value={student.gender ?? "—"} />
            <Row label="Blood group" value={student.blood_group ?? "—"} />
            <Row label="Mother tongue" value={student.mother_tongue ?? "—"} />
            <Row label="Community" value={student.community ?? "—"} />
            <Row label="Admission quota" value={student.quota_name ?? "—"} />
            <Row label="Date of admission" value={student.admission_date ? formatDisplayDate(student.admission_date) : "—"} />
            <Row label="Admission number" value={student.admission_no ?? "—"} />
            <Row label="Personal email" value={student.personal_email ?? "—"} />
            <Row label="Aadhaar number" value={student.aadhaar_masked ?? "—"} />
            <Row label="Passport number" value={student.passport_number ?? "—"} />
            <Row
              label="Passport valid until"
              value={student.passport_valid_until ? formatDisplayDate(student.passport_valid_until) : "—"}
            />
          </div>
        </Card>

        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">Contact, mentor &amp; residence</h2>
          <div className="mt-3">
            <Row label="Student mobile" value={student.mobile ?? "—"} />
            <Row label="Institute email" value={student.institute_email} />
            <Row label="Address" value={addresses.permanent ? addressLine(addresses.permanent) : "—"} />
            <Row label="Class advisor" value={advisor ? `${advisor.name} · ${advisor.designation}` : "—"} />
            <Row label="Faculty mentor" value={mentor ? `${mentor.name} · ${mentor.designation}` : "—"} />
            <Row
              label="Residence"
              value={student.residence ? (student.residence.mode ? `Day scholar · ${student.residence.mode}` : "Hosteller") : "—"}
            />
          </div>
        </Card>

        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">Academic details</h2>
          <div className="mt-3">
            <Row label="Department" value={student.department_name ?? "—"} />
            <Row label="Programme" value={student.programme ?? "—"} />
            <Row label="Batch" value={student.batch_label ?? "—"} />
            <Row
              label="Year · semester · section"
              value={
                student.year_label && student.semester != null
                  ? `${student.year_label} Year · Semester ${student.semester} · Section ${student.section}`
                  : "—"
              }
            />
            <Row label="Admission type" value={student.admission_type ?? "—"} />
            <Row
              label="Current CGPA · percentage"
              value={stats.cgpa != null ? `${stats.cgpa} · ${stats.percentage}%` : "—"}
            />
            <Row label="Arrears / backlogs" value={stats.arrears > 0 ? `${stats.arrears} pending` : "None"} />
          </div>
        </Card>

        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">Address details</h2>
          <div className="mt-3">
            <Row label="Permanent address" value={addresses.permanent ? addressLine(addresses.permanent) : "—"} />
            <Row
              label="Communication address"
              value={
                addresses.communication
                  ? addressLine(addresses.communication)
                  : addresses.permanent
                    ? "Same as permanent"
                    : "—"
              }
            />
            <Row label="City" value={addresses.permanent?.city ?? "—"} />
            <Row label="District" value={addresses.permanent?.district ?? "—"} />
            <Row label="State" value={addresses.permanent?.state ?? "—"} />
            <Row label="Pincode" value={addresses.permanent?.pincode ?? "—"} />
          </div>
        </Card>
      </div>

      {family && (family.father || family.mother) && (
        <Card>
          <h2 className="text-[17px] font-extrabold text-ink">Parents, guardian &amp; photographs</h2>
          <div className="mt-3 grid grid-cols-2 gap-4">
            {family.father && (
              <div className="flex gap-3 rounded-[11px] border border-transparent bg-surface-tint p-4">
                <ProfilePhoto
                  imageUrl={family.father.photo_url}
                  alt={family.father.name}
                  label="father photo"
                  className="h-[64px] w-[64px] shrink-0 border-none bg-surface text-[10.5px]"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Father</div>
                  <div className="mt-1 text-[17px] font-extrabold text-ink">{family.father.name}</div>
                  <div className="text-[13px] text-muted">{family.father.occupation ?? "—"}</div>
                  <div className="mt-2 text-[13px] font-bold text-ink">{family.father.mobile ?? "—"}</div>
                  <div className="text-[12.5px] text-subtle">{family.father.email ?? ""}</div>
                  {family.father.annual_income != null && (
                    <div className="mt-1 text-[12px] text-subtle">
                      Annual income · ₹{family.father.annual_income.toLocaleString("en-IN")} per annum
                    </div>
                  )}
                  {guardian?.relation === "father" && (
                    <Badge tone="accent" className="mt-2">
                      Primary guardian
                    </Badge>
                  )}
                </div>
              </div>
            )}
            {family.mother && (
              <div className="flex gap-3 rounded-[11px] border border-transparent bg-surface-tint p-4">
                <ProfilePhoto
                  imageUrl={family.mother.photo_url}
                  alt={family.mother.name}
                  label="mother photo"
                  className="h-[64px] w-[64px] shrink-0 border-none bg-surface text-[10.5px]"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Mother</div>
                  <div className="mt-1 text-[17px] font-extrabold text-ink">{family.mother.name}</div>
                  <div className="text-[13px] text-muted">{family.mother.occupation ?? "—"}</div>
                  <div className="mt-2 text-[13px] font-bold text-ink">{family.mother.mobile ?? "—"}</div>
                  <div className="text-[12.5px] text-subtle">{family.mother.email ?? ""}</div>
                  {family.mother.annual_income != null && (
                    <div className="mt-1 text-[12px] text-subtle">
                      Annual income · ₹{family.mother.annual_income.toLocaleString("en-IN")} per annum
                    </div>
                  )}
                  {guardian?.relation === "mother" && (
                    <Badge tone="accent" className="mt-2">
                      Primary guardian
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {guardian && (
            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-divider pt-4">
              <div>
                <div className="text-[12.5px] text-muted">Guardian</div>
                <div className="mt-0.5 text-[13.5px] font-bold text-ink">Same as {guardian.relation}</div>
              </div>
              <div>
                <div className="text-[12.5px] text-muted">Guardian mobile</div>
                <div className="mt-0.5 text-[13.5px] font-bold text-ink">{guardian.mobile ?? "—"}</div>
              </div>
              <div>
                <div className="text-[12.5px] text-muted">Guardian email</div>
                <div className="mt-0.5 text-[13.5px] font-bold text-ink">{guardian.email ?? "—"}</div>
              </div>
            </div>
          )}
        </Card>
      )}

      {entrance_cutoff && (
        <Card>
          <h2 className="text-[17px] font-extrabold text-ink">Entrance cutoff</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">As recorded at admission</p>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div className="rounded-[11px] border border-border-default p-4">
              <div className="text-[12.5px] text-muted">Physics</div>
              <div className="mt-1.5 text-[22px] font-extrabold text-ink">{entrance_cutoff.physics ?? "—"}</div>
            </div>
            <div className="rounded-[11px] border border-border-default p-4">
              <div className="text-[12.5px] text-muted">Chemistry</div>
              <div className="mt-1.5 text-[22px] font-extrabold text-ink">{entrance_cutoff.chemistry ?? "—"}</div>
            </div>
            <div className="rounded-[11px] border border-border-default p-4">
              <div className="text-[12.5px] text-muted">Maths</div>
              <div className="mt-1.5 text-[22px] font-extrabold text-ink">{entrance_cutoff.maths ?? "—"}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <h2 className="text-[17px] font-extrabold text-ink">Semester-wise GPA</h2>
          {semester_wise_gpa.length === 0 ? (
            <EmptyState message="No graded semesters yet." />
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              {semester_wise_gpa.map((s) => (
                <div key={s.semester} className="hod-hover-row flex items-center gap-3 rounded-[8px] px-1 py-1">
                  <span className="w-[52px] text-[13px] font-bold text-ink">Sem {s.semester}</span>
                  <span className="w-[40px] text-[13.5px] font-extrabold text-ink">{s.gpa ?? "—"}</span>
                  <div className="h-[6px] flex-1 overflow-hidden rounded-[4px] bg-surface-tint">
                    <div className="h-full rounded-[4px] bg-primary" style={{ width: `${((s.gpa ?? 0) / 10) * 100}%` }} />
                  </div>
                  <span className="w-[80px] text-right text-[12px] text-subtle">{s.credits_earned} credits</span>
                  <span className="w-[70px] text-right text-[12px] font-semibold text-ink">
                    {s.arrears > 0 ? `${s.arrears} arrear${s.arrears === 1 ? "" : "s"}` : "All clear"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">Monthly attendance</h2>
          {monthly_attendance.length === 0 ? (
            <EmptyState message="No attendance recorded yet." />
          ) : (
            <div className="mt-4 flex items-end gap-3">
              {monthly_attendance.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[11.5px] font-bold text-ink">{m.percent}%</span>
                  <div
                    className="w-full rounded-[6px] bg-[#8b93f0]"
                    style={{ height: `${Math.max(6, m.percent)}px` }}
                  />
                  <span className="text-[11px] text-subtle">{m.month}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-0">
        <div className="border-b border-divider px-5 py-4">
          <h2 className="text-[17px] font-extrabold text-ink">Examinations & results</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">CIA1, CIA2, Quiz and Internal marks per subject; End Sem shows a grade once published</p>
        </div>
        <div className="p-5">
          <SubjectMarksTable studentId={studentId} />
        </div>
      </Card>

      {certificates.length > 0 && (
        <Card>
          <h2 className="text-[17px] font-extrabold text-ink">Certificates &amp; achievements</h2>
          <div className="mt-3 flex flex-col gap-2">
            {certificates.map((c) => (
              <div key={c.id} className="flex items-center gap-2.5">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-[13.5px] text-ink">{c.name}</span>
                {c.verified && <Badge tone="accent">Verified</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <MeetingNotesCard studentId={studentId} />
    </div>
  );
}

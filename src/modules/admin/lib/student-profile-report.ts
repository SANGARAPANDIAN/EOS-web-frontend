import { apiClient } from "@/lib/api/client";
import type { CertificateType } from "@/modules/admin/api/admissions";
import type {
  ClassMentor,
  StudentAnnouncement,
  StudentAttendanceSummary,
  StudentAttendanceTerm,
  StudentBorrowRecord,
  StudentCertificate,
  StudentExamMark,
  StudentFamily,
  StudentFeeWorkspace,
  StudentHostelResident,
  StudentListItem,
  StudentLifecycle,
  StudentMedicalVisit,
  StudentPlacementHistoryItem,
  StudentProfileDetails,
  StudentProjectsResponse,
  StudentRequestItem,
  StudentSubject,
  StudentTransport,
} from "@/modules/admin/api/students";
import { formatDate, studentName } from "@/modules/admin/lib/students-format";
import { exportToPdf, formatMoneyForPdf, type PdfSection } from "@/lib/utils/pdf-export";

interface PaginatedData<T> {
  data: T[];
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  leave: "Leave",
  outing: "Hostel outing",
  bonafide: "Bonafide certificate",
  od: "On-duty",
};

/** Every one of these can legitimately 404/error for a given student (no
 * family row, no hostel residency, no transport mapping, ...) — a missing
 * section should never sink the whole report, so each fetch falls back to
 * `fallback` instead of rejecting. */
function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

export interface StudentProfileReportInput {
  student: StudentListItem;
  feeWorkspace: StudentFeeWorkspace | undefined;
  mentor: ClassMentor | null | undefined;
}

/**
 * The student detail page's "Print" button used to just call window.print()
 * on the live admin console page — sidebar, nav rail and all. This builds
 * an actual letterheaded PDF instead. Almost every section on that page only
 * fetches once its rail tab is opened (each is its own useQuery gated on
 * `enabled`, which can't be called from this button's click handler — hooks
 * only run during a component's render) — so this re-fetches all of them
 * directly, in parallel, the same endpoints each section's own hook already
 * calls, rather than trying to force every tab to mount first.
 */
export async function generateStudentProfileReport(input: StudentProfileReportInput): Promise<void> {
  const { student, feeWorkspace, mentor } = input;
  const id = student.id;

  const [
    profile,
    family,
    lifecycle,
    subjects,
    examMarks,
    hostelResidentPage,
    placements,
    borrowRecordsPage,
    librarySettings,
    projectsRes,
    attendanceSummary,
    attendanceBySemester,
    requests,
    announcements,
    certificates,
    certificateTypes,
    transport,
    medicalVisits,
  ] = await Promise.all([
    safe(apiClient.get<StudentProfileDetails>(`/students/${id}/profile-details`), null),
    safe(apiClient.get<StudentFamily | null>(`/students/${id}/family`), null),
    safe(apiClient.get<StudentLifecycle>(`/students/${id}/lifecycle`), null),
    safe(apiClient.get<StudentSubject[]>(`/students/${id}/subjects`), []),
    safe(apiClient.get<StudentExamMark[]>("/exam-marks", { student_id: id }), []),
    safe(apiClient.get<PaginatedData<StudentHostelResident>>("/hostel/residents", { student_id: id }), { data: [] }),
    safe(apiClient.get<StudentPlacementHistoryItem[]>(`/drives/students/${id}/history`), []),
    safe(apiClient.get<PaginatedData<StudentBorrowRecord>>("/library/borrow-records", { student_id: id }), { data: [] }),
    safe(apiClient.get<{ books_per_student: number }>("/library/settings"), null),
    safe(apiClient.get<StudentProjectsResponse>(`/student-profiles/${id}`), null),
    safe(apiClient.get<StudentAttendanceSummary>(`/students/${id}/attendance-summary`), null),
    safe(apiClient.get<StudentAttendanceTerm[]>(`/students/${id}/attendance-by-semester`), []),
    safe(apiClient.get<StudentRequestItem[]>(`/students/${id}/requests`), []),
    safe(apiClient.get<StudentAnnouncement[]>(`/students/${id}/announcements`), []),
    safe(apiClient.get<StudentCertificate[]>(`/students/${id}/certificates`), []),
    safe(apiClient.get<CertificateType[]>("/certificate-types"), []),
    safe(apiClient.get<StudentTransport | null>(`/students/${id}/transport`), null),
    safe(apiClient.get<StudentMedicalVisit[]>(`/students/${id}/medical`), []),
  ]);

  const name = studentName(student.first_name, student.last_name);
  const hostelResident = hostelResidentPage.data[0] ?? null;
  const borrowRecords = borrowRecordsPage.data;

  const sections: PdfSection[] = [
    {
      type: "keyValue",
      title: "Overview",
      rows: [
        ["Student ID", student.student_id_no],
        ["Roll number", student.roll_no ?? "—"],
        ["Register number", student.register_no ?? "—"],
        ["Name", name],
        ["Programme", student.course?.name ?? "—"],
        ["Department", student.department?.name ?? "—"],
        ["Section", student.class?.section ? `Section ${student.class.section}` : "—"],
        ["Batch", student.batch?.name ?? "—"],
        ["Admission quota", student.quota?.name ?? "—"],
        ["Residence", student.student_type === "hosteller" ? "Hosteller" : "Day scholar"],
        ["Admission date", formatDate(student.admission_date)],
        ["Semester", student.class?.current_semester ? `Semester ${student.class.current_semester}` : "—"],
        ["Class advisor", mentor ? `${mentor.faculty.first_name} ${mentor.faculty.last_name}` : "Not assigned"],
        ["Status", student.status === "active" ? "Active" : "Inactive"],
        ["Email", student.email],
        ["Phone", student.phone ?? "Not provided"],
      ],
    },
  ];

  if (profile) {
    sections.push({
      type: "keyValue",
      title: "Personal Information",
      rows: [
        ["Full name", name],
        ["Date of birth", formatDate(profile.date_of_birth)],
        ["Gender", profile.gender ?? "Not provided"],
        ["Blood group", profile.blood_group ?? "Not provided"],
        ["Nationality", profile.nationality ?? "Not provided"],
        ["Mother tongue", profile.mother_tongue ?? "Not provided"],
        ["Religion", profile.religion ?? "Not provided"],
        ["Community", profile.community ?? "Not provided"],
        ["First graduate", profile.is_first_graduate === null ? "Not provided" : profile.is_first_graduate ? "Yes" : "No"],
        ["Differently abled", profile.is_diff_abled === null ? "Not provided" : profile.is_diff_abled ? "Yes" : "No"],
        ["Institutional email", student.email],
        ["Personal email", profile.contacts?.student_email1 ?? "Not provided"],
        ["Alternate email", profile.contacts?.student_email2 ?? "Not provided"],
        ["Institutional mobile", student.phone ?? "Not provided"],
        ["Personal mobile", profile.contacts?.student_mobile ?? "Not provided"],
      ],
    });

    sections.push({
      type: "table",
      title: "Addresses",
      columns: [
        { header: "Type", key: "type" },
        { header: "Address", key: "address" },
        { header: "City", key: "city" },
        { header: "State", key: "state" },
        { header: "Pincode", key: "pincode" },
      ],
      rows: profile.addresses.map((a) => ({
        type: a.address_type.charAt(0).toUpperCase() + a.address_type.slice(1),
        address: a.address_line ?? "—",
        city: a.city ?? "—",
        state: a.state ?? "—",
        pincode: a.pincode ?? "—",
      })),
    });

    sections.push({
      type: "table",
      title: "Identity Marks",
      columns: [
        { header: "#", key: "num" },
        { header: "Description", key: "description" },
      ],
      rows: profile.identity_marks.map((m) => ({ num: m.mark_number, description: m.description })),
    });
  }

  if (lifecycle) {
    sections.push({
      type: "keyValue",
      title: "Lifecycle",
      rows: [
        ["Application submitted", lifecycle.application_submitted_at ? formatDate(lifecycle.application_submitted_at) : "—"],
        ["Application status", lifecycle.application_status ?? "—"],
        ["Admitted", lifecycle.admitted_at ? formatDate(lifecycle.admitted_at) : "—"],
        ["Current status", lifecycle.current_status === "active" ? "Active" : "Inactive"],
        ["Alumni status", lifecycle.alumni_status ?? "Not an alumnus"],
        ["Alumni since", lifecycle.alumni_joined_at ? formatDate(lifecycle.alumni_joined_at) : "—"],
      ],
    });
  }

  sections.push({
    type: "table",
    title: "Registered Subjects",
    columns: [
      { header: "Subject", key: "name" },
      { header: "Code", key: "code" },
      { header: "Credits", key: "credits" },
      { header: "Semester", key: "semester" },
    ],
    rows: subjects.map((s) => ({ name: s.name, code: s.subject_code, credits: s.credits ?? "—", semester: s.semester })),
  });

  sections.push({
    type: "table",
    title: "Examinations & Results",
    columns: [
      { header: "Exam", key: "exam" },
      { header: "Subject", key: "subject" },
      { header: "Marks", key: "marks" },
    ],
    rows: examMarks.map((m) => ({
      exam: `${m.exam_subject_mapping.exams.exam_types?.name ?? "Exam"} · ${m.exam_subject_mapping.exams.academic_year}`,
      subject: `${m.exam_subject_mapping.subjects.name} (${m.exam_subject_mapping.subjects.subject_code})`,
      marks: `${m.marks_obtained ?? "—"} / ${m.max_marks}`,
    })),
  });

  if (attendanceSummary) {
    sections.push({
      type: "keyValue",
      title: "Attendance Summary",
      rows: [
        ["Overall attendance", `${attendanceSummary.overall.percentage}%`],
        ["Present", String(attendanceSummary.overall.present)],
        ["Absent", String(attendanceSummary.overall.absent)],
        ["Sessions on file", String(attendanceSummary.overall.total_days)],
      ],
    });
    sections.push({
      type: "table",
      title: "Attendance by Subject",
      columns: [
        { header: "Subject", key: "subject" },
        { header: "Present", key: "present" },
        { header: "Total", key: "total" },
        { header: "%", key: "pct" },
      ],
      rows: attendanceSummary.by_subject.map((s) => ({
        subject: s.subject_name,
        present: s.present,
        total: s.total,
        pct: `${s.percentage}%`,
      })),
    });
  }

  if (attendanceBySemester.length > 0) {
    sections.push({
      type: "table",
      title: "Attendance by Semester",
      columns: [
        { header: "Semester", key: "semester" },
        { header: "Working days", key: "days" },
        { header: "Present", key: "present" },
        { header: "Absent", key: "absent" },
        { header: "%", key: "pct" },
      ],
      rows: attendanceBySemester.map((t) => ({
        semester: `Sem ${t.semester} (${formatDate(t.from)} – ${formatDate(t.to)})`,
        days: t.working_days,
        present: t.present,
        absent: t.absent,
        pct: `${t.percentage}%`,
      })),
    });
  }

  if (feeWorkspace) {
    sections.push({
      type: "keyValue",
      title: "Fees",
      rows: [
        ["Total demand", formatMoneyForPdf(feeWorkspace.fee_summary.total_demand)],
        ["Paid", formatMoneyForPdf(feeWorkspace.fee_summary.total_paid)],
        ["Outstanding", formatMoneyForPdf(feeWorkspace.fee_summary.total_outstanding)],
        ["Status", feeWorkspace.fee_summary.due_status],
        ["Payments made", String(feeWorkspace.payment_summary.payment_count)],
        ["Last payment", feeWorkspace.payment_summary.last_payment_date ? formatDate(feeWorkspace.payment_summary.last_payment_date) : "—"],
      ],
    });
    sections.push({
      type: "table",
      title: "Fee Demand Breakdown",
      columns: [
        { header: "Fee structure", key: "structure" },
        { header: "Year / Sem", key: "term" },
        { header: "Total", key: "total" },
        { header: "Paid", key: "paid" },
        { header: "Outstanding", key: "outstanding" },
        { header: "Status", key: "status" },
      ],
      rows: feeWorkspace.demand_summary.map((d) => ({
        structure: d.fee_structure_name,
        term: `${d.academic_year}${d.semester ? ` · Sem ${d.semester}` : ""}`,
        total: formatMoneyForPdf(d.total_amount),
        paid: formatMoneyForPdf(d.paid_amount),
        outstanding: formatMoneyForPdf(d.outstanding_amount),
        status: d.due_status,
      })),
    });
  }

  const onLoan = borrowRecords.filter((r) => r.status === "borrowed");
  const history = borrowRecords.filter((r) => r.status !== "borrowed");
  const outstandingFine = borrowRecords.reduce((sum, r) => sum + (r.fine_paid ? 0 : r.fine_amount), 0);
  sections.push({
    type: "keyValue",
    title: "Library",
    rows: [
      ["On loan", `${onLoan.length}${librarySettings ? ` of ${librarySettings.books_per_student} permitted` : ""}`],
      ["Lifetime borrowed", String(borrowRecords.length)],
      ["Outstanding fine", formatMoneyForPdf(outstandingFine)],
      ["Overdue items", String(borrowRecords.filter((r) => r.is_overdue).length)],
    ],
  });
  if (borrowRecords.length > 0) {
    sections.push({
      type: "table",
      title: "Library Borrowing History",
      columns: [
        { header: "Title", key: "title" },
        { header: "Issued", key: "issued" },
        { header: "Returned", key: "returned" },
        { header: "Status", key: "status" },
        { header: "Fine", key: "fine" },
      ],
      rows: [...onLoan, ...history].map((r) => ({
        title: r.book.title,
        issued: formatDate(r.borrowed_date),
        returned: r.returned_date ? formatDate(r.returned_date) : "—",
        status: r.status === "borrowed" ? (r.is_overdue ? `Overdue (${r.days_overdue}d)` : "On loan") : "Returned",
        fine: r.fine_amount > 0 ? formatMoneyForPdf(r.fine_amount) : "—",
      })),
    });
  }

  if (student.student_type === "hosteller") {
    sections.push({
      type: "keyValue",
      title: "Hostel",
      rows: hostelResident
        ? [
            ["Hostel", hostelResident.hostel ? `${hostelResident.hostel.name} (${hostelResident.hostel.code})` : "—"],
            ["Room", hostelResident.room?.room_number ?? "—"],
            ["Sharing", hostelResident.sharing ?? "—"],
            ["Fee status", hostelResident.fee_status.replace(/_/g, " ")],
            ["Allocated on", hostelResident.allocated_date ? formatDate(hostelResident.allocated_date) : "—"],
            ["Current status", hostelResident.current_status.replace(/_/g, " ")],
          ]
        : [["Status", "Marked as hosteller, but no active room assignment found."]],
    });
  }

  if (transport) {
    sections.push({
      type: "keyValue",
      title: "Transport",
      rows: [
        ["Route", transport.route?.name ?? "—"],
        ["Boarding stage", transport.boarding_stage?.stage_name ?? "—"],
        ["Destination stage", transport.destination_stage?.stage_name ?? "—"],
        ["Stage fee", transport.boarding_stage ? formatMoneyForPdf(transport.boarding_stage.fee_amount) : "—"],
      ],
    });
  }

  sections.push({
    type: "table",
    title: "Medical Visits",
    columns: [
      { header: "Date", key: "date" },
      { header: "Reason", key: "reason" },
      { header: "Diagnosis", key: "diagnosis" },
      { header: "Treatment", key: "treatment" },
      { header: "Attended by", key: "attendedBy" },
      { header: "Referred out", key: "referred" },
    ],
    rows: medicalVisits.map((v) => ({
      date: formatDate(v.visit_date),
      reason: v.reason ?? "—",
      diagnosis: v.diagnosis ?? "—",
      treatment: v.treatment_given ?? "—",
      attendedBy: v.attended_by ? `${v.attended_by.name}${v.attended_by.designation ? ` (${v.attended_by.designation})` : ""}` : "—",
      referred: v.referred_to_hospital ? "Yes" : "No",
    })),
  });

  if (family) {
    sections.push({
      type: "keyValue",
      title: "Parents / Family",
      rows: [
        ["Father — Name", family.father_name ?? "—"],
        ["Father — Qualification", family.father_qualification ?? "—"],
        ["Father — Occupation", family.father_occupation ?? "—"],
        ["Father — Annual income", family.father_annual_income ?? "—"],
        ["Father — Email", family.father_email ?? "—"],
        ["Father — Mobile", family.father_mobile ?? "—"],
        ["Mother — Name", family.mother_name ?? "—"],
        ["Mother — Qualification", family.mother_qualification ?? "—"],
        ["Mother — Occupation", family.mother_occupation ?? "—"],
        ["Mother — Annual income", family.mother_annual_income ?? "—"],
        ["Mother — Email", family.mother_email ?? "—"],
        ["Mother — Mobile", family.mother_mobile ?? "—"],
      ],
    });
  }

  const certTypesById = new Map(certificateTypes.map((t) => [t.id, t]));
  const certsByTypeId = new Map(certificates.map((c) => [c.certificate_type_id, c]));
  sections.push({
    type: "table",
    title: "Certificates",
    columns: [
      { header: "Certificate", key: "name" },
      { header: "Collected", key: "collected" },
      { header: "Verified", key: "verified" },
    ],
    rows: certificateTypes.map((t) => {
      const record = certsByTypeId.get(t.id);
      return {
        name: certTypesById.get(t.id)?.name ?? t.name,
        collected: record?.is_available ? "Yes" : "No",
        verified: record?.verified_at ? formatDate(record.verified_at) : "No",
      };
    }),
  });

  if (projectsRes?.profile) {
    const links = [
      ["Resume", projectsRes.profile.resume_url],
      ["LinkedIn", projectsRes.profile.linkedin_url],
      ["GitHub", projectsRes.profile.github_url],
      ["LeetCode", projectsRes.profile.leetcode_url],
      ["HackerRank", projectsRes.profile.hackerrank_url],
      ["Codeforces", projectsRes.profile.codeforces_url],
    ] as const;
    sections.push({
      type: "keyValue",
      title: "Profile Links",
      rows: links.map(([label, url]) => [label, url ?? "Not recorded"]),
    });
  }
  if (projectsRes && projectsRes.projects.length > 0) {
    sections.push({
      type: "table",
      title: "Projects",
      columns: [
        { header: "Title", key: "title" },
        { header: "Description", key: "description" },
        { header: "Mentor", key: "mentor" },
      ],
      rows: projectsRes.projects.map((p) => ({
        title: p.title,
        description: p.description ?? "—",
        mentor: p.faculty ? `${p.faculty.first_name} ${p.faculty.last_name}` : "—",
      })),
    });
  }

  sections.push({
    type: "table",
    title: "Placement Drive History",
    columns: [
      { header: "Company", key: "company" },
      { header: "Scheduled", key: "scheduled" },
      { header: "Drive status", key: "driveStatus" },
      { header: "Application status", key: "appStatus" },
    ],
    rows: placements.map((p) => ({
      company: p.company_name,
      scheduled: formatDate(p.scheduled_date),
      driveStatus: p.drive_status,
      appStatus: p.application_status,
    })),
  });

  sections.push({
    type: "table",
    title: "Requests",
    columns: [
      { header: "Type", key: "type" },
      { header: "Dates", key: "dates" },
      { header: "Detail", key: "detail" },
      { header: "Status", key: "status" },
      { header: "Submitted", key: "submitted" },
    ],
    rows: requests.map((r) => ({
      type: REQUEST_TYPE_LABELS[r.type] ?? r.type,
      dates: r.from_date ? `${formatDate(r.from_date)} – ${formatDate(r.to_date)}` : "—",
      detail: r.detail ?? "—",
      status: r.status.replace(/_/g, " "),
      submitted: formatDate(r.created_at),
    })),
  });

  sections.push({
    type: "table",
    title: "Communications",
    columns: [
      { header: "Date", key: "date" },
      { header: "Title", key: "title" },
      { header: "Content", key: "content" },
    ],
    rows: announcements.map((a) => ({ date: formatDate(a.created_at), title: a.title, content: a.content })),
  });

  await exportToPdf({
    title: "Student Profile Report",
    subtitle: `${name} · ${student.course?.name ?? "—"} · ${student.department?.name ?? "—"}`,
    meta: [
      ["Student ID", student.student_id_no],
      ["Status", student.status === "active" ? "Active" : "Inactive"],
    ],
    sections,
    filename: `student-profile-${student.student_id_no}.pdf`,
    photoUrl: student.photo_url,
    footerBrand: true,
  });
}

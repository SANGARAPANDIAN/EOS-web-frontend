import { exportToPdf } from "@/lib/utils/pdf-export";
import {
  SUBJECT_CATEGORY_LABELS,
  SUBJECT_COURSE_TYPE_LABELS,
  type AcademicCalendarPeriod,
  type CalendarEventItem,
  type ClassAttendance,
  type ClassResults,
  type CourseProgress,
  type FacultyAllocationRow,
  type FacultyWorkloadSummaryRow,
  type FeedbackForm,
  type Subject,
  type TimetableSlot,
} from "../types";

const INSTITUTION = "Sri Eshwar College of Engineering — Academic Coordinator Portal";
const today = () => new Date().toISOString().slice(0, 10);
const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function exportCurriculumReportPdf(subjects: Subject[]) {
  return exportToPdf({
    title: "Curriculum Report",
    subtitle: INSTITUTION,
    meta: [["Courses", String(subjects.length)]],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Code", key: "code" },
          { header: "Subject", key: "name" },
          { header: "Credits", key: "credits" },
          { header: "Type", key: "type" },
          { header: "Category", key: "category" },
          { header: "Semester", key: "semester" },
        ],
        rows: subjects.map((s) => ({
          code: s.subjectCode,
          name: s.name,
          credits: s.credits ?? "—",
          type: s.courseType ? SUBJECT_COURSE_TYPE_LABELS[s.courseType] : "—",
          category: s.category ? SUBJECT_CATEGORY_LABELS[s.category] : "—",
          semester: s.semester ?? "—",
        })),
      },
    ],
    filename: `curriculum-report-${today()}.pdf`,
  });
}

export function exportCourseMappingReportPdf(allocations: FacultyAllocationRow[]) {
  const bySubject = new Map<string, { name: string; classes: Set<string>; faculty: Set<string> }>();
  for (const a of allocations) {
    const entry = bySubject.get(a.subjectCode) ?? { name: a.subjectName, classes: new Set(), faculty: new Set() };
    entry.classes.add(a.classLabel);
    entry.faculty.add(a.facultyName);
    bySubject.set(a.subjectCode, entry);
  }
  return exportToPdf({
    title: "Course Mapping Report",
    subtitle: INSTITUTION,
    meta: [["Mapped courses", String(bySubject.size)]],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Code", key: "code" },
          { header: "Subject", key: "name" },
          { header: "Mapped classes", key: "classes" },
          { header: "Faculty", key: "faculty" },
        ],
        rows: [...bySubject.entries()].map(([code, v]) => ({
          code,
          name: v.name,
          classes: [...v.classes].join(", "),
          faculty: [...v.faculty].join(", "),
        })),
      },
    ],
    filename: `course-mapping-report-${today()}.pdf`,
  });
}

export function exportFacultyWorkloadReportPdf(summary: FacultyWorkloadSummaryRow[]) {
  return exportToPdf({
    title: "Faculty Workload Report",
    subtitle: INSTITUTION,
    meta: [["Faculty", String(summary.length)]],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Faculty", key: "name" },
          { header: "Weekly hours", key: "hours" },
          { header: "Cap", key: "cap" },
          { header: "Load %", key: "pct" },
        ],
        rows: summary.map((s) => ({
          name: s.facultyName,
          hours: s.weeklyHours,
          cap: s.weeklyLoadCapHours,
          pct: `${s.percent}%`,
        })),
      },
    ],
    filename: `faculty-workload-report-${today()}.pdf`,
  });
}

export function exportFacultyAllocationReportPdf(allocations: FacultyAllocationRow[]) {
  return exportToPdf({
    title: "Faculty Allocation Report",
    subtitle: INSTITUTION,
    meta: [["Allocations", String(allocations.length)]],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Code", key: "code" },
          { header: "Course", key: "course" },
          { header: "Class", key: "class" },
          { header: "Faculty", key: "faculty" },
          { header: "Type", key: "type" },
          { header: "Hrs/wk", key: "hours" },
          { header: "Check", key: "check" },
        ],
        rows: allocations.map((a) => ({
          code: a.subjectCode,
          course: a.subjectName,
          class: a.classLabel,
          faculty: a.facultyName,
          type: a.courseType ? SUBJECT_COURSE_TYPE_LABELS[a.courseType] : "—",
          hours: a.weeklyHours,
          check: a.check,
        })),
      },
    ],
    filename: `faculty-allocation-report-${today()}.pdf`,
  });
}

export function exportTimetableReportPdf(slots: TimetableSlot[]) {
  const sorted = [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.periodNumber - b.periodNumber);
  return exportToPdf({
    title: "Timetable Report",
    subtitle: INSTITUTION,
    meta: [["Slots", String(sorted.length)]],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Day", key: "day" },
          { header: "Period", key: "period" },
          { header: "Time", key: "time" },
          { header: "Class", key: "class" },
          { header: "Subject", key: "subject" },
          { header: "Faculty", key: "faculty" },
        ],
        rows: sorted.map((s) => ({
          day: DAY_NAMES[s.dayOfWeek] ?? String(s.dayOfWeek),
          period: s.periodNumber,
          time: `${s.startTime}–${s.endTime}`,
          class: `${s.departmentCode} · Sec ${s.classSection}`,
          subject: `${s.subjectCode} · ${s.subjectName}`,
          faculty: s.facultyName,
        })),
      },
    ],
    filename: `timetable-report-${today()}.pdf`,
  });
}

export function exportAttendanceReportPdf(attendance: ClassAttendance, classLabel: string) {
  const subjectColumns = attendance.subjects.map((s) => ({ header: s.subjectCode, key: `subj_${s.id}` }));
  return exportToPdf({
    title: "Attendance Report",
    subtitle: INSTITUTION,
    meta: [
      ["Class", classLabel],
      ["Students", String(attendance.rows.length)],
    ],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Roll No", key: "roll" },
          { header: "Student", key: "name" },
          ...subjectColumns,
          { header: "Overall", key: "overall" },
          { header: "Status", key: "status" },
        ],
        rows: attendance.rows.map((r) => {
          const row: Record<string, string | number> = {
            roll: r.student.rollNo ?? "—",
            name: r.student.name,
            overall: r.overallPercentage != null ? `${r.overallPercentage}%` : "—",
            status: r.status,
          };
          for (const s of attendance.subjects) {
            const pct = r.subjectPercentages[s.id];
            row[`subj_${s.id}`] = pct != null ? `${pct}%` : "—";
          }
          return row;
        }),
      },
    ],
    filename: `attendance-report-${classLabel.replace(/\s+/g, "-")}-${today()}.pdf`,
  });
}

export function exportFeedbackSummaryReportPdf(forms: FeedbackForm[]) {
  return exportToPdf({
    title: "Feedback Summary Report",
    subtitle: INSTITUTION,
    meta: [["Forms", String(forms.length)]],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Title", key: "title" },
          { header: "Type", key: "type" },
          { header: "Batch", key: "batch" },
          { header: "Class", key: "class" },
          { header: "Questions", key: "questions" },
          { header: "Created", key: "created" },
        ],
        rows: forms.map((f) => ({
          title: f.title,
          type: f.form_type === "end_semester" ? "End Semester" : "General",
          batch: f.batchName ?? "—",
          class: f.classSection ?? "—",
          questions: f.questionCount,
          created: new Date(f.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        })),
      },
    ],
    filename: `feedback-summary-report-${today()}.pdf`,
  });
}

export function exportCourseProgressReportPdf(rows: CourseProgress[]) {
  return exportToPdf({
    title: "Course Progress Report",
    subtitle: INSTITUTION,
    meta: [["Lesson plans", String(rows.length)]],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Code", key: "code" },
          { header: "Subject", key: "subject" },
          { header: "Class", key: "class" },
          { header: "Faculty", key: "faculty" },
          { header: "Sessions covered", key: "covered" },
          { header: "% Complete", key: "pct" },
        ],
        rows: rows.map((r) => ({
          code: r.subjectCode,
          subject: r.subjectName,
          class: r.classLabel,
          faculty: r.facultyName,
          covered: `${r.coveredSessions}/${r.totalSessions}`,
          pct: r.percentComplete != null ? `${r.percentComplete}%` : "—",
        })),
      },
    ],
    filename: `course-progress-report-${today()}.pdf`,
  });
}

export function exportResultAnalysisReportPdf(results: ClassResults, classLabel: string) {
  return exportToPdf({
    title: "Result Analysis Report",
    subtitle: INSTITUTION,
    meta: [
      ["Class", classLabel],
      ["Pass %", results.passPercentage != null ? `${results.passPercentage}%` : "—"],
      ["Class average", results.classAverage != null ? String(results.classAverage) : "—"],
    ],
    sections: [
      {
        type: "table",
        title: "Subject-wise pass percentage",
        columns: [
          { header: "Code", key: "code" },
          { header: "Subject", key: "subject" },
          { header: "Pass %", key: "pct" },
        ],
        rows: results.subjects.map((s) => ({ code: s.subjectCode, subject: s.subjectName, pct: s.passPercentage != null ? `${s.passPercentage}%` : "—" })),
      },
      {
        type: "table",
        title: "Student performance",
        columns: [
          { header: "Roll No", key: "roll" },
          { header: "Student", key: "name" },
          { header: "CGPA", key: "cgpa" },
          { header: "Backlogs", key: "backlogs" },
          { header: "Standing", key: "standing" },
        ],
        rows: results.rows.map((r) => ({
          roll: r.student.rollNo ?? "—",
          name: r.student.name,
          cgpa: r.cgpa != null ? r.cgpa.toFixed(2) : "—",
          backlogs: r.backlogs,
          standing: r.standing,
        })),
      },
    ],
    filename: `result-analysis-report-${classLabel.replace(/\s+/g, "-")}-${today()}.pdf`,
  });
}

export function exportAcademicEventsReportPdf(events: CalendarEventItem[]) {
  const sorted = [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  return exportToPdf({
    title: "Academic Events Report",
    subtitle: INSTITUTION,
    meta: [["Events", String(sorted.length)]],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Date", key: "date" },
          { header: "Title", key: "title" },
          { header: "Type", key: "type" },
          { header: "Time", key: "time" },
        ],
        rows: sorted.map((e) => ({
          date: new Date(e.eventDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          title: e.title,
          type: e.eventType,
          time: e.startTime && e.endTime ? `${e.startTime}–${e.endTime}` : "—",
        })),
      },
    ],
    filename: `academic-events-report-${today()}.pdf`,
  });
}

export function exportAcademicCalendarReportPdf(periods: AcademicCalendarPeriod[]) {
  return exportToPdf({
    title: "Academic Calendar Report",
    subtitle: INSTITUTION,
    meta: [["Periods", String(periods.length)]],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Batch", key: "batch" },
          { header: "Semester", key: "semester" },
          { header: "Start date", key: "start" },
          { header: "End date", key: "end" },
        ],
        rows: periods.map((p) => ({
          batch: `Batch #${p.batchId}`,
          semester: p.semester,
          start: new Date(p.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          end: new Date(p.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        })),
      },
    ],
    filename: `academic-calendar-report-${today()}.pdf`,
  });
}

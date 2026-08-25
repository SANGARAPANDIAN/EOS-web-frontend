"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useClasses, useCourses, useDepartments } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useSubjects } from "@/modules/academic-coordinator/hooks/useSubjectsQueries";
import { useCoordinatorFacultyWorkload } from "@/modules/academic-coordinator/hooks/useFacultyQueries";
import { useAllTimetableSlots } from "@/modules/academic-coordinator/hooks/useTimetableQueries";
import { useClassAttendance } from "@/modules/academic-coordinator/hooks/useAttendanceQueries";
import { useCourseProgress } from "@/modules/academic-coordinator/hooks/useCourseProgressQueries";
import { useFeedbackForms } from "@/modules/academic-coordinator/hooks/useFeedbackQueries";
import { useClassResults } from "@/modules/academic-coordinator/hooks/useResultsQueries";
import { useAcademicCalendarPeriods, useCalendarEvents } from "@/modules/academic-coordinator/hooks/useAcademicCalendarQueries";
import {
  exportAcademicCalendarReportPdf,
  exportAcademicEventsReportPdf,
  exportAttendanceReportPdf,
  exportCourseMappingReportPdf,
  exportCourseProgressReportPdf,
  exportCurriculumReportPdf,
  exportFacultyAllocationReportPdf,
  exportFacultyWorkloadReportPdf,
  exportFeedbackSummaryReportPdf,
  exportResultAnalysisReportPdf,
  exportTimetableReportPdf,
} from "@/modules/academic-coordinator/lib/coordinator-report-pdfs";

interface ReportDef {
  key: string;
  title: string;
  description: string;
  needsClass?: boolean;
  download: () => void | Promise<void>;
}

export default function CoordinatorReportsPage() {
  const { show } = useToast();
  const [classId, setClassId] = useState<number | null>(null);

  const departments = useDepartments();
  const courses = useCourses();
  const classes = useClasses();
  const effectiveClassId = classId ?? classes.data?.[0]?.id ?? null;
  const deptCodeById = useMemo(() => new Map((departments.data ?? []).map((d) => [d.id, d.code])), [departments.data]);
  const courseCodeById = useMemo(() => new Map((courses.data ?? []).map((c) => [c.id, c.code])), [courses.data]);
  const selectedClass = (classes.data ?? []).find((c) => c.id === effectiveClassId) ?? null;
  const classLabel = selectedClass
    ? `${deptCodeById.get(selectedClass.department_id) ?? "?"} · ${courseCodeById.get(selectedClass.course_id) ?? "?"} · Sec ${selectedClass.section}`
    : "—";

  const subjects = useSubjects();
  const workload = useCoordinatorFacultyWorkload();
  const timetable = useAllTimetableSlots();
  const attendance = useClassAttendance(effectiveClassId);
  const courseProgress = useCourseProgress();
  const feedbackForms = useFeedbackForms({ limit: 100 });
  const classResults = useClassResults(effectiveClassId);
  const calendarPeriods = useAcademicCalendarPeriods();
  const calendarEvents = useCalendarEvents();

  function runOrWarn(hasData: boolean, run: () => void) {
    if (!hasData) {
      show("No data to export yet.", "error");
      return;
    }
    run();
  }

  const reports: ReportDef[] = [
    {
      key: "curriculum",
      title: "Curriculum Report",
      description: "All courses with credits, type and category.",
      download: () => runOrWarn(!!subjects.data?.length, () => exportCurriculumReportPdf(subjects.data!)),
    },
    {
      key: "course-mapping",
      title: "Course Mapping Report",
      description: "Which classes and faculty each course is mapped to.",
      download: () => runOrWarn(!!workload.data?.allocations.length, () => exportCourseMappingReportPdf(workload.data!.allocations)),
    },
    {
      key: "faculty-workload",
      title: "Faculty Workload",
      description: "Weekly teaching hours against capacity, per faculty.",
      download: () => runOrWarn(!!workload.data?.summary.length, () => exportFacultyWorkloadReportPdf(workload.data!.summary)),
    },
    {
      key: "faculty-allocation",
      title: "Faculty Allocation",
      description: "Course-by-course allocation drawn from the Map module.",
      download: () => runOrWarn(!!workload.data?.allocations.length, () => exportFacultyAllocationReportPdf(workload.data!.allocations)),
    },
    {
      key: "timetable",
      title: "Timetable",
      description: "Full weekly class schedule across every section.",
      download: () => runOrWarn(!!timetable.data?.length, () => exportTimetableReportPdf(timetable.data!)),
    },
    {
      key: "attendance",
      title: "Attendance",
      description: "Per-student, per-subject attendance for the selected class.",
      needsClass: true,
      download: () => runOrWarn(!!attendance.data?.rows.length, () => exportAttendanceReportPdf(attendance.data!, classLabel)),
    },
    {
      key: "feedback-summary",
      title: "Feedback Summary",
      description: "Every feedback form created, with response coverage.",
      download: () => runOrWarn(!!feedbackForms.data?.data.length, () => exportFeedbackSummaryReportPdf(feedbackForms.data!.data)),
    },
    {
      key: "course-progress",
      title: "Course Progress",
      description: "Lesson plan completion against the syllabus.",
      download: () => runOrWarn(!!courseProgress.data?.length, () => exportCourseProgressReportPdf(courseProgress.data!)),
    },
    {
      key: "result-analysis",
      title: "Result Analysis",
      description: "Pass percentage, CGPA and backlogs for the selected class.",
      needsClass: true,
      download: () => runOrWarn(!!classResults.data?.rows.length, () => exportResultAnalysisReportPdf(classResults.data!, classLabel)),
    },
    {
      key: "academic-events",
      title: "Academic Events",
      description: "Holidays and events across the academic calendar.",
      download: () => runOrWarn(!!calendarEvents.data?.length, () => exportAcademicEventsReportPdf(calendarEvents.data!)),
    },
    {
      key: "academic-calendar",
      title: "Academic Calendar",
      description: "Semester periods per batch.",
      download: () => runOrWarn(!!calendarPeriods.data?.length, () => exportAcademicCalendarReportPdf(calendarPeriods.data!)),
    },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Reports</h1>
          <p className="mt-1.5 text-[13px] text-muted">Downloadable academic reports, generated live from real data.</p>
        </div>
        <Select
          value={effectiveClassId ?? ""}
          onChange={(e) => setClassId(Number(e.target.value))}
          className="min-w-55"
          title="Class used for Attendance and Result Analysis reports"
        >
          {(classes.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {deptCodeById.get(c.department_id) ?? "?"} · {courseCodeById.get(c.course_id) ?? "?"} · Sec {c.section}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
        {reports.map((r) => (
          <Card key={r.key} className="flex flex-col gap-2.5">
            <div>
              <div className="text-sm font-bold text-ink">{r.title}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{r.description}</p>
              {r.needsClass && <p className="mt-1.5 text-[11px] text-subtle">Class: {classLabel}</p>}
            </div>
            <Button variant="secondary" className="w-auto self-start" onClick={() => r.download()}>
              Download PDF
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

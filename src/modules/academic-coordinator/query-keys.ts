const base = ["academic-coordinator"] as const;

export const coordinatorKeys = {
  all: base,
  subjects: () => [...base, "subjects"] as const,
  timetable: {
    all: () => [...base, "timetable"] as const,
  },
  attendance: {
    class: (classId: number) => [...base, "attendance", "class", classId] as const,
  },
  courseProgress: {
    all: () => [...base, "course-progress"] as const,
  },
  results: {
    class: (classId: number) => [...base, "results", "class", classId] as const,
  },
  audit: {
    departmentSemester: (departmentId: number, semester: number, batchId: number) => [...base, "audit", departmentId, semester, batchId] as const,
  },
  mapping: {
    department: (departmentId: number) => [...base, "mapping", departmentId] as const,
  },
  faculty: {
    list: (params: object = {}) => [...base, "faculty", "list", params] as const,
    profile: (id: number) => [...base, "faculty", "profile", id] as const,
    workload: () => [...base, "faculty", "workload"] as const,
  },
  feedbackForms: {
    all: () => [...base, "feedback-forms"] as const,
    list: (params: object = {}) => [...base, "feedback-forms", "list", params] as const,
    detail: (id: number) => [...base, "feedback-forms", "detail", id] as const,
    results: (id: number) => [...base, "feedback-forms", "results", id] as const,
    questionTemplates: (category: string) => [...base, "feedback-forms", "question-templates", category] as const,
  },
  academicCalendar: {
    periods: () => [...base, "academic-calendar", "periods"] as const,
    events: (academicCalendarId?: number) => [...base, "academic-calendar", "events", academicCalendarId ?? "all"] as const,
  },
};

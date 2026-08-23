const base = ["placement"] as const;

export const placementKeys = {
  all: base,
  dashboard: () => [...base, "dashboard"] as const,
  companies: {
    all: () => [...base, "companies"] as const,
    list: (params: object = {}) => [...base, "companies", "list", params] as const,
    detail: (id: number) => [...base, "companies", "detail", id] as const,
    report: () => [...base, "companies", "report"] as const,
  },
  drives: {
    all: () => [...base, "drives"] as const,
    list: (params: object = {}) => [...base, "drives", "list", params] as const,
    detail: (id: number) => [...base, "drives", "detail", id] as const,
    report: () => [...base, "drives", "report"] as const,
  },
  applications: {
    list: (driveId: number) => [...base, "drives", driveId, "applications"] as const,
  },
  offers: () => [...base, "offers"] as const,
  interviews: {
    all: () => [...base, "interviews"] as const,
    list: () => [...base, "interviews", "list"] as const,
  },
  students: () => [...base, "students"] as const,
  studentProfile: (id: number) => [...base, "students", id, "profile"] as const,
  batches: () => [...base, "batches"] as const,
  studentReport: (batchId?: number) => [...base, "student-report", batchId ?? "all"] as const,
  reportsGeneratedCount: () => [...base, "reports-generated-count"] as const,
  departments: () => [...base, "departments"] as const,
  classes: () => [...base, "classes"] as const,
  announcements: () => [...base, "announcements"] as const,
  academicCalendarPeriods: () => [...base, "academic-calendar", "periods"] as const,
  academicCalendarEvents: (academicCalendarId?: number) =>
    [...base, "academic-calendar", "events", academicCalendarId ?? "all"] as const,
};

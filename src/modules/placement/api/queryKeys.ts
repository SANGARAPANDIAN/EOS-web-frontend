function resourceKeys(all: readonly unknown[]) {
  return {
    all: () => all,
    list: (params: object = {}) => [...all, "list", params] as const,
    detail: (id: number | string) => [...all, "detail", id] as const,
  };
}

const base = ["placement"] as const;

export const placementKeys = {
  all: base,
  dashboard: () => [...base, "dashboard"] as const,
  companies: {
    ...resourceKeys([...base, "companies"]),
    report: () => [...base, "companies", "report"] as const,
  },
  drives: {
    ...resourceKeys([...base, "drives"]),
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
  announcements: () => [...base, "announcements"] as const,
  academicCalendarPeriods: () => [...base, "academic-calendar", "periods"] as const,
  academicCalendarEvents: (academicCalendarId?: number) =>
    [...base, "academic-calendar", "events", academicCalendarId ?? "all"] as const,
};

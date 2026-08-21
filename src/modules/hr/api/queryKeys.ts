const base = ["hr"] as const;

export const hrKeys = {
  all: base,
  dashboard: () => [...base, "dashboard"] as const,
  departments: {
    all: () => [...base, "departments"] as const,
    detail: (id: number) => [...base, "departments", "detail", id] as const,
  },
  requests: {
    list: (params: object = {}) => [...base, "requests", "list", params] as const,
  },
  appraisalDivisions: () => [...base, "appraisal-divisions"] as const,
  appraisalCriteria: {
    list: (params: object = {}) => [...base, "appraisal-criteria", "list", params] as const,
  },
  appraisalRequests: {
    list: (params: object = {}) => [...base, "appraisal-requests", "list", params] as const,
    detail: (id: number) => [...base, "appraisal-requests", "detail", id] as const,
  },
  payroll: {
    list: (params: object = {}) => [...base, "payroll", "list", params] as const,
  },
  payslipRequests: {
    list: (params: object = {}) => [...base, "payslip-requests", "list", params] as const,
  },
  leaveTypes: () => [...base, "leave-types"] as const,
  faculty: {
    list: (params: object = {}) => [...base, "faculty", "list", params] as const,
    detail: (id: number) => [...base, "faculty", "detail", id] as const,
    activity: (id: number) => [...base, "faculty", "activity", id] as const,
    documents: (id: number) => [...base, "faculty", "documents", id] as const,
    attendance: (id: number) => [...base, "faculty", "attendance", id] as const,
    attendanceOverview: (params: object = {}) => [...base, "faculty", "attendance-overview", params] as const,
  },
};

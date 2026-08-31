export type AdminReportModule = "hostel" | "library" | "iqac";

export interface AdminReportEntry {
  module: AdminReportModule;
  key: string;
  label: string;
  description: string;
}

export interface AdminReportGroup {
  module: AdminReportModule;
  label: string;
  entries: AdminReportEntry[];
}

/**
 * Every entry here is real and wired up (see modules/admin/api/reports.ts):
 * Hostel/Library/IQAC's report controllers all already exist in
 * EOSbackend1 with PDF/Excel export and already permit ADMIN — this
 * catalog is just the menu the Admin Reports page renders from. `key`
 * matches the backend route segment exactly for every entry (IQAC's are
 * hyphenated — venue-bookings/student-ods/faculty-ods — not the
 * underscored values IqacReportBundleQueryDto's `types` param uses; this
 * page calls each report's own GET route directly, not the bundle route).
 */
export const ADMIN_REPORT_CATALOG: AdminReportGroup[] = [
  {
    module: "hostel",
    label: "Hostel",
    entries: [
      { module: "hostel", key: "occupancy", label: "Occupancy", description: "Beds and rooms per hostel block." },
      {
        module: "hostel",
        key: "fee-arrears",
        label: "Fee collection & arrears",
        description: "Per-resident hostel fee position.",
      },
      {
        module: "hostel",
        key: "leave-audit",
        label: "Leave / gate audit",
        description: "Every outing request in the period.",
      },
      {
        module: "hostel",
        key: "complaint-sla",
        label: "Complaint SLA",
        description: "Every complaint, its resolution state and timing.",
      },
    ],
  },
  {
    module: "library",
    label: "Library",
    entries: [
      {
        module: "library",
        key: "inventory",
        label: "Inventory",
        description: "Every title with copies, rack position, cost and current availability.",
      },
      {
        module: "library",
        key: "issued",
        label: "Issued books",
        description: "Borrowings in the selected period with student, department and due date.",
      },
      {
        module: "library",
        key: "returned",
        label: "Returned books",
        description: "Receipts at the counter, including renewals and late returns.",
      },
      {
        module: "library",
        key: "overdue",
        label: "Overdue books",
        description: "Copies past due, grouped by days late and by department.",
      },
      {
        module: "library",
        key: "no-dues-clearance",
        label: "No-dues clearance list",
        description: "Members with books or fines still pending.",
      },
      {
        module: "library",
        key: "accession-register",
        label: "Accession register",
        description: "The statutory register of every copy added, with fund and vendor.",
      },
    ],
  },
  {
    module: "iqac",
    label: "IQAC",
    entries: [
      {
        module: "iqac",
        key: "venue-bookings",
        label: "Venue bookings",
        description: "Every venue booking request in the period, with its decision.",
      },
      {
        module: "iqac",
        key: "student-ods",
        label: "Student on-duty",
        description: "Student on-duty requests, mentor status and document verification.",
      },
      {
        module: "iqac",
        key: "faculty-ods",
        label: "Faculty on-duty",
        description: "Faculty on-duty requests, HoD/HR status and document verification.",
      },
    ],
  },
];

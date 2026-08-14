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
 * Labels/descriptions mirror the old console's ADMIN_REPORT_CATALOG exactly
 * (src/modules/admin/types/reports.ts in EOSfrontendweb), which aggregates
 * report definitions owned by the Hostel, Library and IQAC modules. Those
 * modules — and their preview/PDF/Excel-export endpoints — haven't been
 * migrated into this codebase yet (a separate phase), so this catalog is
 * kept here as a faithful list of what exists, with the page itself showing
 * an honest "not wired up here yet" state per entry rather than a broken or
 * fabricated preview.
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
        key: "venue_bookings",
        label: "Venue bookings",
        description: "Every venue booking request in the period, with its decision.",
      },
      {
        module: "iqac",
        key: "student_ods",
        label: "Student on-duty",
        description: "Student on-duty requests, mentor status and document verification.",
      },
      {
        module: "iqac",
        key: "faculty_ods",
        label: "Faculty on-duty",
        description: "Faculty on-duty requests, HoD/HR status and document verification.",
      },
    ],
  },
];

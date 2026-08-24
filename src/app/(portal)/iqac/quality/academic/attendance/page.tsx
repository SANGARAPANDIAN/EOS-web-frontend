"use client";

import { AttendancePage } from "@/modules/iqac/components/academic/AttendancePage";

/**
 * Literal-folder route for the real Attendance metric — restores what the
 * academic `[metric]` dispatcher lost when it was reduced to an
 * unconditional notFound() (see that file's comment). AttendancePage itself
 * was already fully built (real /me/iqac/academic-quality/attendance data)
 * but had no route rendering it.
 */
export default function AcademicAttendancePage() {
  return <AttendancePage />;
}

import type { FacultyMapping } from "@/modules/admin/api/facultyMapping";
import { classLabel, subjectLabel } from "@/modules/admin/lib/faculty-mapping-format";
import { SimpleTable } from "@/modules/admin/components/faculty/detail/shared";

export function AssignmentsSection({ mappings, isLoading }: { mappings: FacultyMapping[]; isLoading: boolean }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-admin-ink">Academic Assignments</h3>
      <p className="mt-1 text-sm text-admin-muted">Subject/class teaching assignments from faculty-mapping.</p>
      <div className="mt-5">
        {isLoading && <p className="text-sm text-admin-muted">Loading…</p>}
        {!isLoading && (
          <SimpleTable
            headers={["Subject", "Class", "Academic year"]}
            rows={mappings.map((mapping) => [subjectLabel(mapping), classLabel(mapping), mapping.academic_year])}
            emptyTitle="No teaching assignments recorded yet."
            emptyDescription="Subject/class mappings for this faculty will appear here once assigned."
          />
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Badge, Button, Drawer, useToast } from "@/modules/admin/components/ui";
import { useFacultyActivity, useFacultyAttendance, useFacultyById, type Faculty } from "@/modules/admin/api/faculty";
import { useFacultyMappings } from "@/modules/admin/api/facultyMapping";
import { useFacultyDocuments } from "@/modules/admin/api/facultyFiles";
import { FacultyAvatar } from "@/modules/admin/components/faculty/FacultyAvatar";
import { formatDate, formatFacultyCode, fullName } from "@/modules/admin/lib/faculty-format";
import { EMPLOYMENT_STATUS_FROM_ENUM } from "@/modules/admin/lib/faculty-wizard-config";

interface FacultyQuickViewDrawerProps {
  facultyId: number | null;
  onClose: () => void;
  onEdit: (faculty: Faculty) => void;
}

function KvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-admin-divider py-2.5 text-sm last:border-b-0">
      <dt className="text-admin-muted">{label}</dt>
      <dd className="font-medium text-admin-ink">{value}</dd>
    </div>
  );
}

/** Right-hand slide-in panel over a faculty row — snapshot without leaving the list. */
export function FacultyQuickViewDrawer({ facultyId, onClose, onEdit }: FacultyQuickViewDrawerProps) {
  const { show } = useToast();
  const { data: faculty, isLoading, error } = useFacultyById(facultyId);
  const { data: mappings } = useFacultyMappings({ faculty_id: facultyId ?? undefined, limit: 1 });
  const { data: attendance } = useFacultyAttendance(facultyId);
  const { data: documents } = useFacultyDocuments(facultyId);
  const { data: activity } = useFacultyActivity(facultyId);

  return (
    <Drawer
      open={facultyId !== null}
      onClose={onClose}
      eyebrow={faculty ? formatFacultyCode(faculty.id) : undefined}
      title={faculty ? fullName(faculty) : "Loading…"}
      headActions={
        faculty && (
          <Link href={`/admin/faculty/${faculty.id}`}>
            <Button variant="secondary" size="sm">
              Full profile
            </Button>
          </Link>
        )
      }
      footer={
        faculty && (
          <>
            <Link href={`/admin/faculty/${faculty.id}`} className="grow">
              <Button variant="primary" className="w-full justify-center">
                Open full profile
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => show("Notifications are coming soon.", "info")} aria-label="Notify">
              <Icon name="send" size={16} />
            </Button>
            <Button variant="secondary" onClick={() => onEdit(faculty)} aria-label="Edit">
              <Icon name="edit" size={16} />
            </Button>
          </>
        )
      }
    >
      {isLoading && <p className="text-sm text-admin-muted">Loading faculty…</p>}
      {error && <p className="text-sm text-admin-danger">{error instanceof Error ? error.message : "Failed to load this faculty record."}</p>}

      {faculty && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <FacultyAvatar faculty={faculty} className="size-16 rounded-admin-lg text-xl" />
            <div>
              <Badge tone={faculty.status === "active" ? "success" : "neutral"}>{faculty.status === "active" ? "Active" : "Inactive"}</Badge>
              <p className="mt-1.5 text-sm font-medium text-admin-body">{faculty.department?.name ?? "No department"}</p>
              <p className="text-xs text-admin-muted">{faculty.designation} · Faculty</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-admin-card border border-admin-border p-3 text-center">
              <p className="text-lg font-bold text-admin-ink">{attendance ? `${attendance.overall.attendance_percentage}%` : "—"}</p>
              <p className="text-[11px] text-admin-muted">Attendance</p>
            </div>
            <div className="rounded-admin-card border border-admin-border p-3 text-center">
              <p className="text-lg font-bold text-admin-ink">{mappings?.meta.total ?? "—"}</p>
              <p className="text-[11px] text-admin-muted">Assignments</p>
            </div>
            <div className="rounded-admin-card border border-admin-border p-3 text-center">
              <p className="text-lg font-bold text-admin-ink">{documents?.length ?? "—"}</p>
              <p className="text-[11px] text-admin-muted">Documents</p>
            </div>
          </div>

          <dl className="flex flex-col border-t border-admin-divider">
            <KvRow label="Designation" value={faculty.designation} />
            <KvRow label="Department" value={faculty.department?.name ?? "—"} />
            <KvRow label="Role" value="Faculty" />
            <KvRow label="Date of joining" value={formatDate(faculty.date_of_joining)} />
            <KvRow
              label="Employment status"
              value={(faculty.employment_status && EMPLOYMENT_STATUS_FROM_ENUM[faculty.employment_status]) || "—"}
            />
            <KvRow label="Reporting to" value="—" />
            <KvRow label="Phone" value={faculty.phone ?? "Not provided"} />
            <KvRow label="Email" value={faculty.email} />
          </dl>

          <div className="border-t border-admin-divider pt-4">
            <p className="text-xs font-bold tracking-wide text-admin-subtle uppercase">Recent activity</p>
            {(!activity || activity.length === 0) && <p className="mt-2 text-sm text-admin-muted">No recorded activity yet.</p>}
            {activity && activity.length > 0 && (
              <ul className="mt-2 flex flex-col gap-2">
                {activity.slice(0, 3).map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <p className="text-admin-body">{entry.description}</p>
                    <p className="text-xs text-admin-muted">{formatDate(entry.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

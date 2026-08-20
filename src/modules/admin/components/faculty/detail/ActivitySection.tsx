import { EmptyState } from "@/modules/admin/components/ui";
import type { FacultyActivityEntry } from "@/modules/admin/api/faculty";
import { formatDate } from "@/modules/admin/lib/faculty-format";

export function ActivitySection({ activity, isLoading }: { activity: FacultyActivityEntry[] | undefined; isLoading: boolean }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-admin-ink">Activity</h3>
      <div className="mt-5">
        {isLoading && <p className="text-sm text-admin-muted">Loading…</p>}
        {!isLoading && (activity?.length ?? 0) === 0 && <EmptyState icon="history" title="No recent activity recorded yet." />}
        {!isLoading && activity && activity.length > 0 && (
          <ul className="flex flex-col gap-3">
            {activity.map((entry) => (
              <li key={entry.id} className="rounded-admin-lg border border-admin-border p-3">
                <p className="text-sm font-medium text-admin-ink">{entry.description}</p>
                <p className="mt-0.5 text-xs text-admin-muted">
                  {formatDate(entry.created_at)}
                  {entry.created_by_email ? ` · by ${entry.created_by_email}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

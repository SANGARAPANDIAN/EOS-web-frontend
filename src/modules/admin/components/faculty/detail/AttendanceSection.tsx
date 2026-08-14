"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/modules/admin/components/ui";
import type { FacultyAttendanceSummary } from "@/modules/admin/api/faculty";
import { AttendanceStatusBadge, MiniStat, formatDayDate } from "@/modules/admin/components/faculty/detail/shared";

export function AttendanceSection({
  attendance,
  isLoading,
}: {
  attendance: FacultyAttendanceSummary | undefined;
  isLoading: boolean;
}) {
  // Mirrors the old page's accordion state: nothing expanded explicitly
  // defaults to "just the first month open" (index === 0), tracked lazily
  // only once the admin actually toggles something.
  const [expandedMonths, setExpandedMonths] = useState<Set<string> | null>(null);

  function toggleMonth(month: string, firstMonth: string) {
    setExpandedMonths((prev) => {
      const base = prev ?? new Set([firstMonth]);
      const next = new Set(base);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-admin-ink">Attendance</h3>
      <p className="mt-1 text-sm text-admin-muted">Day-by-day presence — view only.</p>
      <div className="mt-5">
        {isLoading && <p className="text-sm text-admin-muted">Loading…</p>}
        {!isLoading && attendance && attendance.months.length === 0 && (
          <EmptyState icon="event_busy" title="No attendance recorded yet." description="Nothing has populated this faculty's daily attendance yet." />
        )}
        {!isLoading && attendance && attendance.months.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <MiniStat label="Full days" value={String(attendance.overall.full_days)} caption="this year" tone="success" />
              <MiniStat label="Half days" value={String(attendance.overall.half_days)} caption="this year" tone="warning" />
              <MiniStat label="Absent" value={String(attendance.overall.absent)} caption="this year" tone="danger" />
              <MiniStat label="On leave" value={String(attendance.overall.on_leave)} caption="counts against %, this year" tone="warning" />
              <MiniStat
                label="On duty / vacation"
                value={String(attendance.overall.on_duty + attendance.overall.on_vacation)}
                caption="excused, this year"
                tone="primary"
              />
              <MiniStat
                label="Attendance %"
                value={`${attendance.overall.attendance_percentage}%`}
                caption="full + half⁄2, over marked days"
                tone="warning"
              />
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {attendance.months.map((month, index) => {
                const firstMonth = attendance.months[0]?.month ?? month.month;
                const isExpanded = expandedMonths ? expandedMonths.has(month.month) : index === 0;
                return (
                  <div key={month.month} className="rounded-admin-lg border border-admin-border">
                    <button
                      type="button"
                      onClick={() => toggleMonth(month.month, firstMonth)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                        <span className="text-sm font-bold text-admin-ink">{month.label}</span>
                        <span className="text-xs text-admin-muted">
                          {month.full_days} Full · {month.half_days} Half · {month.absent} Absent · {month.attendance_percentage}%
                        </span>
                      </div>
                      <Icon
                        name="chevron_right"
                        size={18}
                        className={`shrink-0 text-admin-subtle transition-transform ${isExpanded ? "-rotate-90" : "rotate-90"}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="overflow-x-auto border-t border-admin-border">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-admin-divider bg-admin-tint">
                              <th className="px-4 py-2.5 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">Date</th>
                              <th className="px-4 py-2.5 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">Day</th>
                              <th className="px-4 py-2.5 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">Punch in</th>
                              <th className="px-4 py-2.5 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">Punch out</th>
                              <th className="px-4 py-2.5 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {month.days.map((day) => (
                              <tr key={day.date} className="border-b border-admin-divider last:border-b-0">
                                <td className="px-4 py-2.5 text-admin-body">{formatDayDate(day.date)}</td>
                                <td className="px-4 py-2.5 text-admin-muted">{day.day}</td>
                                <td className="px-4 py-2.5 text-admin-body">{day.punch_in ?? "—"}</td>
                                <td className="px-4 py-2.5 text-admin-body">{day.punch_out ?? "—"}</td>
                                <td className="px-4 py-2.5">
                                  <AttendanceStatusBadge status={day.status} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

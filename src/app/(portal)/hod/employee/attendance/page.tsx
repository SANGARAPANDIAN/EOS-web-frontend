"use client";

import { useMemo, useState } from "react";
import { Card, Badge, EmptyState } from "@/components/ui";
import { useHodMyAttendance, type HodAttendanceDay } from "@/modules/hod/api/employeeAttendance";
import { getMonthGrid } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

function statusTone(status: string): "accent" | "danger" | "neutral" {
  if (status === "full_day" || status === "half_day") return "neutral";
  if (status === "absent") return "danger";
  if (status === "on_duty") return "accent";
  return "neutral";
}

function statusLabel(status: string): string {
  switch (status) {
    case "full_day":
      return "PRESENT";
    case "half_day":
      return "HALF DAY";
    case "absent":
      return "ABSENT";
    case "on_duty":
      return "ON DUTY";
    case "on_leave":
      return "ON LEAVE";
    case "on_vacation":
      return "ON VACATION";
    case "holiday":
      return "HOLIDAY";
    case "weekly_off":
      return "WEEKLY OFF";
    default:
      return status.toUpperCase();
  }
}

function cellClass(status: string | undefined): string {
  if (status === "absent") return "bg-[#fef2f2] text-[#b91c1c] border-[#fbdcdc]";
  if (status === "on_duty") return "bg-accent-50 text-primary border-border-accent";
  if (status === "holiday" || status === "weekly_off") return "bg-surface-tint text-subtle border-transparent";
  return "border-border-default text-ink";
}

export default function HodEmployeeAttendancePage() {
  const attendance = useHodMyAttendance();
  const [monthIndex, setMonthIndex] = useState<number | null>(null);

  const months = attendance.data?.months ?? [];
  const effectiveIndex = monthIndex ?? months.length - 1;
  const currentMonth = months[effectiveIndex];

  const dayByDate = useMemo(() => {
    const map = new Map<string, HodAttendanceDay>();
    for (const d of currentMonth?.days ?? []) map.set(d.date, d);
    return map;
  }, [currentMonth]);

  const weeks = useMemo(() => {
    if (!currentMonth) return [];
    const [y, m] = currentMonth.month.split("-").map(Number);
    return getMonthGrid(y, m - 1, "sunday");
  }, [currentMonth]);

  const overall = attendance.data?.overall;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {attendance.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load attendance data — please try again.
        </div>
      )}
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">My Attendance</h1>
        <p className="mt-1 text-[13px] text-muted">
          {attendance.data ? `${attendance.data.faculty.name} · Biometric log` : ""}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="hod-hover-card">
          <div className="text-center">
            <div className="text-[32px] font-extrabold text-primary">{overall ? overall.full_days + overall.half_days : "—"}</div>
            <div className="mt-1 text-[11px] font-extrabold tracking-[.08em] text-subtle">PRESENT</div>
          </div>
        </Card>
        <Card className="hod-hover-card">
          <div className="text-center">
            <div className="text-[32px] font-extrabold text-[#b91c1c]">{overall?.absent ?? "—"}</div>
            <div className="mt-1 text-[11px] font-extrabold tracking-[.08em] text-subtle">ABSENT</div>
          </div>
        </Card>
        <Card className="hod-hover-card">
          <div className="text-center">
            <div className="text-[32px] font-extrabold text-primary">{overall?.on_duty ?? "—"}</div>
            <div className="mt-1 text-[11px] font-extrabold tracking-[.08em] text-subtle">ON DUTY</div>
          </div>
        </Card>
        <Card className="hod-hover-card">
          <div className="text-center">
            <div className="text-[32px] font-extrabold text-ink">{overall ? `${overall.attendance_percentage}%` : "—"}</div>
            <div className="mt-1 text-[11px] font-extrabold tracking-[.08em] text-subtle">OVERALL</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-5">
        <Card className="hod-hover-card">
          {!currentMonth ? (
            <EmptyState
              loading={attendance.isLoading}
              size={32}
              message={attendance.isError ? "Couldn't load attendance data." : "No attendance recorded yet."}
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setMonthIndex(Math.max(0, effectiveIndex - 1))}
                  disabled={effectiveIndex === 0}
                  className="flex size-8 items-center justify-center rounded-input border border-border-default text-ink disabled:opacity-30"
                >
                  ‹
                </button>
                <h2 className="text-[18px] font-extrabold text-ink">{currentMonth.label}</h2>
                <button
                  onClick={() => setMonthIndex(Math.min(months.length - 1, effectiveIndex + 1))}
                  disabled={effectiveIndex === months.length - 1}
                  className="flex size-8 items-center justify-center rounded-input border border-border-default text-ink disabled:opacity-30"
                >
                  ›
                </button>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[12px] font-bold text-subtle">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {weeks.flat().map((cell, i) => {
                  if (!cell.iso) return <div key={i} className="h-11" />;
                  const day = dayByDate.get(cell.iso);
                  return (
                    <div
                      key={cell.iso}
                      title={day?.note ?? undefined}
                      className={cn(
                        "flex h-11 items-center justify-center rounded-[10px] border text-[13.5px] font-bold",
                        cellClass(day?.status),
                      )}
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-4 border-t border-divider pt-3 text-[12px] font-semibold text-body">
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-[3px] border border-[#fbdcdc] bg-[#fef2f2]" /> Absent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-[3px] border border-border-accent bg-accent-50" /> On duty
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-[3px] bg-surface-tint" /> Holiday
                </span>
              </div>
            </>
          )}
        </Card>

        <Card>
          <h2 className="text-[18px] font-extrabold text-ink">Recent punches</h2>
          {!attendance.data || attendance.data.recent_punches.length === 0 ? (
            <EmptyState
              loading={attendance.isLoading}
              message={attendance.isError ? "Couldn't load recent punches." : "No punches recorded yet."}
            />
          ) : (
            <div className="mt-2 flex flex-col">
              {attendance.data.recent_punches.map((p) => (
                <div
                  key={p.date}
                  className="hod-hover-row flex items-center justify-between gap-3 rounded-[10px] border-t border-divider px-1 py-3 first:border-t-0"
                >
                  <div className="w-[56px] text-[12.5px] font-bold text-subtle">
                    {new Date(`${p.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold text-ink">
                      {p.note ?? (p.punch_in && p.punch_out ? `${p.punch_in} in · ${p.punch_out} out` : "No punch recorded")}
                    </div>
                    <div className="text-[11.5px] text-subtle">{p.duration ?? "—"}</div>
                  </div>
                  <Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

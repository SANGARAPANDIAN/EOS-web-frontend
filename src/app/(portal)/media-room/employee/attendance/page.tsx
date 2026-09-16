"use client";

import { useMemo, useState } from "react";
import { Card, Badge, Button, Select, EmptyState } from "@/components/ui";
import {
  useMediaRoomMyAttendance,
  useMarkMediaRoomAttendance,
  type MediaRoomAttendanceDay,
  type MarkAttendanceStatus,
} from "@/modules/media-room/api/employeeAttendance";
import { useMyIdentity } from "@/modules/media-room/api/identity";
import { getMonthGrid, monthLabel } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const MARK_OPTIONS: { value: MarkAttendanceStatus; label: string }[] = [
  { value: "full_day", label: "Present" },
  { value: "half_day", label: "Half day" },
  { value: "on_duty", label: "On duty" },
  { value: "on_leave", label: "On leave" },
  { value: "absent", label: "Absent" },
];

function statusTone(status: string): "accent" | "neutral" {
  if (status === "full_day" || status === "half_day" || status === "on_duty") return "accent";
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
    case "holiday":
      return "HOLIDAY";
    case "weekly_off":
      return "WEEKLY OFF";
    default:
      return status.toUpperCase();
  }
}

/** Matches the design's actual cell logic exactly (not the legend swatch, which uses a red it never applies) — Absent renders navy-on-light-gray, same family as the ABSENT stat tile/badge. isWeekend is a purely decorative day-of-week rule, independent of any recorded status. */
function cellClass(status: string | undefined, isWeekend: boolean): string {
  if (status === "absent") return "bg-[#eef2f8] text-[#14306e] font-extrabold";
  if (status === "on_duty") return "bg-[#e9efff] text-[#1d4ed8] font-extrabold";
  if (status === "holiday" || status === "weekly_off" || isWeekend) return "bg-[#f4f6fa] text-[#9aa3b2]";
  return "bg-surface text-ink";
}

export default function MediaRoomEmployeeAttendancePage() {
  const identity = useMyIdentity();
  const attendance = useMediaRoomMyAttendance();
  const mark = useMarkMediaRoomAttendance();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [markStatus, setMarkStatus] = useState<MarkAttendanceStatus>("full_day");
  const [markError, setMarkError] = useState<string | null>(null);

  async function markToday() {
    setMarkError(null);
    try {
      await mark.mutateAsync({ status: markStatus });
    } catch (err: unknown) {
      setMarkError((err as { message?: string })?.message ?? "Could not mark attendance.");
    }
  }

  function shiftMonth(delta: number) {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  const notReady = attendance.data && !attendance.data.ready;
  const months = attendance.data?.months ?? [];
  const cursorKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const currentMonth = months.find((m) => m.month === cursorKey);

  const dayByDate = useMemo(() => {
    const map = new Map<string, MediaRoomAttendanceDay>();
    for (const d of currentMonth?.days ?? []) map.set(d.date, d);
    return map;
  }, [currentMonth]);

  const weeks = useMemo(() => getMonthGrid(cursor.year, cursor.month, "sunday"), [cursor]);

  const overall = attendance.data?.overall;
  const recentPunches = attendance.data?.recent_punches ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">My Attendance</h1>
          <p className="mt-1 text-[13px] text-muted">
            {identity.data?.name ?? "…"} · Self-logged{" "}
            <span title="No biometric device is wired up for this account — status is marked manually.">(no biometric device)</span>
          </p>
        </div>
        {!notReady && (
          <div className="flex items-center gap-2">
            <Select className="w-auto" value={markStatus} onChange={(e) => setMarkStatus(e.target.value as MarkAttendanceStatus)}>
              {MARK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Button variant="primarySmall" className="w-auto" onClick={markToday} disabled={mark.isPending}>
              Mark today
            </Button>
          </div>
        )}
      </div>
      {markError && <div className="text-[13px] font-semibold text-danger-fg">{markError}</div>}

      {notReady ? (
        <EmptyState message="Attendance logging isn't set up yet — ask an admin to run the pending database migration." />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card data-mr-lift="1">
              <div className="text-center">
                <div className="text-[32px] font-extrabold text-primary">{overall ? overall.full_days + overall.half_days : "—"}</div>
                <div className="mt-1 text-[11px] font-extrabold tracking-[.08em] text-subtle">PRESENT</div>
              </div>
            </Card>
            <Card data-mr-lift="1">
              <div className="text-center">
                <div className="text-[32px] font-extrabold text-primary-dark">{overall?.absent ?? "—"}</div>
                <div className="mt-1 text-[11px] font-extrabold tracking-[.08em] text-subtle">ABSENT</div>
              </div>
            </Card>
            <Card data-mr-lift="1">
              <div className="text-center">
                <div className="text-[32px] font-extrabold text-ink">{overall?.on_duty ?? "—"}</div>
                <div className="mt-1 text-[11px] font-extrabold tracking-[.08em] text-subtle">ON DUTY</div>
              </div>
            </Card>
            <Card data-mr-lift="1">
              <div className="text-center">
                <div className="text-[32px] font-extrabold text-ink">{overall ? `${overall.attendance_percentage}%` : "—"}</div>
                <div className="mt-1 text-[11px] font-extrabold tracking-[.08em] text-subtle">OVERALL</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-[1fr_1.1fr] gap-5">
            <Card data-mr-lift="1">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="flex size-11 items-center justify-center rounded-[11px] border border-border-default text-[16.5px] text-ink hover:bg-surface-tint"
                >
                  ‹
                </button>
                <h2 className="text-[22px] font-extrabold tracking-[-.01em] text-ink">{monthLabel(cursor.year, cursor.month)}</h2>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="flex size-11 items-center justify-center rounded-[11px] border border-border-default text-[16.5px] text-ink hover:bg-surface-tint"
                >
                  ›
                </button>
              </div>
              <div className="mt-[22px] grid grid-cols-7 gap-2 text-center text-[14px] font-bold text-subtle">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {weeks.flat().map((cell, i) => {
                  if (!cell.iso) return <div key={i} className="h-14" />;
                  const day = dayByDate.get(cell.iso);
                  const isWeekend = i % 7 === 0;
                  return (
                    <div
                      key={cell.iso}
                      title={day?.note ?? undefined}
                      className={cn("flex h-14 items-center justify-center rounded-[11px] text-[16.5px] font-semibold", cellClass(day?.status, isWeekend))}
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap gap-5 border-t border-divider pt-4 text-[14px] text-body">
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-[4px] border border-border-default bg-surface" /> Present
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-[4px] bg-[#eef2f8]" /> Absent
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-[4px] bg-[#e9efff]" /> On Duty
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-[4px] bg-[#f4f6fa]" /> Holiday
                </span>
              </div>
            </Card>

            <Card data-mr-lift="1">
              <h2 className="text-[18px] font-extrabold text-ink">Recent punches</h2>
              {attendance.isLoading ? (
                <EmptyState loading />
              ) : recentPunches.length === 0 ? (
                <EmptyState message="No punches recorded yet." />
              ) : (
                <div className="mt-2 flex flex-col">
                  {recentPunches.map((p) => (
                    <div key={p.date} className="flex items-center justify-between gap-3 border-t border-divider px-1 py-3 first:border-t-0">
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
        </>
      )}
    </div>
  );
}

"use client";

import { Fragment, useState } from "react";
import { Card, EmptyState, Skeleton, SkeletonStatTiles, SkeletonRows, SkeletonBlock } from "@/components/ui";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  useHodEmployeeTimetableDay,
  useHodEmployeeTimetableWeek,
  type HodTimetablePeriod,
  type HodTimetableStats,
  type HodTimetableWeek,
  type HodTimetableWeekCell,
} from "@/modules/hod/api/employeeTimetable";
import { toIsoDateString } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function StatTiles({ stats }: { stats: HodTimetableStats }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card className="hod-hover-card">
        <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Classes</div>
        <div className="mt-1.5 text-[26px] font-extrabold text-ink">{stats.classes}</div>
      </Card>
      <Card className="hod-hover-card">
        <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Labs</div>
        <div className="mt-1.5 text-[26px] font-extrabold text-ink">{stats.labs}</div>
      </Card>
      <Card className="hod-hover-card">
        <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Free hours</div>
        <div className="mt-1.5 text-[26px] font-extrabold text-ink">{stats.free_hours ?? "—"}</div>
      </Card>
      <Card className="hod-hover-card">
        <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Total hours</div>
        <div className="mt-1.5 text-[26px] font-extrabold text-ink">{stats.total_hours}</div>
      </Card>
    </div>
  );
}

function PeriodRow({ period, done, isNext }: { period: HodTimetablePeriod; done: boolean; isNext: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[80px_1fr_90px] items-center gap-4 rounded-[12px] border px-[18px] py-3.5",
        isNext ? "border-[#bfdbfe] bg-[#eff6ff]" : "border-[#e6e8ef] bg-white",
      )}
    >
      <div>
        <div className="font-mono text-[12.5px] font-extrabold text-primary">{period.start_time}</div>
        <div className="mt-0.5 text-[11px] font-bold text-[#9aa0b0]">P{period.period_number}</div>
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            "truncate text-[14.5px] font-extrabold",
            done ? "text-[#9aa0b0] line-through" : "text-ink",
          )}
        >
          {period.subject_name}
        </div>
        <div className="mt-0.5 truncate text-[12px] font-semibold text-[#9aa0b0]">{period.class_label}</div>
      </div>
      <div className="flex justify-end">
        <span
          className={cn(
            "whitespace-nowrap rounded-pill px-[13px] py-1.5 font-mono text-[11.5px] font-extrabold",
            period.venue_name ? "bg-[#eaf1ff] text-primary" : "bg-[#f4f5f8] text-[#9aa0b0]",
          )}
        >
          {period.venue_name ?? "—"}
        </span>
      </div>
    </div>
  );
}

export default function HodEmployeeTimetablePage() {
  const [mode, setMode] = useState<"today" | "week">("today");
  const [date, setDate] = useState(() => toIsoDateString(new Date()));

  const day = useHodEmployeeTimetableDay(mode === "today" ? date : undefined);
  const week = useHodEmployeeTimetableWeek(mode === "week" ? date : undefined);

  const faculty = day.data?.faculty ?? week.data?.faculty;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Timetable</h1>
          <p className="mt-1 text-[13px] text-muted">
            {faculty
              ? [faculty.name, faculty.department_code, faculty.office_room ? `staff room ${faculty.office_room}` : null]
                  .filter(Boolean)
                  .join(" · ")
              : ""}
          </p>
        </div>
        <SegmentedTabs
          value={mode}
          onChange={(k) => setMode(k as "today" | "week")}
          options={[
            { key: "today", label: "Today" },
            { key: "week", label: "Full week" },
          ]}
        />
      </div>

      {(mode === "today" ? day.isError : week.isError) && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load the timetable — please try again.
        </div>
      )}

      {mode === "today" ? (
        day.isError ? null : day.isLoading || !day.data ? (
          <div className="flex flex-col gap-5">
            <Skeleton className="h-[86px] w-full" />
            <SkeletonStatTiles count={4} />
            <SkeletonRows count={4} />
          </div>
        ) : (
          <>
            <div className="rounded-[16px] bg-[#1d3fa8] p-[18px]">
              <div className="text-[13.5px] font-bold text-white">{formatLongDate(day.data.date)}</div>
              <div className="mt-3.5 flex gap-3">
                {day.data.week_dates.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => setDate(d.date)}
                    className={cn(
                      "flex-1 rounded-[12px] py-3 text-center",
                      d.is_selected ? "bg-white" : "bg-white/[0.16]",
                    )}
                  >
                    <div
                      className={cn(
                        "text-[11px] font-extrabold tracking-[1px]",
                        d.is_selected ? "text-[#4b5265]" : "text-white/85",
                      )}
                    >
                      {d.day_label}
                    </div>
                    <div className={cn("mt-1 text-[22px] font-extrabold", d.is_selected ? "text-primary" : "text-white")}>
                      {String(d.day_number).padStart(2, "0")}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <StatTiles stats={day.data.stats} />

            <div className="flex flex-col gap-2.5">
              {day.data.periods.length === 0 ? (
                <Card>
                  <EmptyState message="No periods scheduled for this day." />
                </Card>
              ) : (
                (() => {
                  const isToday = date === toIsoDateString(new Date());
                  const nowHm = new Date().toTimeString().slice(0, 5);
                  const nextId = isToday ? day.data.periods.find((p) => p.end_time >= nowHm)?.id : undefined;
                  return day.data.periods.map((p) => (
                    <PeriodRow
                      key={p.id}
                      period={p}
                      done={isToday && p.end_time < nowHm}
                      isNext={isToday && p.id === nextId}
                    />
                  ));
                })()
              )}
            </div>
          </>
        )
      ) : week.isError ? null : week.isLoading || !week.data ? (
        <SkeletonBlock className="min-h-[420px]" />
      ) : week.data.columns.length === 0 ? (
        <Card>
          <EmptyState message="Timetable not published for this week yet." />
        </Card>
      ) : (
        <WeekGrid week={week.data} />
      )}
    </div>
  );
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function WeekGrid({ week }: { week: HodTimetableWeek }) {
  const gridTemplateColumns = `70px repeat(${week.columns.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-x-auto rounded-[16px] border border-[#e6e8ef] bg-white p-[18px]">
      <div className="grid gap-2.5" style={{ gridTemplateColumns }}>
        <div />
        {week.columns.map((col) => (
          <div
            key={col.period_number}
            className="pb-1 text-center font-mono text-[11px] font-bold text-[#9aa0b0]"
          >
            {formatTime12h(col.start_time)}
          </div>
        ))}

        {week.rows.map((row) => (
          <Fragment key={row.date}>
            <div className="flex items-center text-[13px] font-extrabold text-ink">{row.day_label}</div>
            {row.cells.map((cell, i) => (
              <WeekCell key={`${row.date}-${i}`} cell={cell} />
            ))}
          </Fragment>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-[22px] border-t border-[#f0f2f6] pt-4 text-[12px] font-semibold text-[#6b7280]">
        <LegendSwatch label="Class" className="border-[#dbe6ff] bg-[#eaf1ff]" />
        <LegendSwatch label="Lab" className="border-[#b6d0ff] bg-[#cfe0ff]" />
        <LegendSwatch label="Free hour" className="border-[#e6e8ef] bg-[#fbfcfe]" />
        <LegendSwatch label="Break" className="border-[#e6e8ef] bg-[#fafbfd]" />
      </div>
    </div>
  );
}

function WeekCell({ cell }: { cell: HodTimetableWeekCell }) {
  const isFilled = cell.type === "class" || cell.type === "lab";
  const period = isFilled ? (cell as HodTimetablePeriod) : null;
  const isLab = period?.type === "lab";

  const boxClass = isFilled
    ? isLab
      ? "border-[#b6d0ff] bg-[#cfe0ff]"
      : "border-[#dbe6ff] bg-[#eaf1ff]"
    : cell.type === "break"
      ? "border-dashed border-[#e6e8ef] bg-[#fafbfd]"
      : "border-dashed border-[#e6e8ef] bg-[#fbfcfe]";

  const title = period ? `${period.subject_code} · ${period.class_label}` : cell.type === "break" ? "Break" : "Free";
  const titleColor = isFilled ? "text-primary" : "text-[#9aa0b0]";
  const room = period?.venue_name ?? null;

  return (
    <div className={cn("min-h-[78px] rounded-[10px] border px-3 py-[11px]", boxClass)}>
      <div className={cn("text-[12.5px] font-bold leading-[1.35]", titleColor)}>{title}</div>
      {room && (
        <div className={cn("mt-[5px] font-mono text-[11px] font-semibold", isLab ? "text-primary" : "text-[#8a90a2]")}>
          {room}
        </div>
      )}
    </div>
  );
}

function LegendSwatch({ label, className }: { label: string; className: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3.5 rounded-[5px] border", className)} />
      {label}
    </span>
  );
}

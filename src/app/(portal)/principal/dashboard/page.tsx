"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMyIdentity } from "@/modules/principal/api/profile";
import {
  usePrincipalDashboardSummary,
  usePrincipalDashboardInsights,
  isPeriodSummary,
  isTodaySummary,
  type DashboardPeriod,
} from "@/modules/principal/api/dashboard";
import { useAnnouncements } from "@/modules/shared/api/announcements";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalPlacementCard } from "@/modules/principal/components/PrincipalPlacementCard";
import { PrincipalAttentionCard } from "@/modules/principal/components/PrincipalAttentionCard";
import { PrincipalCampusCard } from "@/modules/principal/components/PrincipalCampusCard";
import { principalColors } from "@/modules/principal/theme";
import { formatLongDate, formatDayAndTime, greetingForHour } from "@/lib/utils/date";

const PERIOD_TABS: { key: DashboardPeriod; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "term", label: "This term" },
  { key: "year", label: "This year" },
];

export default function PrincipalDashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const identity = useMyIdentity();
  const summary = usePrincipalDashboardSummary(period);
  const insights = usePrincipalDashboardInsights();
  const announcements = useAnnouncements();

  const displayName = identity.data?.name;
  const greetingName = displayName ? `, ${displayName}` : "";

  const s = summary.data;
  const periodView = s && isPeriodSummary(s) ? s : undefined;
  const todayView = s && isTodaySummary(s) ? s : undefined;
  const markedTotal = todayView
    ? todayView.students.present_today + todayView.students.absent_today + todayView.students.on_duty_today
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          {greetingForHour()}
          {greetingName}
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          {periodView ? `${periodView.period_label} · consolidated institution figures` : formatLongDate()}
          {todayView && ` · figures for today only`}
        </p>
        {identity.isError && (
          <p className="mt-1.5 text-[13px]" style={{ color: principalColors.textFaint }}>
            No profile record is linked to this account yet — showing account email only until one is added.
          </p>
        )}
      </div>

      <div className="flex gap-1 rounded-xl p-1" style={{ background: principalColors.borderLight, width: "fit-content" }}>
        {PERIOD_TABS.map((tab) => {
          const active = period === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPeriod(tab.key)}
              className="h-[38px] rounded-[9px] px-[18px] text-sm font-semibold transition-colors"
              style={{
                background: active ? principalColors.bg : "transparent",
                color: active ? principalColors.heading : principalColors.textFaint,
                boxShadow: active ? "0 1px 2px rgba(13,30,79,0.08)" : undefined,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {todayView && (
          <>
            <PrincipalStatCard
              label="Total students"
              icon="groups"
              loading={summary.isLoading}
              value={todayView.students.total_active.toLocaleString("en-IN")}
              delta={todayView.students.present_today.toLocaleString("en-IN")}
              sub="present today"
              progressPercent={
                todayView.students.total_active > 0
                  ? (todayView.students.present_today / todayView.students.total_active) * 100
                  : undefined
              }
              footer={`${todayView.students.absent_today.toLocaleString("en-IN")} marked absent today`}
              href="/principal/students"
            />
            <PrincipalStatCard
              label="Faculty & staff"
              icon="badge"
              loading={summary.isLoading}
              value={(todayView.faculty.total_active + todayView.non_teaching_staff.total_active).toLocaleString("en-IN")}
              delta={todayView.faculty.reported_today.toLocaleString("en-IN")}
              sub="faculty on duty today"
              progressPercent={
                todayView.faculty.total_active > 0
                  ? (todayView.faculty.reported_today / todayView.faculty.total_active) * 100
                  : undefined
              }
              footer={
                todayView.faculty.attendance_marked_today
                  ? `${todayView.faculty.on_leave_today.toLocaleString("en-IN")} faculty on approved leave`
                  : "Today's faculty attendance hasn't been marked yet"
              }
              href="/principal/faculty"
            />
            <PrincipalStatCard
              label="Mean attendance"
              icon="fact_check"
              loading={summary.isLoading}
              value={todayView.students.attendance_percentage_today != null ? `${todayView.students.attendance_percentage_today}%` : "—"}
              delta={markedTotal > 0 ? todayView.students.present_today.toLocaleString("en-IN") : undefined}
              sub={markedTotal > 0 ? `of ${markedTotal.toLocaleString("en-IN")} marked today` : undefined}
              progressPercent={todayView.students.attendance_percentage_today ?? undefined}
              footer={markedTotal > 0 ? `${todayView.students.on_duty_today.toLocaleString("en-IN")} on official duty` : "No attendance marked yet today"}
              href="/principal/students"
            />
          </>
        )}

        {periodView && (
          <>
            <PrincipalStatCard
              label="Total students"
              icon="groups"
              loading={summary.isLoading}
              value={periodView.students.total_active.toLocaleString("en-IN")}
              delta={`+${periodView.students.new_admissions.toLocaleString("en-IN")}`}
              sub="new admissions this period"
              href="/principal/students"
            />
            <PrincipalStatCard
              label="Faculty & staff"
              icon="badge"
              loading={summary.isLoading}
              value={(periodView.faculty.total_active + periodView.non_teaching_staff.total_active).toLocaleString("en-IN")}
              delta={`+${periodView.faculty.new_hires.toLocaleString("en-IN")}`}
              sub="hires this period"
              href="/principal/faculty"
            />
            <PrincipalStatCard
              label="Mean attendance"
              icon="fact_check"
              loading={summary.isLoading}
              value={periodView.attendance.percentage != null ? `${periodView.attendance.percentage}%` : "—"}
              delta={periodView.attendance.percentage != null ? periodView.attendance.students_below_threshold.toLocaleString("en-IN") : undefined}
              sub={periodView.attendance.percentage != null ? "students below 75%" : undefined}
              progressPercent={periodView.attendance.percentage ?? undefined}
              footer={periodView.attendance.best_month ? `best month: ${periodView.attendance.best_month}` : "no attendance recorded this period yet"}
              href="/principal/students"
            />
          </>
        )}

        {!s && (
          <>
            <PrincipalStatCard label="Total students" icon="groups" loading={summary.isLoading} value="—" href="/principal/students" />
            <PrincipalStatCard label="Faculty & staff" icon="badge" loading={summary.isLoading} value="—" href="/principal/faculty" />
            <PrincipalStatCard label="Mean attendance" icon="fact_check" loading={summary.isLoading} value="—" href="/principal/students" />
          </>
        )}

        <PrincipalStatCard
          label="Departments"
          icon="account_tree"
          loading={summary.isLoading}
          value={s ? s.departments.total.toLocaleString("en-IN") : "—"}
          footer="across the institution"
          href="/principal/departments"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <PrincipalPlacementCard data={insights.data?.placement} isLoading={insights.isLoading} />
        <PrincipalAttentionCard flags={insights.data?.attention_flags} isLoading={insights.isLoading} />

        <div
          className="flex h-[340px] flex-col overflow-hidden rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
          style={{ background: principalColors.bg, borderColor: principalColors.border }}
        >
          <div className="flex items-center gap-3 border-b px-5 py-[18px]" style={{ borderColor: principalColors.borderLight }}>
            <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              Announcements
            </div>
            <Link href="/principal/announcements" className="ml-auto text-sm font-semibold" style={{ color: principalColors.primary }}>
              View all
            </Link>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            {announcements.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-b px-5 py-3.5 last:border-b-0" style={{ borderColor: principalColors.borderMuted }}>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-2 h-3.5 w-32" />
                </div>
              ))}
            {announcements.data?.length === 0 && (
              <div className="px-5 py-6 text-sm" style={{ color: principalColors.textFaint }}>
                No announcements have been posted to the Principal role yet.
              </div>
            )}
            {announcements.data?.slice(0, 6).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => router.push("/principal/announcements")}
                className="hover-lift w-full border-b px-5 py-3.5 text-left last:border-b-0"
                style={{ borderColor: principalColors.borderMuted }}
              >
                <div className="text-sm font-semibold" style={{ color: principalColors.heading }}>
                  {a.title}
                </div>
                <div className="mt-0.5 line-clamp-2 text-[13px]" style={{ color: principalColors.textFaint }}>
                  {a.content}
                </div>
                <div className="mt-1 text-xs" style={{ color: principalColors.textSubtle }}>
                  {a.posted_by?.name ?? "Unknown"} · {formatDayAndTime(a.created_at)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <PrincipalCampusCard data={insights.data?.campus} isLoading={insights.isLoading} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import {
  usePlacementsSummary,
  usePlacementDepartments,
  usePlacementDepartmentDetail,
  usePlacementSections,
  type PlacementDepartmentCard,
} from "@/modules/principal/api/placements";

function abbrev(code: string): string {
  return code.slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

function PlacementMiniCard({
  icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div
      className="flex h-full flex-col justify-between rounded-2xl border p-5 hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
      style={{ background: principalColors.bg, borderColor: principalColors.border }}
    >
      <div className="flex items-center gap-2">
        <Icon name={icon} size={16} style={{ color: principalColors.primary }} />
        <span className="text-[13px] font-semibold" style={{ color: principalColors.body }}>
          {label}
        </span>
      </div>
      {loading ? (
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-2 h-3.5 w-32" />
        </div>
      ) : (
        <div>
          <div
            className="text-[28px] font-extrabold leading-none"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
          >
            {value}
          </div>
          {sub && (
            <div className="mt-1.5 truncate text-[12.5px]" style={{ color: principalColors.textFaint }}>
              {sub}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DepartmentTile({ dept, onOpen }: { dept: PlacementDepartmentCard; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-3.5 rounded-2xl border p-5 text-left hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
      style={{ background: principalColors.bg, borderColor: principalColors.border }}
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold"
          style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}
        >
          {abbrev(dept.department.code)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold" style={{ color: principalColors.heading }}>
              {dept.department.code}
            </span>
            <span className="text-xs font-semibold" style={{ color: principalColors.textFaint }}>
              #{String(dept.rank).padStart(2, "0")}
            </span>
          </div>
          <div className="truncate text-[13px]" style={{ color: principalColors.textFaint }}>
            {dept.department.name}
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-[32px] font-extrabold leading-none" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.primaryDark }}>
            {dept.placement_rate != null ? `${dept.placement_rate}%` : "—"}
          </div>
          <div className="mt-1 text-xs" style={{ color: principalColors.textFaint }}>
            placement rate
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-base font-bold" style={{ color: principalColors.heading }}>
            {dept.placed}/{dept.eligible}
          </div>
          <div className="text-xs" style={{ color: principalColors.textFaint }}>
            {dept.unplaced} unplaced
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: principalColors.borderMuted }}>
        <div className="text-xs" style={{ color: principalColors.textFaint }}>
          Avg package
          <div className="font-mono text-sm font-semibold" style={{ color: principalColors.body }}>
            {dept.average_package != null ? `₹${dept.average_package} LPA` : "—"}
          </div>
        </div>
        <div className="text-right text-xs" style={{ color: principalColors.textFaint }}>
          Highest
          <div className="font-mono text-sm font-semibold" style={{ color: principalColors.body }}>
            {dept.highest_package != null ? `₹${dept.highest_package} LPA` : "—"}
          </div>
        </div>
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border"
          style={{ borderColor: principalColors.border, color: principalColors.primary }}
        >
          <Icon name="arrow_forward" size={18} />
        </span>
      </div>
    </button>
  );
}

function DepartmentDetailView({ departmentId, onBack }: { departmentId: number; onBack: () => void }) {
  const detail = usePlacementDepartmentDetail(departmentId);
  const sections = usePlacementSections(departmentId);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
          style={{ borderColor: principalColors.border, color: principalColors.body }}
        >
          <Icon name="arrow_back" size={18} />
          All departments
        </button>
        <div className="text-[13px]" style={{ color: principalColors.textFaint }}>
          Placements · {detail.data?.code ?? "…"}
        </div>
      </div>

      {detail.data && (
        <>
          <div className="flex items-center gap-4">
            <div
              className="grid h-14 w-14 place-items-center rounded-2xl text-lg font-extrabold"
              style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}
            >
              {abbrev(detail.data.code)}
            </div>
            <div>
              <h1
                className="text-[30px] font-extrabold tracking-tight"
                style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
              >
                {detail.data.name}
              </h1>
              <p className="mt-1 text-[15px]" style={{ color: principalColors.textFaint }}>
                {detail.data.code} · {detail.data.hod ? `${detail.data.hod.name} · HoD` : "No HoD assigned"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <PrincipalStatCard
              label="Students placed"
              icon="work"
              loading={detail.isLoading}
              value={detail.data.placed}
              sub={`of ${detail.data.eligible} eligible · ${detail.data.placement_rate != null ? `${detail.data.placement_rate}%` : "—"} placed`}
            />
            <PrincipalStatCard label="Unplaced" icon="hourglass_empty" loading={detail.isLoading} value={detail.data.unplaced} sub="not yet placed" />
            <PrincipalStatCard
              label="Highest package"
              icon="military_tech"
              loading={detail.isLoading}
              value={detail.data.highest_package != null ? `₹${detail.data.highest_package} LPA` : "—"}
            />
            <PrincipalStatCard
              label="Average package"
              icon="payments"
              loading={detail.isLoading}
              value={detail.data.average_package != null ? `₹${detail.data.average_package} LPA` : "—"}
              sub="across all offers"
            />
          </div>
        </>
      )}

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Section-wise placement
          </div>
          <p className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
            Class advisor, eligibility and offers for every section
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["SECTION", "CLASS ADVISOR", "STRENGTH", "ELIGIBLE", "PLACED", "UNPLACED", "HIGHEST", "AVERAGE", "TOP RECRUITER"].map((h) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${
                      ["STRENGTH", "ELIGIBLE", "PLACED", "UNPLACED", "HIGHEST", "AVERAGE"].includes(h) ? "text-right" : "text-left"
                    }`}
                    style={{ color: principalColors.textFaint }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.isLoading && <PrincipalTableSkeleton columns={9} />}
              {sections.data?.map((s) => (
                <tr key={s.id} className="border-t transition-colors hover:bg-[#F1F6FE] hover:shadow-[inset_0_0_0_1.5px_#1D47AE]" style={{ borderColor: principalColors.borderMuted }}>
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                    {s.section} {s.semester != null ? `· Sem ${s.semester}` : ""}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5" style={{ color: principalColors.body }}>
                    {s.advisor?.name ?? "—"}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {s.strength}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {s.eligible}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.primaryDark }}>
                    {s.placed}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {s.unplaced}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {s.highest_package != null ? `₹${s.highest_package}L` : "—"}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {s.average_package != null ? `₹${s.average_package}L` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5" style={{ color: principalColors.body }}>
                    {s.top_recruiter ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!sections.isLoading && (sections.data?.length ?? 0) === 0 && (
          <div className="px-5 py-8 text-center text-sm" style={{ color: principalColors.textFaint }}>
            No sections found for this department.
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrincipalPlacementsPage() {
  const [openDepartmentId, setOpenDepartmentId] = useState<number | null>(null);
  const summary = usePlacementsSummary();
  const departments = usePlacementDepartments();

  if (openDepartmentId != null) {
    return <DepartmentDetailView departmentId={openDepartmentId} onBack={() => setOpenDepartmentId(null)} />;
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Placements
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          {summary.data ? `${summary.data.companies_count} companies · ${summary.data.offers_released} offers released` : "Loading…"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div
          className="flex flex-col gap-6 rounded-2xl border p-6 hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
          style={{ background: principalColors.bg, borderColor: principalColors.border }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                OVERALL PLACEMENT
              </div>
              {summary.isLoading ? (
                <>
                  <Skeleton className="mt-2 h-[52px] w-32" />
                  <Skeleton className="mt-2.5 h-4 w-56" />
                </>
              ) : (
                <>
                  <div className="mt-2 flex items-end gap-3">
                    <div
                      className="text-[64px] font-extrabold leading-none"
                      style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
                    >
                      {summary.data?.overall.percentage != null ? `${summary.data.overall.percentage}%` : "—"}
                    </div>
                  </div>
                  <div className="mt-2.5 text-sm" style={{ color: principalColors.textFaint }}>
                    {summary.data ? `${summary.data.overall.placed} placed of ${summary.data.overall.eligible} eligible · ${summary.data.overall.unplaced} still open` : ""}
                  </div>
                </>
              )}
            </div>
            {summary.data?.leading_department && (
              <div className="text-right">
                <div className="text-[13px]" style={{ color: principalColors.textFaint }}>
                  Leading department
                </div>
                <div className="mt-1 text-xl font-extrabold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
                  {summary.data.leading_department.department.code}
                </div>
                <div className="text-[13px]" style={{ color: principalColors.textFaint }}>
                  {summary.data.leading_department.placement_rate}% placed
                </div>
              </div>
            )}
          </div>

          <div className="flex items-end justify-between text-[13px]" style={{ color: principalColors.textFaint }}>
            <span>{summary.data ? `All drives on file · ${summary.data.companies_count} recruiters` : ""}</span>
            <span>No target configured</span>
          </div>
        </div>

        <div className="grid grid-cols-2 grid-rows-2 gap-3.5">
          <PlacementMiniCard
            label="Highest package"
            icon="military_tech"
            loading={summary.isLoading}
            value={summary.data?.highest_package ? `₹${summary.data.highest_package.value} LPA` : "—"}
            sub={summary.data?.highest_package ? [summary.data.highest_package.company_name, summary.data.highest_package.job_role].filter(Boolean).join(" · ") : undefined}
          />
          <PlacementMiniCard
            label="Average package"
            icon="request_quote"
            loading={summary.isLoading}
            value={summary.data?.average_package != null ? `₹${summary.data.average_package} LPA` : "—"}
            sub={summary.data ? `across ${summary.data.offers_released} offers` : undefined}
          />
          <PlacementMiniCard
            label="Multiple offers"
            icon="groups"
            loading={summary.isLoading}
            value={summary.data?.multiple_offers_count ?? "—"}
            sub="students with 2+ offers"
          />
          <PlacementMiniCard
            label="Drives this month"
            icon="event_repeat"
            loading={summary.isLoading}
            value={summary.data?.drives_this_month ?? "—"}
            sub={summary.data?.next_drive ? `next: ${summary.data.next_drive.company_name} · ${formatDate(summary.data.next_drive.scheduled_date)}` : "no upcoming drive on file"}
          />
        </div>
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Departments
          </div>
          <p className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
            Ordered by placement rate · open a department for section-wise detail
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {departments.data?.map((dept) => (
            <DepartmentTile key={dept.department.id} dept={dept} onOpen={() => setOpenDepartmentId(dept.department.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

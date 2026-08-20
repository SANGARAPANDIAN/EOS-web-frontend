"use client";

import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import {
  useFinanceSummary,
  useCollectionByYear,
  useFeeHeadBreakdown,
  useDuesByAge,
  useScholarships,
  useBudget,
} from "@/modules/principal/api/finance";

function formatRupees(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function statusBadge(status: string): { fg: string; bg: string; bd: string } {
  const lower = status.toLowerCase();
  if (lower.includes("sanction") || lower.includes("approved")) return { fg: "#1B7A3D", bg: "#E9F8EE", bd: "#BEE9CC" };
  if (lower.includes("partly")) return { fg: "#92400E", bg: "#FEF3C7", bd: "#FBDE9A" };
  return { fg: principalColors.primaryDark, bg: principalColors.surfaceTint, bd: principalColors.chipBorder };
}

export default function PrincipalFinancePage() {
  const summary = useFinanceSummary();
  const collectionByYear = useCollectionByYear();
  const feeHeads = useFeeHeadBreakdown();
  const duesByAge = useDuesByAge();
  const scholarships = useScholarships();
  const budget = useBudget();

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Finance &amp; fees
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          Oversight only · transaction-level accounting stays with the Finance office
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <PrincipalStatCard
          label="Total collection"
          icon="payments"
          loading={summary.isLoading}
          value={summary.data ? formatRupees(summary.data.total_collection) : "—"}
          sub={summary.data?.collection_percentage_of_demand != null ? `${summary.data.collection_percentage_of_demand}% of demand` : undefined}
        />
        <PrincipalStatCard
          label="Outstanding dues"
          icon="request_quote"
          loading={summary.isLoading}
          value={summary.data ? formatRupees(summary.data.outstanding_dues) : "—"}
          sub={summary.data ? `${summary.data.students_with_dues.toLocaleString("en-IN")} students` : undefined}
        />
        <PrincipalStatCard
          label="Scholarships"
          icon="school"
          loading={summary.isLoading}
          value={summary.data ? (summary.data.scholarships.tracked ? formatRupees(summary.data.scholarships.total_value) : "—") : "—"}
          sub={
            summary.data
              ? summary.data.scholarships.tracked
                ? `${summary.data.scholarships.beneficiaries.toLocaleString("en-IN")} beneficiaries`
                : "Not tracked in this system yet"
              : undefined
          }
        />
        <PrincipalStatCard
          label="Budget utilised"
          icon="donut_large"
          loading={summary.isLoading}
          value={summary.data?.budget.utilised_percentage != null ? `${summary.data.budget.utilised_percentage}%` : "—"}
          sub={
            summary.data?.budget.total_sanctioned != null
              ? `${formatRupees(summary.data.budget.total_spent)} of ${formatRupees(summary.data.budget.total_sanctioned)}`
              : summary.data
                ? `${formatRupees(summary.data.budget.total_spent)} spent · no sanctioned budget on file`
                : undefined
          }
        />
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Collection by year of study
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["YEAR", "DEMAND", "COLLECTED", "PENDING"].map((h) => (
                  <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${h !== "YEAR" ? "text-right" : "text-left"}`} style={{ color: principalColors.textFaint }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {collectionByYear.isLoading && <PrincipalTableSkeleton columns={4} />}
              {collectionByYear.data?.map((row) => (
                <tr key={row.year} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                  <td className="px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                    {row.year}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {formatRupees(row.demand)}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {formatRupees(row.collected)}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.primaryDark }}>
                    {formatRupees(row.pending)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Major expenditure
          </div>
        </div>
        <div className="flex flex-col">
          {budget.data?.heads
            .filter((h) => h.spent != null)
            .map((h) => (
              <div key={h.head} className="flex items-center justify-between border-b px-5 py-3.5 last:border-b-0" style={{ borderColor: principalColors.borderMuted }}>
                <span style={{ color: principalColors.body }}>{h.head}</span>
                <span className="font-mono font-semibold" style={{ color: principalColors.heading }}>
                  {formatRupees(h.spent ?? 0)}
                </span>
              </div>
            ))}
        </div>
        <div className="border-t px-5 py-3.5 text-xs" style={{ borderColor: principalColors.borderLight, color: principalColors.textSubtle }}>
          Only Salaries and benefits has a real spend figure in this system today (from processed payroll). Other
          expenditure heads (infrastructure, lab equipment, research) aren&apos;t tracked as classified spend yet.
        </div>
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Fee head breakdown
          </div>
          <p className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
            Demand, collection and balance across all fee heads on file
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["FEE HEAD", "DEMAND", "COLLECTED", "BALANCE", "RECOVERY"].map((h) => (
                  <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${h !== "FEE HEAD" ? "text-right" : "text-left"}`} style={{ color: principalColors.textFaint }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {feeHeads.isLoading && <PrincipalTableSkeleton columns={5} />}
              {feeHeads.data?.map((row) => (
                <tr key={row.fee_head} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                  <td className="px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                    {row.fee_head}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {formatRupees(row.demand)}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {formatRupees(row.collected)}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {formatRupees(row.balance)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2.5">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: principalColors.borderLight }}>
                        {row.recovery_percentage != null && (
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, row.recovery_percentage)}%`, background: principalColors.primary }} />
                        )}
                      </div>
                      <span className="w-10 text-right font-mono text-xs" style={{ color: principalColors.textFaint }}>
                        {row.recovery_percentage != null ? `${row.recovery_percentage}%` : "—"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Outstanding dues by age
          </div>
          <p className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
            Days since the demand was raised · no institutional due date is tracked in this system
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["AGE", "STUDENTS", "AMOUNT"].map((h) => (
                  <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${h !== "AGE" ? "text-right" : "text-left"}`} style={{ color: principalColors.textFaint }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {duesByAge.isLoading && <PrincipalTableSkeleton columns={3} />}
              {duesByAge.data?.map((row) => (
                <tr key={row.age} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                  <td className="px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                    {row.age}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {row.students.toLocaleString("en-IN")} students
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {formatRupees(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Scholarship and concession schemes
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["SCHEME", "BENEFICIARIES", "VALUE", "STATUS"].map((h) => (
                  <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${["BENEFICIARIES", "VALUE"].includes(h) ? "text-right" : "text-left"}`} style={{ color: principalColors.textFaint }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scholarships.isLoading && <PrincipalTableSkeleton columns={4} />}
              {scholarships.data?.schemes.map((s) => {
                const badge = statusBadge(s.status);
                return (
                  <tr key={s.id} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                      {s.name}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                      {s.beneficiaries.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                      {formatRupees(s.value)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full border px-2.5 py-1 text-xs font-semibold capitalize" style={{ color: badge.fg, background: badge.bg, borderColor: badge.bd }}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!scholarships.isLoading && (scholarships.data?.schemes.length ?? 0) === 0 && (
          <div className="px-5 py-11 text-center">
            <Icon name="school" size={38} style={{ color: principalColors.borderLight }} />
            <div className="mt-2 text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              No scholarship schemes on file
            </div>
            <div className="mx-auto mt-1 max-w-md text-sm" style={{ color: principalColors.textFaint }}>
              No scholarship or concession schemes have been recorded yet.
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Expenditure against budget
          </div>
          <p className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
            {budget.data?.totalSanctioned != null
              ? `${formatRupees(budget.data.totalSpent)} utilised of ${formatRupees(budget.data.totalSanctioned)} sanctioned`
              : "No sanctioned budget is configured in this system yet"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["HEAD", "SPENT", "SHARE OF SPEND"].map((h) => (
                  <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${h !== "HEAD" ? "text-right" : "text-left"}`} style={{ color: principalColors.textFaint }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {budget.isLoading && <PrincipalTableSkeleton columns={3} />}
              {budget.data?.heads
                .filter((h) => h.spent != null)
                .map((h) => (
                  <tr key={h.head} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                      {h.head}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                      {formatRupees(h.spent ?? 0)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: principalColors.borderLight }}>
                          {h.share_of_spend != null && (
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, h.share_of_spend)}%`, background: principalColors.primary }} />
                          )}
                        </div>
                        <span className="w-10 text-right font-mono text-xs" style={{ color: principalColors.textFaint }}>
                          {h.share_of_spend != null ? `${h.share_of_spend}%` : "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

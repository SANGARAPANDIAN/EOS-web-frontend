import { MetricBackNav, MetricHeader, MetricCards, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";

/**
 * Full design-matching shell for a "checklist"-kind accreditation metric
 * with zero real backing — mirrors NBA progress's real page anatomy
 * (header, 4 cards, filter bar, criterion table) exactly, so it reads as
 * "this feature, not yet populated" rather than "not built." Every value
 * stays honestly "—"/empty; once the proposed migration is run this gets
 * replaced by a real page (same pattern nba-progress already uses).
 */
export function EmptyChecklistPage({
  crumb,
  name,
  blurb,
  reason,
  migrationFile,
}: {
  crumb: string;
  name: string;
  blurb: string;
  reason: string;
  migrationFile: string;
}) {
  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb={crumb} />
      <MetricHeader name={name} blurb={blurb} />

      <MetricCards
        cards={[
          { label: "Readiness", value: "—", foot: "no criteria tracked yet" },
          { label: "Evidence done", value: "— / —", foot: "no evidence items on file" },
          { label: "Criteria tracked", value: 0, foot: "institution-wide" },
          { label: "Owners assigned", value: 0, foot: "faculty with a criterion on file" },
        ]}
      />

      <MetricFilterBar
        search=""
        onSearch={() => {}}
        searchPlaceholder="Search criterion or owner"
        selects={[
          { label: "STATUS", value: "", onChange: () => {}, options: [{ value: "", label: "Any status" }] },
        ]}
        countLabel="Showing 0 of 0 criteria"
        onClear={() => {}}
      />

      <div className="overflow-hidden rounded-card border border-border-default bg-surface">
        <div className="px-5 pb-3.5 pt-5">
          <h2 className="text-[16px] font-extrabold text-ink">{name} criterion status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-t border-divider">
                {["Code", "Criterion", "Owner", "Evidence", "Status"].map((c) => (
                  <th key={c} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-extrabold tracking-[.08em] text-subtle">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div className="border-t border-divider px-5 py-10 text-center">
          <p className="text-[13.5px] font-semibold text-subtle">{reason}</p>
          <p className="mt-1.5 font-mono text-[12px] text-subtle">{migrationFile}</p>
        </div>
      </div>
    </div>
  );
}

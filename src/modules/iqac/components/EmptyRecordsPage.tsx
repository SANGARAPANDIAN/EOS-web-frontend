import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { useDepartmentsList } from "@/modules/iqac/api/departments";

/**
 * Full design-matching shell for a "records"-kind metric with zero real
 * backing (no table exists yet) — shows the mockup's exact leading-entries
 * column headers and page anatomy (header, 4 cards, filter bar, department
 * rollup, table) instead of a bare gap message. The reference design shows
 * this rollup for every "records" kind metric (only "checklist" kind hides
 * it), so it stays structurally present here too — populated with the real
 * department list (genuinely real) against an honest "—" value (genuinely
 * not computable yet). Once the proposed migration is run and wired up,
 * this page gets replaced by a real one (same pattern as Placements).
 */
export function EmptyRecordsPage({
  crumb,
  name,
  blurb,
  columns,
  reason,
  migrationFile,
}: {
  crumb: string;
  name: string;
  blurb: string;
  columns: string[];
  reason: string;
  migrationFile: string;
}) {
  const departments = useDepartmentsList();
  const rollupItems = (departments.data ?? []).map((d) => ({ code: d.code, value: "—", pct: 0 }));

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb={crumb} />
      <MetricHeader name={name} blurb={blurb} />

      <MetricCards
        cards={[
          { label: "This year", value: "—", foot: "no table tracks this yet" },
          { label: "Last year", value: "—", foot: "no table tracks this yet" },
          { label: "Target", value: "—", foot: "not computable without real data" },
          { label: "Attainment", value: "—", foot: "not computable without real data" },
        ]}
      />

      <MetricFilterBar
        search=""
        onSearch={() => {}}
        searchPlaceholder={`Search ${name.toLowerCase()}`}
        selects={[]}
        countLabel="Showing 0 of 0 entries"
        onClear={() => {}}
      />

      <DepartmentRollup items={rollupItems} selected={null} onSelect={() => {}} footLabel="no data yet" />

      <div className="overflow-hidden rounded-card border border-border-default bg-surface">
        <div className="px-5 pb-3.5 pt-5">
          <h2 className="text-[16px] font-extrabold text-ink">Leading entries</h2>
          <p className="mt-1 text-[12.5px] text-subtle">{name} · institution-wide, real data pending</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-t border-divider">
                {columns.map((c) => (
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

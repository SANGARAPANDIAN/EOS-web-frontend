"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, EmptyState, SearchBar, Select, DataTable, type DataTableColumn } from "@/components/ui";
import { useHealthRecords, type HealthRecord } from "@/modules/medical-centre/api/records";

const YEAR_OPTIONS = ["All", "I", "II", "III", "IV"];
const FLAG_OPTIONS = [
  { key: "all", label: "No filter" },
  { key: "chronic", label: "Chronic condition" },
  { key: "allergy", label: "Allergy on file" },
];

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const csv = [header.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function RecordDetailModal({ record, onClose }: { record: HealthRecord; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="max-h-[88vh] w-full max-w-[520px] overflow-auto rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">{record.name}</div>
            <div className="mt-0.5 text-[13px] text-muted">
              {record.roll} · {record.dept} · Year {record.year}
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3 px-[26px] py-[22px] text-[14px]">
          {[
            ["Blood group", record.blood],
            ["Visits on record", String(record.visits)],
            ["Last visit", record.last],
            ["Allergies", record.allergy],
            ["Chronic condition", record.condition],
            ["Guardian", record.guardian],
            ["Sick room stays", record.stay],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-6 border-b border-divider pb-3 last:border-0">
              <span className="text-[13px] text-muted">{label}</span>
              <span className="text-right font-bold text-ink">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function HealthRecordsPage() {
  const records = useHealthRecords();
  const data = records.data ?? [];
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("All");
  const [dept, setDept] = useState("All departments");
  const [flag, setFlag] = useState("all");
  const [selected, setSelected] = useState<HealthRecord | null>(null);

  const deptOptions = useMemo(() => ["All departments", ...Array.from(new Set(data.map((r) => r.dept))).sort()], [data]);

  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (year !== "All" && r.year !== year) return false;
      if (dept !== "All departments" && r.dept !== dept) return false;
      if (flag === "chronic" && r.condition === "None") return false;
      if (flag === "allergy" && r.allergy === "None") return false;
      if (search && !`${r.name} ${r.roll}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, search, year, dept, flag]);

  const columns: DataTableColumn<HealthRecord>[] = [
    { key: "name", header: "Student", width: "1.4fr", render: (row) => <span className="font-bold text-ink">{row.name}</span> },
    { key: "roll", header: "Roll no", width: "1fr", render: (row) => <span className="font-mono text-body">{row.roll}</span> },
    { key: "dept", header: "Dept", width: "0.8fr", render: (row) => <span className="text-body">{row.dept}</span> },
    { key: "year", header: "Year", width: "0.6fr", render: (row) => <span className="text-body">{row.year}</span> },
    { key: "blood", header: "Blood", width: "0.7fr", render: (row) => <Badge tone="accent">{row.blood}</Badge> },
    { key: "allergy", header: "Allergies", width: "1fr", render: (row) => <span className="text-body">{row.allergy}</span> },
    { key: "condition", header: "Condition", width: "1fr", render: (row) => <span className="text-body">{row.condition}</span> },
    { key: "last", header: "Last visit", width: "1.1fr", align: "right", render: (row) => <span className="font-mono text-[12.5px] text-subtle">{row.last}</span> },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Student health records</h1>
        <p className="mt-1 text-[13px] text-muted">Blood group, allergies and chronic conditions declared at admission · {filtered.length} of {data.length} indexed here.</p>
      </div>

      <div className="rounded-card border border-border-default bg-surface p-[16px_18px]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar className="min-w-[260px] max-w-none flex-1" placeholder="Search by name or roll number" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">Year</span>
            <div className="flex gap-1 rounded-[10px] border border-border-default bg-surface-tint p-1">
              {YEAR_OPTIONS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`rounded-[8px] px-3 py-1.5 text-[13px] font-bold ${year === y ? "bg-primary text-white" : "text-muted hover:text-ink"}`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
          <Select className="w-auto shrink-0" value={dept} onChange={(e) => setDept(e.target.value)}>
            {deptOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "student-health-records.csv",
                ["Student", "Roll no", "Dept", "Year", "Blood group", "Allergies", "Condition", "Last visit"],
                filtered.map((r) => [r.name, r.roll, r.dept, r.year, r.blood, r.allergy, r.condition, r.last]),
              )
            }
            className="shrink-0 rounded-[9px] border border-border-default bg-surface px-4 py-2.5 text-[14px] font-bold text-primary hover:bg-surface-tint"
          >
            Export CSV
          </button>
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-divider pt-3.5">
          <span className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">Health flag</span>
          {FLAG_OPTIONS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFlag(f.key)}
              className={`shrink-0 rounded-pill border px-3.5 py-2 text-[12.5px] font-bold ${
                flag === f.key ? "border-primary bg-accent-50 text-primary" : "border-border-default text-ink-soft"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="flex-1" />
          <div className="text-[13.5px] text-muted">
            Showing <span className="font-bold text-ink">{filtered.length}</span> students
          </div>
        </div>
      </div>

      {records.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(row) => row.studentId}
          emptyMessage="No student matches that search."
          hoverableRows
          onRowClick={(row) => setSelected(row)}
        />
      )}

      {selected && <RecordDetailModal record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

"use client";

import { Card, EmptyState, ProgressBar } from "@/components/ui";
import { useMedicalCentreReports } from "@/modules/medical-centre/api/reports";

export default function MedicalReportsPage() {
  const reports = useMedicalCentreReports();
  const data = reports.data;

  const deptVisits = data?.deptVisits ?? [];
  const topComplaints = data?.topComplaints ?? [];
  const monthlyVisits = data?.monthlyVisits ?? [];
  const maxDept = Math.max(1, ...deptVisits.map((d) => d.v));
  const maxMonth = Math.max(1, ...monthlyVisits.map((m) => m.v));

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Reports & analytics</h1>
        <p className="mt-1 text-[13px] text-muted">Visit patterns for {data?.year ?? new Date().getFullYear()} · {data?.totalVisits ?? 0} visits recorded.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        <Card>
          <h2 className="mb-4 text-[17px] font-extrabold text-ink">Visits by department</h2>
          {reports.isLoading ? (
            <EmptyState message="Loading…" />
          ) : deptVisits.length === 0 ? (
            <EmptyState message="No visits recorded yet." />
          ) : (
            <div className="flex flex-col gap-3">
              {deptVisits.map((d) => (
                <div key={d.dept}>
                  <div className="mb-1.5 flex justify-between text-[13.5px]">
                    <span className="font-semibold text-body">{d.dept}</span>
                    <span className="font-mono text-ink">{d.v}</span>
                  </div>
                  <ProgressBar percent={Math.round((d.v / maxDept) * 100)} height={7} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-[17px] font-extrabold text-ink">Top complaints</h2>
          <p className="mb-3 text-[12.5px] text-subtle">Most frequent visit reasons this year</p>
          {reports.isLoading ? (
            <EmptyState message="Loading…" />
          ) : topComplaints.length === 0 ? (
            <EmptyState message="No visit reasons recorded yet." />
          ) : (
            <div className="flex flex-col gap-3">
              {topComplaints.map((c) => (
                <div key={c.name}>
                  <div className="mb-1.5 flex justify-between text-[13.5px]">
                    <span className="font-semibold text-body">{c.name}</span>
                    <span className="font-mono text-ink">{c.pct}%</span>
                  </div>
                  <ProgressBar percent={c.pct} height={7} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4">
          <h2 className="text-[17px] font-extrabold text-ink">Monthly visits</h2>
          <p className="mt-0.5 text-[13.5px] text-muted">Visit counts across the year</p>
        </div>
        {reports.isLoading ? (
          <EmptyState message="Loading…" />
        ) : (
          <div className="flex h-[180px] gap-3">
            {monthlyVisits.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[12px] font-bold text-ink">{m.v}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-[6px]"
                    style={{ height: `${Math.round((m.v / maxMonth) * 100)}%`, background: m.v === maxMonth && m.v > 0 ? "#1d3a8a" : "#c7d5f2" }}
                  />
                </div>
                <span className="text-[11.5px] font-bold uppercase text-subtle">{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

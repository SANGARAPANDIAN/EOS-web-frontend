"use client";

import { useState } from "react";
import { Badge, Button, Card, EmptyState, Icon, ProgressBar, type BadgeTone } from "@/components/ui";
import { useMediaRequests } from "@/modules/media-room/api/mediaRequests";
import { useShootAssignments } from "@/modules/media-room/api/shoots";
import { useEquipment } from "@/modules/media-room/api/equipment";
import { useIndents } from "@/modules/media-room/api/indents";
import {
  useSavedReports,
  useCreateReport,
  useReportAnalytics,
  useScorecard,
  useSetScorecardTarget,
  type ReportStatus,
  type ScorecardMetric,
} from "@/modules/media-room/api/reports";
import { formatLongDate, formatDisplayDate } from "@/lib/utils/date";

const PERIODS = ["August 2026", "Odd semester 2026-27", "Academic year 2026-27", "Custom range"];
const REPORT_STATUS_TONE: Record<ReportStatus, BadgeTone> = { draft: "neutral", final: "accent" };

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div data-mr-lift="1" className="rounded-card border border-border-default bg-surface p-[18px_20px]">
      <div className="text-[13px] font-bold text-muted">{label}</div>
      <div className="mt-2 text-[30px] font-extrabold text-ink">{value}</div>
      {sub && <div className="mt-1 text-[12.5px] text-subtle">{sub}</div>}
    </div>
  );
}

function SavedReports() {
  const reports = useSavedReports();
  const create = useCreateReport();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [period, setPeriod] = useState(PERIODS[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const rows = reports.data?.ready ? reports.data.data : [];

  async function submit() {
    if (!name.trim()) {
      setError("Report name is required.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({ name: name.trim(), period, note: note.trim() || undefined });
      setName("");
      setNote("");
      setOpen(false);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not create this report.");
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Report</h1>
          <p className="mt-1 text-[13px] text-muted">{formatLongDate()} · live snapshot below, plus your saved report notes.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "+ Add report"}
        </Button>
      </div>

      {open && (
        <Card data-mr-lift="1">
          <h2 className="mb-3 text-[17px] font-extrabold text-ink">New report</h2>
          <div className="grid grid-cols-[2fr_1fr] gap-4">
            <div>
              <label className="text-[13.5px] font-bold text-primary">Report name</label>
              <input
                placeholder="e.g. NBA visit media documentation report"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-12 w-full rounded-[12px] border border-border-default px-3.5 text-[15px] outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[13.5px] font-bold text-primary">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="mt-2 h-12 w-full rounded-[12px] border border-border-default bg-surface px-3 text-[15px] outline-none focus:border-primary"
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-[13.5px] font-bold text-primary">What the report covers</label>
            <textarea
              rows={3}
              placeholder="Metrics, departments and channels to include."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 w-full rounded-[12px] border border-border-default px-3.5 py-2.5 text-[14px] leading-relaxed outline-none focus:border-primary"
            />
          </div>
          {error && <div className="mt-3 text-[13px] font-semibold text-danger-fg">{error}</div>}
          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="h-[44px] rounded-[11px] border border-border-default bg-surface px-5 text-[15px] font-bold text-ink hover:bg-surface-tint">
              Cancel
            </button>
            <Button variant="primarySmall" className="h-[44px] w-auto px-5" onClick={submit} disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create report"}
            </Button>
          </div>
        </Card>
      )}

      {reports.data?.ready && rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {rows.map((r) => (
            <Card data-mr-lift="1" key={r.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] text-subtle">{r.period}</span>
                <Badge tone={REPORT_STATUS_TONE[r.status]}>{r.status === "final" ? "Final" : "Draft"}</Badge>
              </div>
              <div className="mt-2.5 text-[15.5px] font-extrabold text-ink">{r.name}</div>
              {r.note && <p className="mt-1.5 text-[13px] leading-relaxed text-body">{r.note}</p>}
              <div className="mt-3 flex items-center justify-between border-t border-divider pt-2.5 text-[12px] text-subtle">
                <span>{r.owner_name ?? "Unknown"}</span>
                <span>updated {formatDisplayDate(r.updated_at)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function BarRow({ name, count, pct }: { name: string; count: number; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[16.5px]">
        <span className="font-semibold text-body">{name}</span>
        <span>
          <b className="text-ink">{count}</b> <span className="text-subtle">· {pct}%</span>
        </span>
      </div>
      <ProgressBar percent={pct} height={7} className="mt-2" />
    </div>
  );
}

function fmtMetric(value: number | null, isPercent: boolean): string {
  if (value === null) return "—";
  if (isPercent) return `${value}%`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} K`;
  return String(value);
}

function TargetCell({ metric, editable }: { metric: ScorecardMetric; editable: boolean }) {
  const setTarget = useSetScorecardTarget();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(metric.target ?? ""));

  if (!editable) {
    return <span className="text-right font-mono text-[15px] text-subtle">not set up yet</span>;
  }

  if (editing) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <input
          autoFocus
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setValue(String(metric.target ?? ""));
              setEditing(false);
            }
          }}
          onBlur={() => {
            const parsed = Number(value);
            setEditing(false);
            if (Number.isFinite(parsed) && parsed >= 0 && parsed !== metric.target) {
              setTarget.mutate({ metricKey: metric.key, targetValue: parsed });
            } else {
              setValue(String(metric.target ?? ""));
            }
          }}
          className="h-8 w-20 rounded-[8px] border border-primary-border px-2 text-right font-mono text-[15px] outline-none"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full text-right font-mono text-[15px] text-muted hover:text-primary"
      title="Click to set this year's target"
    >
      {metric.target !== null ? fmtMetric(metric.target, metric.is_percent) : "set target"}
    </button>
  );
}

function ScorecardRow({ metric, editable }: { metric: ScorecardMetric; editable: boolean }) {
  return (
    <div data-mr-lift="1" className="grid grid-cols-[2fr_1fr_1fr_1fr_1.3fr] items-center gap-4 border-b border-divider bg-surface py-3.5">
      <span className="text-[15.5px] font-bold text-ink">{metric.name}</span>
      <span className="text-right font-mono text-[14.5px] text-ink">{fmtMetric(metric.now, metric.is_percent)}</span>
      <span className="text-right font-mono text-[14.5px] text-subtle">{fmtMetric(metric.prev, metric.is_percent)}</span>
      <TargetCell metric={metric} editable={editable} />
      <div className="flex items-center justify-end gap-2.5">
        <ProgressBar percent={metric.attainment_pct ?? 0} height={7} className="w-[90px]" />
        <span className="w-9 text-right font-mono text-[14px] text-ink">{metric.attainment_pct !== null ? `${metric.attainment_pct}%` : "—"}</span>
      </div>
    </div>
  );
}

function Scorecard() {
  const scorecard = useScorecard();
  if (!scorecard.data) return null;
  const { this_year_label, last_year_label, targets_ready, metrics } = scorecard.data;

  return (
    <Card data-mr-lift="1">
      <h2 className="text-[17px] font-extrabold text-ink">Media scorecard</h2>
      <p className="mt-0.5 text-[12.5px] text-subtle">
        AY {this_year_label} against AY {last_year_label}
        {!targets_ready && " · targets aren't set up yet"}
      </p>
      <div className="mt-4 grid grid-cols-[2fr_1fr_1fr_1fr_1.3fr] gap-4 border-b border-divider pb-2.5 text-[11.5px] font-bold tracking-[.06em] text-subtle uppercase">
        <span>Metric</span>
        <span className="text-right">This year</span>
        <span className="text-right">Last year</span>
        <span className="text-right">Target</span>
        <span className="text-right">Attainment</span>
      </div>
      {metrics.map((m) => (
        <ScorecardRow key={m.key} metric={m} editable={targets_ready} />
      ))}
    </Card>
  );
}

export default function MediaReportPage() {
  const analytics = useReportAnalytics();
  const pending = useMediaRequests("pending", 1);
  const approved = useMediaRequests("approved", 1);
  const delivered = useMediaRequests("delivered", 1);
  const rejected = useMediaRequests("rejected", 1);
  const allRequests = useMediaRequests(undefined, 100);
  const shoots = useShootAssignments();
  const equipment = useEquipment();
  const indents = useIndents();

  const mediaTypeCounts = new Map<string, number>();
  for (const r of allRequests.data?.data ?? []) {
    for (const t of r.media_types) {
      mediaTypeCounts.set(t, (mediaTypeCounts.get(t) ?? 0) + 1);
    }
  }
  const mediaTypeRows = [...mediaTypeCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxMediaTypeCount = mediaTypeRows[0]?.[1] ?? 0;

  const pendingCount = pending.data?.meta.total ?? 0;
  const approvedCount = approved.data?.meta.total ?? 0;
  const deliveredCount = delivered.data?.meta.total ?? 0;
  const rejectedCount = rejected.data?.meta.total ?? 0;
  const totalRequests = pendingCount + approvedCount + deliveredCount + rejectedCount;
  const deliveredPct = totalRequests > 0 ? Math.round((deliveredCount / totalRequests) * 100) : 0;

  const shootRows = shoots.data?.ready ? shoots.data.data : [];
  const shootCompleted = shootRows.filter((s) => s.status === "delivered").length;
  const shootScheduled = shootRows.filter((s) => s.status === "planned" || s.status === "confirmed").length;

  const equipmentRows = equipment.data?.ready ? equipment.data.data : [];
  const equipmentOut = equipmentRows.filter((e) => e.status === "checked_out").length;
  const equipmentTotal = equipmentRows.length;

  const indentRows = indents.data?.ready ? indents.data.data : [];
  const indentPending = indentRows.filter((i) => i.status === "pending").length;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <SavedReports />

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Media requests" value={totalRequests} sub={`${pendingCount} pending · ${approvedCount} approved`} />
        <Stat label="Delivered" value={deliveredCount} sub={`${deliveredPct}% of all requests`} />
        <Stat label="Shoots" value={shoots.data?.ready ? shootRows.length : "—"} sub={shoots.data?.ready ? `${shootCompleted} delivered · ${shootScheduled} upcoming` : "not set up yet"} />
        <Stat label="Open indents" value={indents.data?.ready ? indentPending : "—"} sub={indents.data?.ready ? `${indentRows.length} total raised` : "not set up yet"} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card data-mr-lift="1">
          <h2 className="mb-3 text-[17px] font-extrabold text-ink">Request pipeline</h2>
          {totalRequests === 0 ? (
            <EmptyState message="No requests yet." />
          ) : (
            <div className="flex flex-col gap-3">
              {[
                { label: "Pending", value: pendingCount },
                { label: "Approved", value: approvedCount },
                { label: "Delivered", value: deliveredCount },
                { label: "Rejected", value: rejectedCount },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-body">{row.label}</span>
                    <span className="font-bold text-ink">{row.value}</span>
                  </div>
                  <ProgressBar percent={totalRequests > 0 ? Math.round((row.value / totalRequests) * 100) : 0} height={6} className="mt-1.5" />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card data-mr-lift="1">
          <h2 className="mb-3 text-[17px] font-extrabold text-ink">Requests by coverage type</h2>
          {mediaTypeRows.length === 0 ? (
            <EmptyState message="No requests yet." />
          ) : (
            <div className="flex flex-col gap-3">
              {mediaTypeRows.map(([type, count]) => (
                <div key={type}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-body">{type}</span>
                    <span className="font-bold text-ink">{count}</span>
                  </div>
                  <ProgressBar percent={maxMediaTypeCount > 0 ? Math.round((count / maxMediaTypeCount) * 100) : 0} height={6} className="mt-1.5" />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card data-mr-lift="1">
          <h2 className="mb-3 text-[17px] font-extrabold text-ink">Equipment utilisation</h2>
          {!equipment.data?.ready ? (
            <EmptyState message="The equipment register isn't set up yet." />
          ) : equipmentTotal === 0 ? (
            <EmptyState message="No equipment registered yet." />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-[30px] font-extrabold text-ink">{equipmentOut}</span>
                <span className="text-[15px] text-muted">/ {equipmentTotal} checked out</span>
              </div>
              <ProgressBar percent={Math.round((equipmentOut / equipmentTotal) * 100)} height={7} className="mt-3" />
              <div className="mt-3 flex items-center gap-1.5 text-[12.5px] text-subtle">
                <Icon name="info" size={14} />
                {equipmentRows.filter((e) => e.status === "in_service").length} unit(s) in service
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card data-mr-lift="1">
          <h2 className="text-[17px] font-extrabold text-ink">Requests by department</h2>
          <p className="mt-0.5 text-[12.5px] text-subtle">Every media request raised, by the requester&apos;s department</p>
          {!analytics.data || analytics.data.byDepartment.length === 0 ? (
            <EmptyState message="No requests yet." />
          ) : (
            <div className="mt-4 flex flex-col gap-3.5">
              {analytics.data.byDepartment.map((d) => (
                <BarRow key={d.name} name={d.name} count={d.count} pct={d.pct} />
              ))}
            </div>
          )}
        </Card>

        <Card data-mr-lift="1">
          <h2 className="text-[17px] font-extrabold text-ink">Turnaround time</h2>
          <p className="mt-0.5 text-[12.5px] text-subtle">From request raised to deliverable approved</p>
          {!analytics.data?.turnaround.ready ? (
            <EmptyState message="Not enough delivered requests yet — this fills in as requests are created and marked delivered going forward." />
          ) : analytics.data.turnaround.data.every((t) => t.count === 0) ? (
            <EmptyState message="No delivered requests yet." />
          ) : (
            <div className="mt-4 flex flex-col gap-3.5">
              {analytics.data.turnaround.data.map((t) => (
                <BarRow key={t.name} name={t.name} count={t.count} pct={t.pct} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <Scorecard />
    </div>
  );
}

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Card, Badge, Button, Icon, ProgressBar, EmptyState, SegmentedTabs, Input, Select, Textarea } from "@/components/ui";
import { useMedicalCentreDashboard, type DashboardRange } from "@/modules/medical-centre/api/dashboard";
import { useAddWalkin } from "@/modules/medical-centre/api/opd";
import { useTeam } from "@/modules/medical-centre/api/team";
import { useDischargeBed } from "@/modules/medical-centre/api/sickroom";
import { formatDayAndTime } from "@/lib/utils/date";

const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "year", label: "This year" },
];

/** Matches the Transport/Higher Education dashboard hover-lift convention. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

function RecordVisitModal({ onClose }: { onClose: () => void }) {
  const addWalkin = useAddWalkin();
  const team = useTeam();
  const [visitorType, setVisitorType] = useState<"student" | "faculty">("student");
  const [identifier, setIdentifier] = useState("");
  const [staffId, setStaffId] = useState("");
  const [note, setNote] = useState("");
  const [toQueue, setToQueue] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!identifier.trim()) {
      setError(visitorType === "student" ? "Roll number is required." : "Staff email is required.");
      return;
    }
    setError(null);
    try {
      await addWalkin.mutateAsync({
        visitor_type: visitorType,
        identifier: identifier.trim(),
        reason: note.trim() || undefined,
        attended_by_staff_id: staffId ? Number(staffId) : undefined,
        to_queue: toQueue,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this visit.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-6">
      <div className="w-full max-w-[560px] rounded-modal bg-surface p-[26px]">
        <div className="text-[24px] font-extrabold tracking-[-.02em] text-ink">Record a visit</div>
        <p className="mb-5 mt-1 text-[14px] text-muted">Entry appears in the treatment log and the student&apos;s record</p>

        <div className="flex flex-col gap-3.5">
          <div>
            <div className="mb-1.5 text-[13px] font-bold text-body">Who is this visit for</div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setVisitorType("student")}
                className={`rounded-[9px] px-4 py-2.5 text-[14px] font-bold transition-colors ${
                  visitorType === "student" ? "bg-primary text-white" : "border border-border-default text-body"
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setVisitorType("faculty")}
                className={`rounded-[9px] px-4 py-2.5 text-[14px] font-bold transition-colors ${
                  visitorType === "faculty" ? "bg-primary text-white" : "border border-border-default text-body"
                }`}
              >
                Faculty / staff
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[13px] font-bold text-body">{visitorType === "student" ? "Roll number" : "Staff email"}</div>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={visitorType === "student" ? "22CS1042" : "name@sece.ac.in"}
            />
          </div>

          <div>
            <div className="mb-1.5 text-[13px] font-bold text-body">Seen by</div>
            <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Not recorded</option>
              {team.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="mb-1.5 text-[13px] font-bold text-body">Complaint and action</div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Fever and throat pain · medication issued · rest advised"
            />
          </div>

          <label className="flex items-center gap-2.5 text-[14.5px] text-body">
            <input type="checkbox" checked={toQueue} onChange={(e) => setToQueue(e.target.checked)} className="size-[17px]" />
            Also add to today&apos;s OPD queue
          </label>

          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={addWalkin.isPending}>
            Save entry
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function MedicalCentreDashboardPage() {
  const [range, setRange] = useState<DashboardRange>("today");
  const [showRecordVisit, setShowRecordVisit] = useState(false);
  const dashboard = useMedicalCentreDashboard(range);
  const discharge = useDischargeBed();
  const data = dashboard.data;
  const isLoading = dashboard.isLoading;
  const kpis = data?.kpis;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Medical centre</h1>
        <p className="mt-1 text-[13px] text-muted">
          Sick room, pharmacy and ambulance · open 8.30 am to 8.30 pm, on call overnight ·{" "}
          {isLoading ? "—" : (data?.totalStudents ?? 0).toLocaleString("en-IN")} students on roll
        </p>
      </div>

      {data && (!data.extended.opdQueue || !data.extended.sickRoom || !data.extended.pharmacy || !data.extended.staffDuty) && (
        <div className="rounded-[11px] border border-border-default bg-surface-tint px-4 py-3 text-[12.5px] text-muted">
          Some sections aren&apos;t tracked yet — OPD queue status, sick room beds, pharmacy stock and staff duty each need their setup SQL run before real figures show here.
        </div>
      )}

      {showRecordVisit && <RecordVisitModal onClose={() => setShowRecordVisit(false)} />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <SegmentedTabs options={RANGE_OPTIONS} value={range} onChange={(key) => setRange(key as DashboardRange)} />
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowRecordVisit(true)}>
          Record a visit
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Link href="/medical-centre/records" className={`min-w-0 rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Visits</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="healing" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">{isLoading ? "—" : kpis?.visits ?? 0}</div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-[14px] font-extrabold text-primary">{kpis?.visitsReferred ?? 0}</span>
            <span className="text-[13px] text-muted">referred out of campus</span>
          </div>
          <ProgressBar percent={isLoading ? 0 : kpis?.visitsBarPercent ?? 0} height={6} className="mt-3" />
          <div className="mt-3 text-[12.5px] text-subtle">{kpis?.visitsNote}</div>
        </Link>

        <Link href="/medical-centre/sickroom" className={`min-w-0 rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Sick room beds</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="bed" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
            {isLoading ? "—" : data?.extended.sickRoom ? kpis?.bedsOccupied : "Not tracked yet"}
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-[14px] font-extrabold text-primary">{kpis?.bedsFree ?? 0}</span>
            <span className="text-[13px] text-muted">free right now</span>
          </div>
          <ProgressBar percent={isLoading ? 0 : kpis?.bedsBarPercent ?? 0} height={6} className="mt-3" />
          <div className="mt-3 text-[12.5px] text-subtle">
            {kpis?.longestStayMinutes != null ? `Longest stay ${kpis.longestStayMinutes} min · observation` : "No one currently admitted"}
          </div>
        </Link>

        <Link href="/medical-centre/opd" className={`min-w-0 rounded-card border border-border-accent bg-accent-50 p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-primary-dark">Waiting in OPD</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-surface">
              <Icon name="hourglass_top" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-primary-dark">
            {isLoading ? "—" : data?.extended.opdQueue ? kpis?.opdWaiting : "Not tracked yet"}
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-[14px] font-extrabold text-primary-dark">{kpis?.opdConsulting ?? 0}</span>
            <span className="text-[13px] text-primary-dark/80">in consultation now</span>
          </div>
          <ProgressBar percent={isLoading ? 0 : kpis?.opdBarPercent ?? 0} height={6} className="mt-3" />
        </Link>

        <Link href="/medical-centre/pharmacy" className={`min-w-0 rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Medicines dispensed</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="medication" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
            {isLoading ? "—" : data?.extended.pharmacy ? kpis?.dispensed : "Not tracked yet"}
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-[14px] font-extrabold text-primary">{kpis?.lowStockCount ?? 0}</span>
            <span className="text-[13px] text-muted">items below reorder level</span>
          </div>
          <ProgressBar percent={isLoading ? 0 : kpis?.dispensedBarPercent ?? 0} height={6} className="mt-3" />
        </Link>
      </div>

      <div className="grid grid-cols-[1.15fr_1fr_1fr] gap-4 items-start">
        <Card className={HOVERABLE}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Now in the sick room</h2>
            <Link href="/medical-centre/sickroom" className="text-[13.5px] font-bold text-primary hover:underline">
              Manage
            </Link>
          </div>
          {isLoading ? (
            <EmptyState message="Loading…" />
          ) : !data || data.occupiedBeds.length === 0 ? (
            <EmptyState message={data?.extended.sickRoom ? "All beds are free." : "Sick room beds aren't tracked yet."} />
          ) : (
            <div className="flex flex-col">
              {data.occupiedBeds.map((bed) => (
                <div key={bed.id} className="flex items-center gap-3 border-t border-divider py-3 first:border-0 first:pt-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-icon-chip font-mono text-[12.5px] text-primary">{bed.id}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold text-ink">{bed.name}</div>
                    <div className="text-[13px] text-muted">{bed.reason}</div>
                  </div>
                  <span className="shrink-0 font-mono text-[12.5px] text-subtle">{bed.since}</span>
                  <button
                    type="button"
                    onClick={() => discharge.mutate(bed.bedId)}
                    disabled={discharge.isPending}
                    className="shrink-0 rounded-[7px] border border-border-default px-2.5 py-1.5 text-[12.5px] font-bold text-primary hover:bg-surface-tint"
                  >
                    Discharge
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={HOVERABLE}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Needs attention</h2>
            <Badge tone="accentDark">{data?.needsAttention.length ?? 0} flags</Badge>
          </div>
          {isLoading ? (
            <EmptyState message="Loading…" />
          ) : !data || data.needsAttention.length === 0 ? (
            <EmptyState message="You're all caught up." />
          ) : (
            <div className="flex flex-col">
              {data.needsAttention.map((flag, i) => (
                <div key={i} className="flex items-center gap-2.5 border-t border-divider py-3 first:border-0 first:pt-0">
                  <span className="mt-0 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold leading-snug text-ink">{flag.title}</div>
                    <div className="text-[13px] text-muted">{flag.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={HOVERABLE}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Health advisories</h2>
            <Link href="/medical-centre/advisories">
              <Button variant="primarySmall" className="w-auto">
                Open
              </Button>
            </Link>
          </div>
          {isLoading ? (
            <EmptyState message="Loading…" />
          ) : !data || data.advisories.length === 0 ? (
            <EmptyState message="No advisories yet." />
          ) : (
            <div className="flex flex-col">
              {data.advisories.map((a, i) => (
                <div key={i} className="flex flex-col gap-1.5 border-t border-divider py-3 first:border-0 first:pt-0">
                  <div className="flex items-center gap-2.5">
                    <Badge tone="accent">{a.tag}</Badge>
                    <span className="font-mono text-[11.5px] text-subtle">{formatDayAndTime(a.when)}</span>
                  </div>
                  <div className="text-[14.5px] font-bold leading-snug text-ink">{a.title}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-[1fr_1.25fr] gap-4 items-start">
        <Card className={HOVERABLE}>
          <h2 className="text-[17px] font-extrabold text-ink">Today&apos;s roster</h2>
          <p className="mb-1 mt-0.5 text-[13px] text-muted">Two shifts cover 8.30 am to 8.30 pm</p>
          {isLoading ? (
            <EmptyState message="Loading…" />
          ) : !data || data.todaysRoster.length === 0 ? (
            <EmptyState message={data?.extended.staffDuty ? "No one is marked on duty today." : "Staff duty isn't tracked yet."} />
          ) : (
            <div className="flex flex-col">
              {data.todaysRoster.map((r, i) => (
                <div key={i} className="flex items-center gap-3 border-t border-divider py-3 first:border-0 first:pt-0">
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold text-ink">{r.name}</div>
                    <div className="text-[13px] text-muted">{r.role}</div>
                  </div>
                  <span className="shrink-0 font-mono text-[12.5px] text-body">{r.shift}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={HOVERABLE}>
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Recent treatment log</h2>
            <Link href="/medical-centre/records" className="text-[13.5px] font-bold text-primary hover:underline">
              All records
            </Link>
          </div>
          <p className="mb-1 mt-0.5 text-[13px] text-muted">Students and staff seen in the last four days</p>
          {isLoading ? (
            <EmptyState message="Loading…" />
          ) : !data || data.recentTreatmentLog.length === 0 ? (
            <EmptyState message="No visits recorded yet." />
          ) : (
            <div className="flex flex-col">
              {data.recentTreatmentLog.map((l, i) => (
                <div key={i} className="border-t border-divider py-3 first:border-0 first:pt-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-bold text-ink">{l.who}</span>
                    <span className="shrink-0 whitespace-nowrap font-mono text-[12px] text-subtle">{l.date}</span>
                  </div>
                  <div className="mt-0.5 text-[13.5px] text-body">{l.note}</div>
                  <div className="mt-0.5 text-[13px] text-subtle">{l.by}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

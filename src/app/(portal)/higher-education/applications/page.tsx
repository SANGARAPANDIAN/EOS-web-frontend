"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, Badge, Button, Icon, Input, DataTable, type BadgeTone, type DataTableColumn } from "@/components/ui";
import {
  useHigherEducationApplications,
  useCreateApplicationWindow,
  type ApplicationWindow,
} from "@/modules/higher-education/api/applications";
import { ApplicationStudentsPanel } from "@/modules/higher-education/components/StudentListPanels";
import { formatDisplayDate } from "@/lib/utils/date";

/** Matches the Transport dashboard/routes hover-lift convention. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

function KpiTile({ icon, label, value, footnote, highlight }: { icon: string; label: string; value: string; footnote: string; highlight?: boolean }) {
  return (
    <div className={`min-w-0 rounded-card border ${highlight ? "border-border-accent" : "border-border-default"} bg-surface p-[20px_22px] ${HOVERABLE}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[14.5px] font-bold text-body">{label}</div>
        <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
          <Icon name={icon} size={19} className="text-primary" />
        </div>
      </div>
      <div className={`mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none ${highlight ? "text-primary" : "text-ink"}`}>{value}</div>
      <div className="mt-3 text-[13px] text-muted">{footnote}</div>
    </div>
  );
}

function windowTone(window: string | null): BadgeTone {
  if (!window) return "neutral";
  if (window === "Overdue") return "danger";
  const days = parseInt(window, 10);
  if (!isNaN(days) && days <= 10) return "accentDark";
  return "accent";
}

function AddApplicationWindowModal({ onClose }: { onClose: () => void }) {
  const createWindow = useCreateApplicationWindow();
  const [university, setUniversity] = useState("");
  const [country, setCountry] = useState("");
  const [intake, setIntake] = useState("");
  const [applicants, setApplicants] = useState("");
  const [docsPending, setDocsPending] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!university.trim() || !country.trim()) {
      setError("University and country are required.");
      return;
    }
    setError(null);
    try {
      await createWindow.mutateAsync({
        university: university.trim(),
        country: country.trim(),
        intake: intake.trim() || undefined,
        applicants_count: applicants ? Number(applicants) : undefined,
        documents_pending: docsPending ? Number(docsPending) : undefined,
        deadline: deadline || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this application window.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-14">
      <div className="w-full max-w-[600px] rounded-modal bg-surface">
        <div className="flex items-start justify-between gap-5 border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Add application window</div>
            <div className="mt-1 text-[13px] text-muted">Fields left blank stay unrecorded and can be filled later.</div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">University</label>
            <Input className="mt-1.5" value={university} onChange={(e) => setUniversity(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Country</label>
            <Input className="mt-1.5" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Intake</label>
            <Input className="mt-1.5" placeholder="e.g. Fall 2027" value={intake} onChange={(e) => setIntake(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Applicants</label>
            <Input className="mt-1.5" type="number" value={applicants} onChange={(e) => setApplicants(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Documents pending</label>
            <Input className="mt-1.5" type="number" value={docsPending} onChange={(e) => setDocsPending(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Deadline</label>
            <Input className="mt-1.5" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          {error && <div className="col-span-2 text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={createWindow.isPending}>
            Save window
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function HigherEducationApplicationsPage() {
  const applications = useHigherEducationApplications();
  const data = applications.data;
  const isLoading = applications.isLoading;
  const [showAdd, setShowAdd] = useState(false);

  // Clicking a window opens its student list underneath, which is where
  // students are added and moved between Applied and Selected.
  const [openWindow, setOpenWindow] = useState<ApplicationWindow | null>(null);

  const columns: DataTableColumn<ApplicationWindow>[] = [
    { key: "university", header: "University", width: "1.5fr", render: (row) => <span className="font-bold text-ink">{row.university}</span> },
    { key: "country", header: "Country", width: "0.9fr", render: (row) => <span className="text-body">{row.country}</span> },
    { key: "intake", header: "Intake", width: "1fr", render: (row) => <span className="text-body">{row.intake ?? "—"}</span> },
    { key: "applicants", header: "Applicants", align: "right", render: (row) => <span className="font-mono text-ink">{row.applicants}</span> },
    { key: "docs", header: "Docs pending", align: "right", render: (row) => <span className="font-mono text-body">{row.documentsPending}</span> },
    { key: "deadline", header: "Deadline", align: "right", render: (row) => <span className="font-mono text-[12.5px] text-body">{row.deadline ? formatDisplayDate(row.deadline) : "—"}</span> },
    { key: "window", header: "Window", align: "right", render: (row) => (row.window ? <Badge tone={windowTone(row.window)}>{row.window}</Badge> : <span className="text-subtle">—</span>) },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Applications & deadlines</h1>
          <p className="mt-1 text-[13px] text-muted">
            {isLoading ? "—" : data?.kpis.filed ?? 0} applications filed this cycle · tracked by university, intake and window
          </p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowAdd(true)}>
          Add application
        </Button>
      </div>

      {showAdd && <AddApplicationWindowModal onClose={() => setShowAdd(false)} />}

      <div className="grid grid-cols-4 gap-4">
        <KpiTile icon="description" label="Filed" value={isLoading ? "—" : String(data?.kpis.filed ?? 0)} footnote="aspirants who have filed" />
        <KpiTile
          icon="hourglass_top"
          label="In evaluation"
          value={isLoading ? "—" : String(data?.kpis.inEvaluation ?? 0)}
          footnote={`${data?.kpis.interviewsScheduled ?? 0} interviews scheduled`}
        />
        <KpiTile
          icon="verified"
          label="Offers received"
          value={isLoading ? "—" : String(data?.kpis.offersReceived ?? 0)}
          footnote={data?.kpis.offerRatePercent != null ? `${data.kpis.offerRatePercent}% offer rate` : "no filed applications yet"}
        />
        <KpiTile
          icon="event"
          label="Closing in 14 days"
          value={isLoading ? "—" : String(data?.kpis.closingWithin14Days ?? 0)}
          footnote={`${data?.kpis.urgentCount ?? 0} windows flagged urgent`}
          highlight
        />
      </div>

      <Card className={`overflow-hidden p-0 ${HOVERABLE}`}>
        <div className="p-[18px_20px] pb-3">
          <h2 className="text-[17px] font-extrabold text-ink">Open application windows</h2>
        </div>
        <DataTable
          columns={columns}
          data={data?.windows ?? []}
          rowKey={(row) => row.id}
          emptyMessage={isLoading ? "Loading…" : "No application windows recorded yet."}
          hoverableRows
          onRowClick={(row) => setOpenWindow((cur) => (cur?.id === row.id ? null : row))}
        />
      </Card>

      {/* Clicking a window above opens its student list here: search a student,
          add them, then move them from Applied to Selected. */}
      {openWindow && (
        <ApplicationStudentsPanel
          windowId={openWindow.id}
          title={`${openWindow.university}${openWindow.intake ? " · " + openWindow.intake : ""}`}
        />
      )}
    </div>
  );
}

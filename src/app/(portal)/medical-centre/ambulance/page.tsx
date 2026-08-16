"use client";

import { Badge, Button, Card, DataTable, EmptyState, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { useAmbulance, useSetAmbulanceStatus, type AmbulanceTrip } from "@/modules/medical-centre/api/ambulance";
import { formatDayAndTime } from "@/lib/utils/date";

const OUTCOME_TONE: Record<AmbulanceTrip["outcome"], BadgeTone> = { Referred: "accentDark", Returned: "accent" };

export default function AmbulancePage() {
  const ambulance = useAmbulance();
  const setStatus = useSetAmbulanceStatus();
  const data = ambulance.data;
  const vehicle = data?.vehicle;

  const columns: DataTableColumn<AmbulanceTrip>[] = [
    { key: "when", header: "When", width: "1.1fr", render: (row) => <span className="font-mono text-[12.5px] text-body">{formatDayAndTime(row.when)}</span> },
    { key: "case", header: "Case", width: "1.3fr", render: (row) => <span className="font-bold text-ink">{row.caseText}</span> },
    { key: "detail", header: "Detail", width: "1.6fr", render: (row) => <span className="text-body">{row.detail}</span> },
    { key: "outcome", header: "Outcome", width: "1fr", align: "right", render: (row) => <Badge tone={OUTCOME_TONE[row.outcome]}>{row.outcome}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Ambulance & emergency</h1>
        <p className="mt-1 text-[13px] text-muted">One ambulance on campus, second vehicle on call from Sri Ramakrishna Hospital, 9 km.</p>
      </div>

      {ambulance.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <div className="grid grid-cols-[1.2fr_1fr] gap-4 items-start">
          <Card className={vehicle?.status === "Dispatched" ? "border-border-accent bg-accent-50" : ""}>
            {vehicle ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-[17px] font-extrabold text-ink">Vehicle {vehicle.vehicleNumber}</h2>
                  <Badge tone={vehicle.status === "Dispatched" ? "accentDark" : "accent"}>{vehicle.status}</Badge>
                </div>
                <div className="mt-3 flex flex-col gap-2 text-[14px]">
                  <div className="flex justify-between">
                    <span className="text-muted">Driver</span>
                    <span className="font-bold text-ink">{vehicle.driverName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Contact</span>
                    <span className="font-bold text-ink">{vehicle.driverPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Oxygen cylinder</span>
                    <span className="font-bold capitalize text-ink">{vehicle.oxygenStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Trips this month</span>
                    <span className="font-bold text-ink">{vehicle.tripsThisMonth}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2.5">
                  <Button variant="primarySmall" onClick={() => setStatus.mutate("dispatch")} disabled={vehicle.status === "Dispatched" || setStatus.isPending}>
                    Dispatch now
                  </Button>
                  <Button variant="secondary" onClick={() => setStatus.mutate("recall")} disabled={vehicle.status === "On call" || setStatus.isPending}>
                    Mark available
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState message="Ambulance not set up yet." />
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-[17px] font-extrabold text-ink">Emergency contacts</h2>
            <div className="flex flex-col">
              {(data?.contacts ?? []).map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-3 border-t border-divider py-3 first:border-0 first:pt-0">
                  <div>
                    <div className="text-[14px] font-bold text-ink">{c.name}</div>
                    <div className="text-[12.5px] text-muted">{c.role}</div>
                  </div>
                  <a href={`tel:${c.phone}`} className="shrink-0 rounded-[7px] border border-border-default px-3 py-1.5 text-[12.5px] font-bold text-primary hover:bg-surface-tint">
                    Call
                  </a>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="p-[18px_20px] pb-3">
          <h2 className="text-[17px] font-extrabold text-ink">Dispatch log</h2>
        </div>
        <DataTable columns={columns} data={data?.trips ?? []} rowKey={(row) => row.when} emptyMessage="No dispatches recorded yet." hoverableRows />
      </Card>
    </div>
  );
}

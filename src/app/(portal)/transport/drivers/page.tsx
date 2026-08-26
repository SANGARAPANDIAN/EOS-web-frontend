"use client";

import { useState } from "react";
import { Card, Badge, Avatar, EmptyState, SearchBar, type BadgeTone } from "@/components/ui";
import { useCrew, type CrewMember } from "@/modules/transport/api/crew";
import { formatDisplayDate } from "@/lib/utils/date";

const LICENCE_TONE: Record<string, BadgeTone> = {
  expired: "danger",
  due_soon: "accentDark",
  valid: "neutral",
};

function licenceLabel(member: CrewMember): string {
  if (!member.driver_licence_expiry) return "";
  const days = Math.round((new Date(member.driver_licence_expiry).getTime() - Date.now()) / 86_400_000);
  if (member.licence_state === "expired") return `expired ${Math.abs(days)}d ago`;
  if (member.licence_state === "due_soon") return `due in ${days}d`;
  return "valid";
}

/** Hover lift matching the design reference — applied consistently across the transport module. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

export default function TransportDriversPage() {
  const [search, setSearch] = useState("");
  const crew = useCrew(search || undefined);
  const data = crew.data;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Drivers & crew</h1>
        <p className="mt-1 text-[13px] text-muted">Licences, experience and assigned buses.</p>
      </div>

      <Card className="flex flex-wrap items-center gap-3.5">
        <SearchBar
          placeholder="Search driver, attendant, licence no or assigned bus"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="ml-auto text-[13px] font-semibold text-muted whitespace-nowrap">
          {data ? `${data.meta.filtered} of ${data.meta.total} drivers` : "—"}
        </div>
      </Card>

      {!data?.extended.fleet_status && data && (
        <div className="rounded-[11px] border border-border-default bg-surface-tint px-4 py-3 text-[12.5px] text-muted">
          Licence number, licence expiry, phone and attendant details aren&apos;t tracked yet — only driver names are
          shown until that&apos;s set up.
        </div>
      )}
      {data?.extended.fleet_status && !data.extended.vehicle_specs && (
        <div className="rounded-[11px] border border-border-default bg-surface-tint px-4 py-3 text-[12.5px] text-muted">
          Experience and blood group aren&apos;t tracked yet — those fields show &quot;—&quot; below.
        </div>
      )}

      {crew.isLoading ? (
        <EmptyState message="Loading…" />
      ) : !data || data.crew.length === 0 ? (
        <EmptyState message="No crew match this search." />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {data.crew.map((member, i) => (
            <Card key={member.bus_id} className={`flex flex-col gap-3.5 ${HOVERABLE}`}>
              <div className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-pill border border-border-accent text-[12px] font-extrabold text-primary">
                  {i + 1}
                </span>
                <Avatar name={member.driver_name ?? "Unassigned"} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-bold text-ink">{member.driver_name ?? "Unassigned"}</div>
                  <div className="font-mono text-[12.5px] text-muted">
                    {member.driver_phone ? `+91 ${member.driver_phone}` : "—"}
                  </div>
                </div>
                {member.licence_state && (
                  <Badge tone={LICENCE_TONE[member.licence_state]}>{licenceLabel(member)}</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-subtle">Licence no</div>
                  <div className="mt-1 font-mono text-[13px] font-semibold text-ink-soft">{member.driver_licence_no ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-subtle">Valid till</div>
                  <div className="mt-1 text-[13px] font-semibold text-ink-soft">
                    {member.driver_licence_expiry ? formatDisplayDate(member.driver_licence_expiry) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-subtle">Experience</div>
                  <div className="mt-1 text-[13px] font-semibold text-ink-soft">
                    {member.driver_experience_years != null ? `${member.driver_experience_years} yrs` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-subtle">Assigned bus</div>
                  <div className="mt-1 font-mono text-[13px] font-semibold text-ink-soft">{member.vehicle_number}</div>
                </div>
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-subtle">Attendant</div>
                  <div className="mt-1 text-[13px] font-semibold text-ink-soft">{member.attendant_name ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-subtle">Blood group</div>
                  <div className="mt-1 text-[13px] font-semibold text-ink-soft">{member.driver_blood_group ?? "—"}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

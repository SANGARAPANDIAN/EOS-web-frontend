"use client";

import { Card, Badge, EmptyState } from "@/components/ui";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildMedicalAppointments } from "@/modules/parent/api/medicalAppointments";
import { formatDisplayDate } from "@/lib/utils/date";

const NEGATIVE_STATUSES = new Set(["rejected", "cancelled"]);

export default function ParentMedicalPage() {
  const { selectedChildId } = useSelectedChild();
  const appointments = useChildMedicalAppointments(selectedChildId);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Medical</h1>
          <p className="mt-1 text-[13.5px] text-muted">Appointment history — booking on your child&apos;s behalf isn&apos;t available here</p>
        </div>
        <ChildSwitcher />
      </div>

      {appointments.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : !appointments.data || appointments.data.length === 0 ? (
        <Card>
          <EmptyState message="No medical appointments yet." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {appointments.data.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[15px] font-extrabold tracking-[-.02em] text-ink">{formatDisplayDate(a.slot_date)}</div>
                  <div className="mt-0.5 text-[13px] text-muted">
                    {a.slot_start} – {a.slot_end}
                  </div>
                  {a.reason && <p className="mt-1.5 text-[13px] text-body">{a.reason}</p>}
                  {a.decision_note && <div className="mt-1.5 text-[12px] text-subtle">{a.decision_note}</div>}
                </div>
                <Badge tone={NEGATIVE_STATUSES.has(a.status) ? "accentDark" : "accent"}>{a.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

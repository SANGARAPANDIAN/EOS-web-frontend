"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, EmptyState, Input, Select, Textarea } from "@/components/ui";
import { useSickRoomBeds, useAdmitBed, useDischargeBed, type Bed } from "@/modules/medical-centre/api/sickroom";
import { useOpdQueue } from "@/modules/medical-centre/api/opd";
import { formatDayAndTime } from "@/lib/utils/date";

function AdmitDetailsModal({ bed, onClose }: { bed: Bed; onClose: () => void }) {
  const admit = useAdmitBed();
  const queue = useOpdQueue();
  const waitingQueue = (queue.data ?? []).filter((q) => q.status !== "done");

  const [visitId, setVisitId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [vitals, setVitals] = useState("");
  const [medication, setMedication] = useState("");
  const [guardianContacted, setGuardianContacted] = useState(false);
  const [plan, setPlan] = useState("");
  const [reviewMinutes, setReviewMinutes] = useState(90);
  const [error, setError] = useState<string | null>(null);

  function pullFromQueue(id: string) {
    setVisitId(id);
    const q = waitingQueue.find((o) => String(o.id) === id);
    if (q) setReason(q.complaint);
  }

  async function submit() {
    setError(null);
    try {
      await admit.mutateAsync({
        bedId: bed.bedId,
        visit_id: visitId ? Number(visitId) : undefined,
        reason: reason.trim() || undefined,
        vitals: vitals.trim() || undefined,
        medication_given: medication.trim() || undefined,
        guardian_contacted: guardianContacted,
        plan: plan.trim() || undefined,
        review_in_minutes: reviewMinutes,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not admit to this bed.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-6">
      <div className="max-h-[88vh] w-full max-w-[540px] overflow-auto rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Admit to {bed.id}</div>
            <div className="mt-0.5 text-[13px] text-muted">{bed.wing} wing · fill in what you know now, edit later if needed</div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3.5 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Pull from OPD queue (optional)</label>
            <Select className="mt-1.5" value={visitId} onChange={(e) => pullFromQueue(e.target.value)}>
              <option value="">Not from the queue</option>
              {waitingQueue.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.token} · {q.name} · {q.dept}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Reason for admission</label>
            <Input className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Fever and throat pain" />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Vitals</label>
              <Input className="mt-1.5" value={vitals} onChange={(e) => setVitals(e.target.value)} placeholder="BP 118/76, Temp 99°F" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Medication given</label>
              <Input className="mt-1.5" value={medication} onChange={(e) => setMedication(e.target.value)} placeholder="Paracetamol 500mg" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Plan</label>
            <Textarea className="mt-1.5" rows={2} value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Observe, reassess before discharge" />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Next review in (minutes)</label>
              <Input className="mt-1.5" type="number" min={1} max={1440} value={reviewMinutes} onChange={(e) => setReviewMinutes(Math.max(1, Number(e.target.value)))} />
            </div>
            <label className="mt-[26px] flex items-center gap-2.5 text-[14px] text-body">
              <input type="checkbox" checked={guardianContacted} onChange={(e) => setGuardianContacted(e.target.checked)} className="size-[17px]" />
              Guardian contacted
            </label>
          </div>
          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={admit.isPending}>
            Admit
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function SickRoomPage() {
  const beds = useSickRoomBeds();
  const discharge = useDischargeBed();
  const [admitBed, setAdmitBed] = useState<Bed | null>(null);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Sick room & beds</h1>
        <p className="mt-1 text-[13px] text-muted">Six beds · two in the ladies wing · observation limited to 90 minutes before referral.</p>
      </div>

      {admitBed && <AdmitDetailsModal bed={admitBed} onClose={() => setAdmitBed(null)} />}

      {beds.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {(beds.data ?? []).map((bed) => (
            <div key={bed.id} className={`rounded-card border p-[18px_20px] ${bed.occupied ? "border-border-accent bg-accent-50" : "border-border-default bg-surface"}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] font-bold text-ink">{bed.id}</span>
                <Badge tone={bed.occupied ? "accentDark" : "neutral"}>
                  {bed.occupied ? "Occupied" : "Free"} · {bed.wing}
                </Badge>
              </div>

              {bed.occupied ? (
                <>
                  <div className="mt-3 text-[17px] font-extrabold text-ink">{bed.name ?? "Unrecorded patient"}</div>
                  <div className="text-[12.5px] text-subtle">{bed.deptRoll ?? "—"}</div>
                  <div className="mt-2 text-[13.5px] text-body">{bed.reason ?? "No reason recorded"}</div>
                  <div className="mt-3 flex flex-col gap-1.5 border-t border-divider pt-3 text-[12.5px]">
                    <div className="flex justify-between">
                      <span className="text-muted">Admitted</span>
                      <span className="font-bold text-ink">{bed.admitted ? formatDayAndTime(bed.admitted) : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Attended by</span>
                      <span className="font-bold text-ink">{bed.by ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Vitals</span>
                      <span className="font-bold text-ink">{bed.vitals ?? "Not recorded"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Given</span>
                      <span className="font-bold text-ink">{bed.meds ?? "Not recorded"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Guardian</span>
                      <span className="font-bold text-ink">{bed.guardian}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Next review</span>
                      <span className="font-bold text-ink">{bed.review ? formatDayAndTime(bed.review) : "—"}</span>
                    </div>
                    {bed.plan && <div className="mt-1 text-subtle">{bed.plan}</div>}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-mono text-[12px] text-subtle">Since {bed.since}</span>
                    <button
                      type="button"
                      onClick={() => discharge.mutate(bed.bedId)}
                      disabled={discharge.isPending}
                      className="rounded-[7px] border border-border-default bg-surface px-3 py-1.5 text-[12.5px] font-bold text-primary hover:bg-surface-tint"
                    >
                      Discharge
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
                  <div className="text-[13px] text-subtle">This bed is free.</div>
                  <Button variant="secondary" className="w-auto" onClick={() => setAdmitBed(bed)}>
                    Admit next
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

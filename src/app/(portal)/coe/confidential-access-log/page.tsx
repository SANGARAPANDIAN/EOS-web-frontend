"use client";

import { useState } from "react";
import { Card, StatCard, PillTabs, SearchBar, Select, Input, Button, Modal } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useConfidentialEvents, useConfidentialEventStats, useCreateConfidentialEvent, type ConfidentialEventType } from "@/modules/coe/api/confidentialAccessLog";

const TABS: { key: "all" | ConfidentialEventType; label: string }[] = [
  { key: "all", label: "All events" },
  { key: "strong_room_entry", label: "Strong room" },
  { key: "file_access", label: "File access" },
  { key: "seal_break", label: "Seal break" },
  { key: "exception", label: "Exceptions" },
];

const EVENT_LABEL: Record<ConfidentialEventType, string> = {
  strong_room_entry: "Strong room entry",
  file_access: "File access",
  print_run: "Print run",
  seal_break: "Seal break",
  exception: "Exception",
};

export default function CoeConfidentialAccessLogPage() {
  const [eventType, setEventType] = useState<"all" | ConfidentialEventType>("all");
  const [search, setSearch] = useState("");
  const [showRecord, setShowRecord] = useState(false);

  const stats = useConfidentialEventStats();
  const events = useConfidentialEvents({ event_type: eventType === "all" ? null : eventType, search });
  const rows = events.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Confidential Access Log"
        subtitle="Every entry to the strong room, every question-paper file opened, and every seal broken — with witness and timestamp."
        actions={
          <Button variant="primarySmall" className="w-auto" onClick={() => setShowRecord(true)}>
            + Record entry
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Events logged" value={stats.data?.events_logged ?? (stats.isLoading ? "…" : 0)} icon="history" />
        <StatCard label="Strong room entries" value={stats.data?.strong_room_entries ?? (stats.isLoading ? "…" : 0)} icon="lock" />
        <StatCard label="Sealed papers" value={stats.data?.sealed_papers ?? (stats.isLoading ? "…" : 0)} icon="inventory_2" />
        <StatCard label="Exceptions raised" value={stats.data?.exceptions_raised ?? (stats.isLoading ? "…" : 0)} icon="report" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs options={TABS} value={eventType} onChange={(k) => setEventType(k as typeof eventType)} />
          <SearchBar placeholder="Search person, paper code, purpose…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[280px]" />
        </div>
      </Card>

      {events.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Events</span>
            <span className="text-[12.5px] text-muted">{rows.length} records</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No events recorded yet.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="w-[170px]">Occurred at</div>
                <div className="w-[180px]">Person / event type</div>
                <div className="flex-1">Object</div>
                <div className="w-[160px]">Witness</div>
                <div className="w-[130px]">Verification</div>
              </div>
              {rows.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="w-[170px] text-[12px] text-muted">{new Date(e.occurred_at).toLocaleString()}</div>
                  <div className="w-[180px]">
                    <div className="text-[13px] font-bold text-ink">{e.users_confidential_access_events_person_user_idTousers.email}</div>
                    <div className="text-[11px] text-muted">{EVENT_LABEL[e.event_type]}</div>
                  </div>
                  <div className="flex-1 text-[12.5px] text-ink">{e.object_description}</div>
                  <div className="w-[160px] text-[12px] text-ink">{e.users_confidential_access_events_witness_user_idTousers?.email ?? e.witness_description ?? "—"}</div>
                  <div className="w-[130px] text-[12px] text-muted">{e.verification_method}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <RecordEventModal open={showRecord} onClose={() => setShowRecord(false)} />
    </div>
  );
}

function RecordEventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateConfidentialEvent();
  const [eventType, setEventType] = useState<ConfidentialEventType>("strong_room_entry");
  const [description, setDescription] = useState("");
  const [witness, setWitness] = useState("");
  const [verification, setVerification] = useState("Biometric + OTP");

  function handleClose() {
    setDescription("");
    setWitness("");
    create.reset();
    onClose();
  }

  function handleSave() {
    create.mutate(
      { event_type: eventType, object_description: description, witness_description: witness || undefined, verification_method: verification },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Record entry" subtitle="Every entry needs a witness and verification method.">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Event type</label>
          <Select value={eventType} onChange={(e) => setEventType(e.target.value as ConfidentialEventType)}>
            {Object.entries(EVENT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Object</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. QP-23CS601-SET-A · Bundle 9 of 9" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Witness</label>
          <Input value={witness} onChange={(e) => setWitness(e.target.value)} placeholder="Name or CCTV reference" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Verification method</label>
          <Input value={verification} onChange={(e) => setVerification(e.target.value)} />
        </div>
        {create.isError && <p className="text-[12px] text-danger-fg">{(create.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" disabled={!description.trim() || !verification.trim() || create.isPending} onClick={handleSave}>
            {create.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

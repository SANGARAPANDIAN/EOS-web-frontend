"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui";
import { useDrivesList, useAddPlacementEntry } from "@/modules/iqac/api/studentDevelopment";
import type { StudentRow } from "@/modules/iqac/api/students";
import { StudentPicker } from "./StudentPicker";

const OFFER_STATUS_OPTIONS: { value: "accepted" | "pending" | "declined"; label: string }[] = [
  { value: "accepted", label: "Offer accepted" },
  { value: "pending", label: "Pending" },
  { value: "declined", label: "Declined" },
];

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Records a real, placed student against a real placement_drives row —
 * one student_drive_applications insert plus its offer details, via
 * IqacStudentDevelopmentService.addPlacementEntry(). When companyId is
 * given (the recruiter detail page), the drive picker is scoped to that
 * company and Recruiter is shown locked; the top-level Placements page
 * passes no companyId, so any real drive can be picked. Offer date is
 * genuinely new — see the backend doc comment on addPlacementEntry() —
 * and silently has no effect until the additive column is added.
 */
export function AddPlacementEntryModal({
  onClose,
  onCreated,
  companyId,
  companyName,
}: {
  onClose: () => void;
  onCreated: () => void;
  companyId?: number;
  companyName?: string;
}) {
  const drives = useDrivesList({ limit: 50, company_id: companyId });
  const addEntry = useAddPlacementEntry();

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [driveId, setDriveId] = useState("");
  const [packageLpa, setPackageLpa] = useState("");
  const [offerDate, setOfferDate] = useState(todayDateInput());
  const [offerStatus, setOfferStatus] = useState<"accepted" | "pending" | "declined">("accepted");
  const [error, setError] = useState<string | null>(null);

  const selectedDrive = useMemo(() => (drives.data?.data ?? []).find((d) => String(d.id) === driveId), [drives.data, driveId]);
  const recruiterName = companyName ?? selectedDrive?.companies?.name ?? "—";
  const role = selectedDrive?.job_role ?? "—";

  function pickDrive(id: string) {
    setDriveId(id);
    const drive = (drives.data?.data ?? []).find((d) => String(d.id) === id);
    if (drive?.package_lpa != null) setPackageLpa(String(drive.package_lpa));
  }

  async function submit() {
    if (!student || !driveId) {
      setError("Student and drive are both required.");
      return;
    }
    setError(null);
    try {
      await addEntry.mutateAsync({
        driveId: Number(driveId),
        student_id: student.id,
        offer_response: offerStatus,
        offered_package_lpa: packageLpa.trim() ? Number(packageLpa) : undefined,
        offer_date: offerDate || undefined,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this entry.");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add student entry"
      subtitle={`Placed students · ${companyName ?? "Placements"}`}
    >
      <div className="flex flex-col gap-4">
        <StudentPicker selected={student} onSelect={setStudent} />

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Drive</div>
          <select
            value={driveId}
            onChange={(e) => pickDrive(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default bg-surface px-3 text-[13.5px] outline-none focus:border-primary"
          >
            <option value="">Select drive</option>
            {(drives.data?.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {companyId ? "" : `${d.companies?.name ?? "Unknown company"} · `}
                {d.job_role ?? "—"} · {d.scheduled_date ?? "—"}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Recruiter</div>
            <div className="mt-1.5 h-11 flex items-center rounded-[11px] border border-border-default bg-surface-tint px-3.5 text-[13.5px] font-bold text-ink">{recruiterName}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Role</div>
            <div className="mt-1.5 h-11 flex items-center rounded-[11px] border border-border-default bg-surface-tint px-3.5 text-[13.5px] font-bold text-ink">{role}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Package (LPA)</div>
            <input
              type="number"
              min={0}
              step={0.1}
              value={packageLpa}
              onChange={(e) => setPackageLpa(e.target.value)}
              placeholder="e.g. 6.5"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Offer date</div>
            <input
              type="date"
              value={offerDate}
              onChange={(e) => setOfferDate(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Faculty mentor</div>
          <div className="mt-1.5 h-11 flex items-center rounded-[11px] border border-border-default bg-surface-tint px-3.5 text-[13.5px] font-bold text-ink">
            {student?.mentor?.name ?? "Not assigned"}
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Offer status</div>
          <select
            value={offerStatus}
            onChange={(e) => setOfferStatus(e.target.value as typeof offerStatus)}
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default bg-surface px-3 text-[13.5px] outline-none focus:border-primary"
          >
            {OFFER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-[42px] rounded-[10px] border border-border-default bg-surface px-4 text-[13.5px] font-bold text-ink hover:bg-surface-tint">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={addEntry.isPending}
            className="h-[42px] rounded-[10px] border border-primary-border bg-primary px-4 text-[13.5px] font-bold text-white disabled:opacity-50"
          >
            {addEntry.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

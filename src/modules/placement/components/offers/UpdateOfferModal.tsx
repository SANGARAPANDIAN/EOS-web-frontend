"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useUpdateOfferDetails } from "../../hooks/useApplicationMutations";
import type { Offer, OfferResponseStatus } from "../../types";

function lpa(value: number | undefined): string {
  return value == null ? "—" : `₹${value.toFixed(1)} LPA`;
}

interface UpdateOfferModalProps {
  open: boolean;
  offer: Offer | null;
  onClose: () => void;
}

export function UpdateOfferModal({ open, offer, onClose }: UpdateOfferModalProps) {
  const { show } = useToast();
  const updateOfferDetails = useUpdateOfferDetails();
  const [status, setStatus] = useState<OfferResponseStatus>(offer?.offerResponse ?? "pending");
  const [joiningDate, setJoiningDate] = useState(offer?.joiningDate ?? "");
  const [workLocation, setWorkLocation] = useState(offer?.workLocation ?? "");

  // Re-hydrate from the current offer every time the modal opens for a
  // (possibly different) offer — deliberate one-shot hydration on
  // open/offer-change, not the external-sync setState the rule targets.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setStatus(offer?.offerResponse ?? "pending");
    setJoiningDate(offer?.joiningDate ?? "");
    setWorkLocation(offer?.workLocation ?? "");
  }, [offer, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!offer) return null;
  const currentOffer = offer;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateOfferDetails.mutate(
      {
        driveId: currentOffer.driveId,
        studentId: currentOffer.studentId,
        offerResponse: status,
        joiningDate: joiningDate || undefined,
        workLocation: workLocation || undefined,
      },
      {
        onSuccess: () => {
          show("Offer status updated.", "success");
          onClose();
        },
        onError: (err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong.", "error"),
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update offer status"
      subtitle={`${currentOffer.studentName ?? currentOffer.studentIdNo} · ${currentOffer.companyName} · ${lpa(currentOffer.offeredPackageLpa ?? currentOffer.packageLpa)}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Status</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as OfferResponseStatus)}>
            <option value="accepted">Accepted</option>
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
          </Select>
        </div>

        {status === "accepted" && (
          <>
            <div className="mb-3.5">
              <label className="mb-1 block text-[12.5px] font-semibold text-body">Joining date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                min="2020-01-01"
                max="2030-12-31"
                className="w-full min-w-0 rounded-input border border-border-default bg-surface px-[13px] py-[11px] font-sans text-sm text-ink focus:border-border-accent focus:outline-none"
              />
            </div>
            <div className="mb-3.5">
              <label className="mb-1 block text-[12.5px] font-semibold text-body">Location</label>
              <Input placeholder="e.g. Chennai" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} />
            </div>
          </>
        )}

        <div className="mt-4.5 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={updateOfferDetails.isPending} className="w-auto">
            Cancel
          </Button>
          <Button type="submit" variant="primarySmall" disabled={updateOfferDetails.isPending}>
            {updateOfferDetails.isPending ? "Updating…" : "Update"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

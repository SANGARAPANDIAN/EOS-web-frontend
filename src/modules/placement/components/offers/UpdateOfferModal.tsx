"use client";

import { useEffect, useState } from "react";
import { Modal, Button, FormField, Input, Select, DatePicker, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useUpdateOfferDetails, useUpdateOfferedPackage } from "@/modules/placement/api/applications";
import type { Offer } from "@/modules/placement/api/offers";
import type { OfferResponseStatus } from "@/modules/placement/api/types";
import { lpa } from "@/modules/placement/lib/format";

interface UpdateOfferModalProps {
  open: boolean;
  offer: Offer | null;
  onClose: () => void;
}

/** No dedicated zod schema exists for this form in the frozen schemas/ directory (only interview and record-result forms do) — this mirrors the old modal's own plain-state approach rather than inventing one. */
export function UpdateOfferModal({ open, offer, onClose }: UpdateOfferModalProps) {
  const { show } = useToast();
  const updateOfferDetails = useUpdateOfferDetails();
  const updateOfferedPackage = useUpdateOfferedPackage();

  const [status, setStatus] = useState<OfferResponseStatus>(offer?.offerResponse ?? "pending");
  const [packageLpa, setPackageLpa] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [workLocation, setWorkLocation] = useState("");

  // Re-hydrate from the current offer every time the modal opens for a
  // (possibly different) offer — deliberate one-shot hydration on
  // open/offer-change, not the external-sync setState the rule targets.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setStatus(offer?.offerResponse ?? "pending");
    setPackageLpa(offer?.offeredPackageLpa != null ? String(offer.offeredPackageLpa) : "");
    setJoiningDate(offer?.joiningDate ?? "");
    setWorkLocation(offer?.workLocation ?? "");
  }, [offer, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!offer) return null;
  const currentOffer = offer;
  const isPending = updateOfferDetails.isPending || updateOfferedPackage.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const parsedPackage = packageLpa.trim() === "" ? undefined : Number(packageLpa);
      if (parsedPackage !== undefined && parsedPackage !== currentOffer.offeredPackageLpa) {
        await updateOfferedPackage.mutateAsync({
          driveId: currentOffer.driveId,
          studentId: currentOffer.studentId,
          offeredPackageLpa: parsedPackage,
        });
      }
      await updateOfferDetails.mutateAsync({
        driveId: currentOffer.driveId,
        studentId: currentOffer.studentId,
        offerResponse: status,
        joiningDate: joiningDate || undefined,
        workLocation: workLocation || undefined,
      });
      show("Offer status updated.", "success");
      onClose();
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update offer status"
      subtitle={`${currentOffer.studentName ?? currentOffer.studentIdNo} · ${currentOffer.companyName} · ${lpa(
        currentOffer.offeredPackageLpa ?? currentOffer.packageLpa,
      )}`}
      widthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as OfferResponseStatus)}>
            <option value="accepted">Accepted</option>
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
          </Select>
        </FormField>

        <FormField label="Offered package (LPA)" hint="Leave blank to keep the drive's advertised package">
          <Input type="number" step="0.1" min="0" placeholder="e.g. 8.5" value={packageLpa} onChange={(e) => setPackageLpa(e.target.value)} />
        </FormField>

        {status === "accepted" && (
          <>
            <FormField label="Joining date">
              <DatePicker value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} min="2020-01-01" max="2030-12-31" />
            </FormField>
            <FormField label="Location">
              <Input placeholder="e.g. Chennai" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} />
            </FormField>
          </>
        )}

        <div className="mt-2 flex justify-end gap-2.5 border-t border-admin-divider pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving…" : "Update"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { Button, Card, Input, EmptyState } from "@/components/ui";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { ApiError } from "@/types/api";
import { useCanteenSettings, useUpdateCanteenSettings, type CanteenSettings } from "@/modules/canteen-admin/api/settings";

function SettingsForm({ initial }: { initial: CanteenSettings }) {
  const updateSettings = useUpdateCanteenSettings();
  const [gstPercentage, setGstPercentage] = useState(String(initial.gst_percentage));
  const [parcelCharge, setParcelCharge] = useState(String(initial.parcel_charge));
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setFormError(null);
    setSaved(false);
    const gst = Number(gstPercentage);
    const parcel = Number(parcelCharge);
    if (gstPercentage === "" || Number.isNaN(gst) || gst < 0) {
      setFormError("Enter a valid GST percentage.");
      return;
    }
    if (parcelCharge === "" || Number.isNaN(parcel) || parcel < 0) {
      setFormError("Enter a valid parcel charge.");
      return;
    }
    try {
      await updateSettings.mutateAsync({ gst_percentage: gst, parcel_charge: parcel });
      setSaved(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-[12.5px] font-bold text-muted">GST Percentage (%)</label>
        <Input type="number" min={0} step="0.01" value={gstPercentage} onChange={(e) => setGstPercentage(e.target.value)} placeholder="0.00" />
        <p className="mt-1 text-[12px] text-subtle">Added to every bill&apos;s total at checkout.</p>
      </div>
      <div>
        <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Parcel Charge (₹ per item)</label>
        <Input type="number" min={0} step="0.01" value={parcelCharge} onChange={(e) => setParcelCharge(e.target.value)} placeholder="0.00" />
        <p className="mt-1 text-[12px] text-subtle">Flat charge added for each cart line marked &quot;parcel&quot; (takeaway).</p>
      </div>
      {formError && <p className="text-[12.5px] font-semibold text-danger-fg">{formError}</p>}
      {saved && !formError && <p className="text-[12.5px] font-semibold text-primary">Saved.</p>}
      <Button variant="primarySmall" className="w-auto self-start" loading={updateSettings.isPending} onClick={handleSave}>
        Save Settings
      </Button>
    </div>
  );
}

export default function CanteenSettingsPage() {
  const { data, isLoading, error } = useCanteenSettings();

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Settings</h1>
        <p className="mt-1.5 text-[14px] font-medium text-muted">Billing policy applied by the Cashier at checkout.</p>
      </div>

      <Card className="max-w-[480px]">
        {error ? (
          <EmptyState message={error instanceof Error ? error.message : "Could not load settings."} />
        ) : isLoading && !data ? (
          <SkeletonBlock className="h-40" />
        ) : (
          data && <SettingsForm initial={data} />
        )}
      </Card>
    </div>
  );
}

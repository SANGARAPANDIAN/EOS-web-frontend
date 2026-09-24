"use client";

import { useRef, useState } from "react";
import { Button, Card, SegmentedTabs, ConfirmDialog, EmptyState, Icon } from "@/components/ui";
import { SkeletonCardGrid } from "@/components/ui/Skeleton";
import { ApiError } from "@/types/api";
import {
  useTodaysSpecials,
  useUploadTodaysSpecial,
  useDeleteTodaysSpecial,
  type MealType,
  type CanteenTodaysSpecial,
} from "@/modules/canteen-admin/api/todaysSpecial";

export default function CanteenTodaysSpecialPage() {
  const [mealType, setMealType] = useState<MealType>("lunch");
  const { data: specials, isLoading, error } = useTodaysSpecials(mealType);
  const uploadSpecial = useUploadTodaysSpecial();
  const deleteSpecial = useDeleteTodaysSpecial();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CanteenTodaysSpecial | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    try {
      await uploadSpecial.mutateAsync({ mealType, file });
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Could not upload the image.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSpecial.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteTarget(null);
      alert(err instanceof ApiError ? err.message : "Could not remove this special.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Today&apos;s Special</h1>
          <p className="mt-1.5 text-[14px] font-medium text-muted">Upload posters for today&apos;s lunch and dinner specials.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" loading={uploadSpecial.isPending} onClick={() => fileInputRef.current?.click()}>
          + Upload Image
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
      </div>

      <SegmentedTabs
        options={[
          { key: "lunch", label: "Lunch" },
          { key: "dinner", label: "Dinner" },
        ]}
        value={mealType}
        onChange={setMealType}
      />

      {uploadError && (
        <p className="text-[12.5px] font-semibold text-danger-fg">{uploadError}</p>
      )}

      {error ? (
        <Card>
          <EmptyState message={error instanceof Error ? error.message : "Could not load today's specials."} />
        </Card>
      ) : isLoading && !specials ? (
        <SkeletonCardGrid count={4} columns={4} />
      ) : !specials || specials.length === 0 ? (
        <Card>
          <EmptyState message={`No ${mealType} special uploaded for today yet.`} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {specials.map((special) => (
            <Card key={special.id} className="flex flex-col gap-2.5 p-3">
              <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-[10px] bg-surface-input">
                {/* eslint-disable-next-line @next/next/no-img-element -- storage domain isn't in next.config's image allowlist, same pattern as ProfilePhoto */}
                <img src={special.image_url} alt={`${special.meal_type} special`} className="size-full object-cover" />
              </div>
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 rounded-[8px] border border-border-default py-1.5 text-[12.5px] font-bold text-danger-fg hover:bg-surface-input"
                onClick={() => setDeleteTarget(special)}
              >
                <Icon name="delete" size={15} />
                Remove
              </button>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove this special?"
        description="It will no longer show to students today."
        confirmLabel="Remove"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

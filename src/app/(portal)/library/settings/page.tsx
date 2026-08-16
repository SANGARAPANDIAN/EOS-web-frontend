"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { friendlyError } from "@/lib/utils/errors";
import { numberFieldOptions, textFieldOptions } from "@/lib/utils/rhf-helpers";
import { Button, FormField, Input, PageHeader, SectionCard, useToast } from "@/modules/admin/components/ui";
import { useLibrarySettings, useUpdateLibrarySettings, type LibrarySettings } from "@/modules/library/api/settings";
import { settingsFormSchema, type SettingsFormValues } from "@/modules/library/schemas/settings-form.schema";

function toDefaults(settings: LibrarySettings | undefined): SettingsFormValues {
  return {
    books_per_student: settings?.books_per_student,
    default_borrowing_days: settings?.default_borrowing_days,
    max_renewals: settings?.max_renewals,
    renewal_extension_days: settings?.renewal_extension_days,
    fine_per_day: settings?.fine_per_day,
    lost_book_processing_fee: settings?.lost_book_processing_fee,
    damaged_book_charge_rate: settings?.damaged_book_charge_rate,
    grace_period_days: settings?.grace_period_days,
    block_issue_above_fine: settings?.block_issue_above_fine,
    barcode_format: settings?.barcode_format ?? undefined,
    spine_label_prefix: settings?.spine_label_prefix ?? undefined,
    counter_opens_at: settings?.counter_opens_at ?? undefined,
    counter_closes_at: settings?.counter_closes_at ?? undefined,
  };
}

export default function LibrarySettingsPage() {
  const { show } = useToast();
  const { data: settings, isLoading, error } = useLibrarySettings();
  const updateSettings = useUpdateLibrarySettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: toDefaults(settings),
  });

  useEffect(() => {
    reset(toDefaults(settings));
  }, [settings, reset]);

  function onSubmit(values: SettingsFormValues) {
    updateSettings.mutate(values, {
      onSuccess: () => show("Library settings saved.", "success"),
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  if (isLoading) {
    return <p className="text-sm text-admin-muted">Loading settings…</p>;
  }

  if (error) {
    return (
      <div className="rounded-admin-lg border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
        {friendlyError(error)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" description="Borrowing rules, fines, classification, and counter hours." />

      <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-3xl flex-col gap-6">
        <SectionCard title="Borrowing rules">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Books per student" error={errors.books_per_student?.message}>
              <Input type="number" {...register("books_per_student", numberFieldOptions)} />
            </FormField>
            <FormField label="Default borrowing days" error={errors.default_borrowing_days?.message}>
              <Input type="number" {...register("default_borrowing_days", numberFieldOptions)} />
            </FormField>
            <FormField label="Max renewals" error={errors.max_renewals?.message}>
              <Input type="number" {...register("max_renewals", numberFieldOptions)} />
            </FormField>
            <FormField label="Renewal extension days" error={errors.renewal_extension_days?.message}>
              <Input type="number" {...register("renewal_extension_days", numberFieldOptions)} />
            </FormField>
            <FormField label="Grace period days" error={errors.grace_period_days?.message}>
              <Input type="number" {...register("grace_period_days", numberFieldOptions)} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Fines">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Fine per day (₹)" error={errors.fine_per_day?.message}>
              <Input type="number" {...register("fine_per_day", numberFieldOptions)} />
            </FormField>
            <FormField
              label="Block issue above fine (₹)"
              hint="Students with unpaid fines above this amount can't borrow more books"
              error={errors.block_issue_above_fine?.message}
            >
              <Input type="number" {...register("block_issue_above_fine", numberFieldOptions)} />
            </FormField>
            <FormField label="Lost book processing fee (₹)" error={errors.lost_book_processing_fee?.message}>
              <Input type="number" {...register("lost_book_processing_fee", numberFieldOptions)} />
            </FormField>
            <FormField
              label="Damaged book charge rate"
              hint="Fraction of the book's price, 0–1 (e.g. 0.4 = 40%)"
              error={errors.damaged_book_charge_rate?.message}
            >
              <Input type="number" step="0.01" {...register("damaged_book_charge_rate", numberFieldOptions)} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Classification & counter">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Barcode format" error={errors.barcode_format?.message}>
              <Input {...register("barcode_format", textFieldOptions)} />
            </FormField>
            <FormField label="Spine label prefix" error={errors.spine_label_prefix?.message}>
              <Input {...register("spine_label_prefix", textFieldOptions)} />
            </FormField>
            <FormField label="Counter opens at" error={errors.counter_opens_at?.message}>
              <Input type="time" {...register("counter_opens_at", textFieldOptions)} />
            </FormField>
            <FormField label="Counter closes at" error={errors.counter_closes_at?.message}>
              <Input type="time" {...register("counter_closes_at", textFieldOptions)} />
            </FormField>
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

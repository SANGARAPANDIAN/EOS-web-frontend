"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormField, Input, Select, DatePicker, FilterPill, Card, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { numberFieldOptions, textFieldOptions } from "@/lib/utils/rhf-helpers";
import { useCompanies, useCreateCompany } from "@/modules/placement/api/companies";
import { useCreateDrive } from "@/modules/placement/api/drives";
import { driveFormSchema, OTHER_COMPANY_ID, type DriveFormValues } from "@/modules/placement/schemas/drive-form.schema";

const EMPTY_DEFAULTS: DriveFormValues = {
  companyId: 0,
  scheduledDate: "",
  isDisclosed: true,
  disclosedRevealDate: undefined,
  role: undefined,
  packageLpa: undefined,
  eligibilityCgpa: undefined,
  venue: undefined,
  registrationStart: undefined,
  registrationEnd: undefined,
  mode: undefined,
  backlogsAllowed: undefined,
  eligibleDepartmentCodes: undefined,
  round1Label: undefined,
  round2Label: undefined,
  round3Label: undefined,
  resultDeclarationNote: undefined,
};

export function ScheduleDriveForm() {
  const router = useRouter();
  const { show } = useToast();
  const { data: companyPage } = useCompanies({ page_size: 50 });
  const createCompany = useCreateCompany();
  const createDrive = useCreateDrive();
  const [newCompanyName, setNewCompanyName] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DriveFormValues>({
    resolver: zodResolver(driveFormSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() is inherently un-memoizable; calling it here (during render, the documented way) is correct even though the compiler can't verify it.
  const companyId = watch("companyId");
  const isDisclosed = watch("isDisclosed");
  const isOtherCompany = companyId === OTHER_COMPANY_ID;
  const currentYear = new Date().getFullYear();

  async function onSubmit(values: DriveFormValues) {
    try {
      let resolvedCompanyId = values.companyId;

      if (resolvedCompanyId === OTHER_COMPANY_ID) {
        const trimmedName = newCompanyName.trim();
        if (!trimmedName) {
          show("Enter the new company's name.", "error");
          return;
        }
        const company = await createCompany.mutateAsync({ name: trimmedName });
        resolvedCompanyId = company.id;
      }

      await createDrive.mutateAsync({ ...values, companyId: resolvedCompanyId });
      show("Drive scheduled.", "success");
      router.push("/placement/drives");
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  const isPending = createDrive.isPending || createCompany.isPending;

  return (
    <Card hoverable={false} className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Company" error={errors.companyId?.message} className="sm:col-span-2">
            <div className="flex flex-col gap-2.5">
              <Select
                value={companyId || ""}
                onChange={(e) => setValue("companyId", Number(e.target.value), { shouldValidate: true })}
                className={errors.companyId ? "border-admin-danger" : undefined}
              >
                <option value="">Select a company</option>
                {companyPage?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={OTHER_COMPANY_ID}>Other (add new company)</option>
              </Select>
              {isOtherCompany && (
                <Input
                  placeholder="New company name"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                />
              )}

              <div className="mt-1 flex items-center gap-2">
                <FilterPill
                  type="button"
                  active={isDisclosed}
                  onClick={() => setValue("isDisclosed", true, { shouldValidate: true })}
                >
                  Reveal name
                </FilterPill>
                <FilterPill
                  type="button"
                  active={!isDisclosed}
                  onClick={() => setValue("isDisclosed", false, { shouldValidate: true })}
                >
                  Hide name
                </FilterPill>
              </div>
              <p className="text-xs text-admin-muted">
                {isDisclosed
                  ? "Students see the company name immediately."
                  : "Students see only the company ID until the reveal date below."}
              </p>
            </div>
          </FormField>

          <FormField label="Drive date" error={errors.scheduledDate?.message}>
            <DatePicker
              min={`${currentYear}-01-01`}
              max={`${currentYear + 4}-12-31`}
              className={errors.scheduledDate ? "border-admin-danger" : undefined}
              {...register("scheduledDate")}
            />
          </FormField>

          <FormField label="Job role" error={errors.role?.message}>
            <Input {...register("role", textFieldOptions)} />
          </FormField>
          <FormField label="Package (LPA)" error={errors.packageLpa?.message}>
            <Input type="number" step="0.1" {...register("packageLpa", numberFieldOptions)} />
          </FormField>
          <FormField label="Eligibility (CGPA)" error={errors.eligibilityCgpa?.message}>
            <Input type="number" step="0.1" {...register("eligibilityCgpa", numberFieldOptions)} />
          </FormField>
          <FormField label="Venue" error={errors.venue?.message}>
            <Input {...register("venue", textFieldOptions)} />
          </FormField>
          <FormField label="Registration start" error={errors.registrationStart?.message}>
            <DatePicker min="2020-01-01" max="2030-12-31" {...register("registrationStart", textFieldOptions)} />
          </FormField>
          <FormField label="Registration end" error={errors.registrationEnd?.message}>
            <DatePicker min="2020-01-01" max="2030-12-31" {...register("registrationEnd", textFieldOptions)} />
          </FormField>
        </div>

        <div className="border-t border-admin-divider pt-5">
          <p className="mb-3 text-sm font-bold text-admin-ink">Additional details</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Mode" error={errors.mode?.message}>
              <Select {...register("mode", textFieldOptions)}>
                <option value="">Not set</option>
                <option value="on_campus">On campus</option>
                <option value="virtual">Virtual</option>
              </Select>
            </FormField>
            <FormField label="Backlogs allowed" error={errors.backlogsAllowed?.message}>
              <Input placeholder="e.g. None" {...register("backlogsAllowed", textFieldOptions)} />
            </FormField>
            <FormField label="Eligible departments" error={errors.eligibleDepartmentCodes?.message}>
              <Input placeholder="e.g. CSE, IT, AIDS" {...register("eligibleDepartmentCodes", textFieldOptions)} />
            </FormField>
            <FormField label="Result declaration" error={errors.resultDeclarationNote?.message}>
              <Input placeholder="e.g. Same week as the final round" {...register("resultDeclarationNote", textFieldOptions)} />
            </FormField>
            <FormField label="Round 1" error={errors.round1Label?.message}>
              <Input placeholder="e.g. Online assessment" {...register("round1Label", textFieldOptions)} />
            </FormField>
            <FormField label="Round 2" error={errors.round2Label?.message}>
              <Input placeholder="e.g. Technical interview" {...register("round2Label", textFieldOptions)} />
            </FormField>
            <FormField label="Round 3" error={errors.round3Label?.message}>
              <Input placeholder="e.g. HR interview" {...register("round3Label", textFieldOptions)} />
            </FormField>
          </div>
        </div>

        {!isDisclosed && (
          <div className="border-t border-admin-divider pt-5">
            <FormField
              label="Reveal date"
              hint="The company name stays hidden from students until this date — must be before the drive date"
              error={errors.disclosedRevealDate?.message}
            >
              <DatePicker min="2020-01-01" max="2030-12-31" {...register("disclosedRevealDate", textFieldOptions)} />
            </FormField>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-admin-divider pt-5">
          <Button type="button" variant="secondary" onClick={() => router.push("/placement/drives")} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Scheduling…" : "Schedule drive"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

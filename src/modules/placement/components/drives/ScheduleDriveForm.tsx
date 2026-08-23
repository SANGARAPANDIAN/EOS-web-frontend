"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useCompanies } from "../../hooks/useCompanies";
import { useCreateCompany } from "../../hooks/useCompanyMutations";
import { useCreateDrive } from "../../hooks/useDriveMutations";
import { driveFormSchema, OTHER_COMPANY_ID, type DriveFormValues } from "../../schemas/drive-form.schema";

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

function Field({ label, htmlFor, required, error, hint, children }: { label: string; htmlFor: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <label htmlFor={htmlFor} className="mb-1 block text-[12.5px] font-semibold text-body">
        {label}
        {required && <span className="text-danger-fg"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-subtle">{hint}</p>}
      {error && <p className="mt-1 text-[11.5px] text-danger-fg">{error}</p>}
    </div>
  );
}

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

  const companyId = watch("companyId");
  const isDisclosed = watch("isDisclosed");
  const scheduledDate = watch("scheduledDate");
  const isOtherCompany = companyId === OTHER_COMPANY_ID;
  const currentYear = new Date().getFullYear();
  const busy = createDrive.isPending || createCompany.isPending;

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
      show(err instanceof ApiError ? err.message : "Something went wrong.", "error");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Company" htmlFor="drive-company" required error={errors.companyId?.message}>
          <div className="flex flex-col gap-2">
            <Select
              id="drive-company"
              className={errors.companyId ? "border-danger-border" : undefined}
              value={companyId || ""}
              onChange={(e) => setValue("companyId", Number(e.target.value), { shouldValidate: true })}
            >
              <option value="">Select a company</option>
              {companyPage?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={OTHER_COMPANY_ID}>Other (add new company)</option>
            </Select>
            {isOtherCompany && <Input placeholder="New company name" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />}

            <div className="mt-1 flex items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5 font-medium text-body">
                <input type="radio" name="disclosure" checked={isDisclosed} onChange={() => setValue("isDisclosed", true, { shouldValidate: true })} className="accent-primary" />
                Reveal name
              </label>
              <label className="flex items-center gap-1.5 font-medium text-body">
                <input type="radio" name="disclosure" checked={!isDisclosed} onChange={() => setValue("isDisclosed", false, { shouldValidate: true })} className="accent-primary" />
                Hide name
              </label>
            </div>
            <p className="text-xs text-subtle">{isDisclosed ? "Students see the company name immediately." : "Students see only the company ID until the reveal date below."}</p>
          </div>
        </Field>

        <Field label="Drive date" htmlFor="drive-date" required error={errors.scheduledDate?.message}>
          <Input
            id="drive-date"
            type="date"
            className={errors.scheduledDate ? "border-danger-border" : undefined}
            value={scheduledDate || ""}
            onChange={(e) => setValue("scheduledDate", e.target.value, { shouldValidate: true })}
            min={`${currentYear}-01-01`}
            max={`${currentYear + 4}-12-31`}
          />
        </Field>

        <Field label="Job role" htmlFor="drive-role" error={errors.role?.message}>
          <Input id="drive-role" className={errors.role ? "border-danger-border" : undefined} {...register("role")} />
        </Field>
        <Field label="Package (LPA)" htmlFor="drive-package" error={errors.packageLpa?.message}>
          <Input id="drive-package" type="number" step="0.1" className={errors.packageLpa ? "border-danger-border" : undefined} {...register("packageLpa", { valueAsNumber: true })} />
        </Field>
        <Field label="Eligibility (CGPA)" htmlFor="drive-cgpa" error={errors.eligibilityCgpa?.message}>
          <Input id="drive-cgpa" type="number" step="0.01" className={errors.eligibilityCgpa ? "border-danger-border" : undefined} {...register("eligibilityCgpa", { valueAsNumber: true })} />
        </Field>
        <Field label="Venue" htmlFor="drive-venue" error={errors.venue?.message}>
          <Input id="drive-venue" className={errors.venue ? "border-danger-border" : undefined} {...register("venue")} />
        </Field>
        <Field label="Registration start" htmlFor="drive-reg-start" error={errors.registrationStart?.message}>
          <Input
            id="drive-reg-start"
            type="date"
            className={errors.registrationStart ? "border-danger-border" : undefined}
            value={watch("registrationStart") || ""}
            onChange={(e) => setValue("registrationStart", e.target.value || undefined, { shouldValidate: true })}
            min="2020-01-01"
            max="2030-12-31"
          />
        </Field>
        <Field label="Registration end" htmlFor="drive-reg-end" error={errors.registrationEnd?.message}>
          <Input
            id="drive-reg-end"
            type="date"
            className={errors.registrationEnd ? "border-danger-border" : undefined}
            value={watch("registrationEnd") || ""}
            onChange={(e) => setValue("registrationEnd", e.target.value || undefined, { shouldValidate: true })}
            min="2020-01-01"
            max="2030-12-31"
          />
        </Field>
      </div>

      <div className="mt-4 border-t border-border-default pt-4">
        <p className="mb-3 text-sm font-semibold text-body">Additional details</p>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Field label="Mode" htmlFor="drive-mode" error={errors.mode?.message}>
            <Select
              id="drive-mode"
              className={errors.mode ? "border-danger-border" : undefined}
              value={watch("mode") ?? ""}
              onChange={(e) => setValue("mode", (e.target.value || undefined) as DriveFormValues["mode"], { shouldValidate: true })}
            >
              <option value="">Not set</option>
              <option value="on_campus">On campus</option>
              <option value="virtual">Virtual</option>
            </Select>
          </Field>
          <Field label="Backlogs allowed" htmlFor="drive-backlogs" error={errors.backlogsAllowed?.message}>
            <Input id="drive-backlogs" placeholder="e.g. None" className={errors.backlogsAllowed ? "border-danger-border" : undefined} {...register("backlogsAllowed")} />
          </Field>
          <Field label="Eligible departments" htmlFor="drive-depts" error={errors.eligibleDepartmentCodes?.message}>
            <Input id="drive-depts" placeholder="e.g. CSE, IT, AIDS" className={errors.eligibleDepartmentCodes ? "border-danger-border" : undefined} {...register("eligibleDepartmentCodes")} />
          </Field>
          <Field label="Result declaration" htmlFor="drive-result-note" error={errors.resultDeclarationNote?.message}>
            <Input id="drive-result-note" placeholder="e.g. Same week as the final round" className={errors.resultDeclarationNote ? "border-danger-border" : undefined} {...register("resultDeclarationNote")} />
          </Field>
          <Field label="Round 1" htmlFor="drive-round1" error={errors.round1Label?.message}>
            <Input id="drive-round1" placeholder="e.g. Online assessment" className={errors.round1Label ? "border-danger-border" : undefined} {...register("round1Label")} />
          </Field>
          <Field label="Round 2" htmlFor="drive-round2" error={errors.round2Label?.message}>
            <Input id="drive-round2" placeholder="e.g. Technical interview" className={errors.round2Label ? "border-danger-border" : undefined} {...register("round2Label")} />
          </Field>
          <Field label="Round 3" htmlFor="drive-round3" error={errors.round3Label?.message}>
            <Input id="drive-round3" placeholder="e.g. HR interview" className={errors.round3Label ? "border-danger-border" : undefined} {...register("round3Label")} />
          </Field>
        </div>
      </div>

      {!isDisclosed && (
        <div className="mt-4 flex flex-col gap-4 border-t border-border-default pt-4">
          <Field
            label="Reveal date"
            htmlFor="drive-reveal-date"
            required
            hint="The company name stays hidden from students until this date — must be before the drive date"
            error={errors.disclosedRevealDate?.message}
          >
            <Input
              id="drive-reveal-date"
              type="date"
              className={errors.disclosedRevealDate ? "border-danger-border" : undefined}
              value={watch("disclosedRevealDate") || ""}
              onChange={(e) => setValue("disclosedRevealDate", e.target.value || undefined, { shouldValidate: true })}
              min="2020-01-01"
              max="2030-12-31"
            />
          </Field>
        </div>
      )}

      <div className="mt-4.5 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
        <Button type="button" variant="secondary" onClick={() => router.push("/placement/drives")} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="primarySmall" disabled={busy}>
          {busy ? "Scheduling…" : "Schedule drive"}
        </Button>
      </div>
      </Card>
    </form>
  );
}

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Button, FormField, Input, Select, Textarea, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { numberFieldOptions, textFieldOptions } from "@/lib/utils/rhf-helpers";
import {
  COMPANY_INDUSTRIES,
  useCreateCompany,
  useUpdateCompany,
  type Company,
  type CreateCompanyInput,
} from "@/modules/placement/api/companies";
import { companyFormSchema, type CompanyFormValues } from "@/modules/placement/schemas/company-form.schema";

interface CompanyFormModalProps {
  open: boolean;
  company: Company | null;
  onClose: () => void;
}

function toDefaults(company: Company | null): CompanyFormValues {
  return {
    name: company?.name ?? "",
    industry: (company?.industry as CompanyFormValues["industry"]) ?? undefined,
    location: company?.location ?? undefined,
    recruiterSpoc: company?.recruiterSpoc ?? undefined,
    expectedPackageLpa: company?.expectedPackageLpa ?? undefined,
    profileInfo: company?.profileInfo ?? undefined,
  };
}

export function CompanyFormModal({ open, company, onClose }: CompanyFormModalProps) {
  const { show } = useToast();
  const isEditing = company !== null;

  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: toDefaults(company),
  });

  useEffect(() => {
    reset(toDefaults(company));
  }, [company, open, reset]);

  function onSubmit(values: CompanyFormValues) {
    const input: CreateCompanyInput = {
      name: values.name,
      industry: values.industry,
      location: values.location,
      recruiterSpoc: values.recruiterSpoc,
      expectedPackageLpa: values.expectedPackageLpa,
      profileInfo: values.profileInfo,
    };

    const mutation = isEditing
      ? updateCompany.mutateAsync({ id: company.id, input })
      : createCompany.mutateAsync(input);

    mutation
      .then(() => {
        show(isEditing ? "Company updated." : "Company added.", "success");
        onClose();
      })
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }

  const isPending = createCompany.isPending || updateCompany.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit company" : "Add company"}
      subtitle={isEditing ? "Update this recruiter's directory entry." : "Recruiter joins the directory for this cycle."}
      widthClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Company name" error={errors.name?.message} className="sm:col-span-2">
            <Input placeholder="e.g. Nference" className={errors.name ? "border-admin-danger" : undefined} {...register("name")} />
          </FormField>

          <FormField label="Industry" error={errors.industry?.message}>
            <Select {...register("industry")}>
              <option value="">Not set</option>
              {COMPANY_INDUSTRIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Location" error={errors.location?.message}>
            <Input placeholder="e.g. Chennai" {...register("location", textFieldOptions)} />
          </FormField>

          <FormField label="Recruiter SPOC" error={errors.recruiterSpoc?.message}>
            <Input placeholder="Contact name" {...register("recruiterSpoc", textFieldOptions)} />
          </FormField>

          <FormField label="Expected average package (LPA)" error={errors.expectedPackageLpa?.message}>
            <Input type="number" step="0.1" placeholder="e.g. 6.5" {...register("expectedPackageLpa", numberFieldOptions)} />
          </FormField>

          <FormField label="Profile info" error={errors.profileInfo?.message} className="sm:col-span-2">
            <Textarea rows={3} placeholder="Short description of the company" {...register("profileInfo", textFieldOptions)} />
          </FormField>
        </div>

        <div className="mt-2 flex justify-end gap-2 border-t border-admin-divider pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Add company"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

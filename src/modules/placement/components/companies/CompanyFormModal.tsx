"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useCreateCompany, useUpdateCompany } from "../../hooks/useCompanyMutations";
import { companyFormSchema, type CompanyFormValues } from "../../schemas/company-form.schema";
import { COMPANY_INDUSTRIES, type Company, type CreateCompanyInput } from "../../types";

interface CompanyFormModalProps {
  open: boolean;
  company: Company | null;
  onClose: () => void;
}

function toDefaults(company: Company | null): CompanyFormValues {
  return {
    name: company?.name ?? "",
    industry: (company?.industry as CompanyFormValues["industry"]) ?? COMPANY_INDUSTRIES[0],
    location: company?.location ?? "",
    recruiterSpoc: company?.recruiterSpoc ?? "",
    expectedPackageLpa: company?.expectedPackageLpa ?? undefined,
    profileInfo: company?.profileInfo ?? "",
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

    const mutation = isEditing ? updateCompany.mutateAsync({ id: company.id, input }) : createCompany.mutateAsync(input);

    mutation
      .then(() => {
        show(isEditing ? "Company updated." : "Company added.", "success");
        onClose();
      })
      .catch((err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong.", "error"));
  }

  const isPending = createCompany.isPending || updateCompany.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit company" : "Add company"}
      subtitle={isEditing ? "Update this recruiter's directory entry." : "Recruiter joins the directory for this cycle."}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">
            Company name <span className="text-danger-fg">*</span>
          </label>
          <Input placeholder="e.g. Nference" className={errors.name ? "border-danger-border" : undefined} {...register("name")} />
          {errors.name && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.name.message}</p>}
        </div>

        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Industry</label>
          <Select className={errors.industry ? "border-danger-border" : undefined} {...register("industry")}>
            {COMPANY_INDUSTRIES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
        </div>

        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Location</label>
          <Input placeholder="e.g. Chennai" className={errors.location ? "border-danger-border" : undefined} {...register("location")} />
        </div>

        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Recruiter SPOC</label>
          <Input placeholder="Contact name" className={errors.recruiterSpoc ? "border-danger-border" : undefined} {...register("recruiterSpoc")} />
        </div>

        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Expected average package in LPA</label>
          <Input
            type="number"
            step="0.1"
            placeholder="e.g. 6.5"
            className={errors.expectedPackageLpa ? "border-danger-border" : undefined}
            {...register("expectedPackageLpa", { valueAsNumber: true })}
          />
          {errors.expectedPackageLpa && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.expectedPackageLpa.message}</p>}
        </div>

        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Profile info</label>
          <Textarea rows={3} placeholder="Short description of the company" className={errors.profileInfo ? "border-danger-border" : undefined} {...register("profileInfo")} />
        </div>

        <div className="mt-1 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primarySmall" disabled={isPending}>
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Add company"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

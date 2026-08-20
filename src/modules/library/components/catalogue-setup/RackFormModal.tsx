"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Button, FormField, Input, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { numberFieldOptions, textFieldOptions } from "@/lib/utils/rhf-helpers";
import { useCreateRack, useUpdateRack, type Rack } from "@/modules/library/api/racks";
import { rackFormSchema, type RackFormValues } from "@/modules/library/schemas/rack-form.schema";

interface RackFormModalProps {
  open: boolean;
  rack: Rack | null;
  onClose: () => void;
}

export function RackFormModal({ open, rack, onClose }: RackFormModalProps) {
  const { show } = useToast();
  const createRack = useCreateRack();
  const updateRack = useUpdateRack();
  const isEditing = rack !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RackFormValues>({
    resolver: zodResolver(rackFormSchema),
    defaultValues: {
      rack_code: rack?.rack_code ?? "",
      shelves: rack?.shelves ?? undefined,
      subject_range: rack?.subject_range ?? undefined,
    },
  });

  useEffect(() => {
    reset({
      rack_code: rack?.rack_code ?? "",
      shelves: rack?.shelves ?? undefined,
      subject_range: rack?.subject_range ?? undefined,
    });
  }, [rack, open, reset]);

  function onSubmit(values: RackFormValues) {
    const mutation = isEditing ? updateRack.mutateAsync({ id: rack.id, input: values }) : createRack.mutateAsync(values);

    mutation
      .then(() => {
        show(isEditing ? "Rack updated." : "Rack added.", "success");
        onClose();
      })
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }

  const isPending = createRack.isPending || updateRack.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit rack" : "Add rack"}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Rack code" error={errors.rack_code?.message}>
          <Input className={errors.rack_code ? "border-admin-danger" : undefined} {...register("rack_code")} />
        </FormField>
        <FormField label="Shelves" error={errors.shelves?.message}>
          <Input type="number" {...register("shelves", numberFieldOptions)} />
        </FormField>
        <FormField label="Subject range" hint="e.g. Mathematics, humanities" error={errors.subject_range?.message}>
          <Input {...register("subject_range", textFieldOptions)} />
        </FormField>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Add rack"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

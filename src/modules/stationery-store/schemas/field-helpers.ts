import { z } from "zod";

// Assumes the field is registered with textFieldOptions/numberFieldOptions
// (@/lib/utils/rhf-helpers.ts), which convert "" -> undefined at the RHF
// layer — same convention as modules/library/schemas/field-helpers.ts.
export function optionalText(max: number) {
  return z.string().trim().max(max).optional();
}

interface OptionalNumberOptions {
  int?: boolean;
  min?: number;
  max?: number;
}

export function optionalNumber({ int, min, max }: OptionalNumberOptions = {}) {
  let schema = int ? z.number().int() : z.number();
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);
  return schema.optional();
}

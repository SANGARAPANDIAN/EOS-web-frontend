import { z } from "zod";

// Assumes the field is registered with textFieldOptions (see
// @/lib/utils/rhf-helpers.ts), which converts "" -> undefined at the RHF
// layer, keeping this schema's input/output types identical (no transform).
export function optionalText(max: number) {
  return z.string().trim().max(max).optional();
}

interface OptionalNumberOptions {
  int?: boolean;
  min?: number;
  max?: number;
}

// Assumes the field is registered with numberFieldOptions (see @/lib/utils/rhf-helpers.ts).
export function optionalNumber({ int, min, max }: OptionalNumberOptions = {}) {
  let schema = int ? z.number().int() : z.number();
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);
  return schema.optional();
}

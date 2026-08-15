// A blank input arrives at RHF as "" — converting that to undefined at
// registration time (rather than via a zod preprocess/transform step) means
// an optional field's zod schema can stay a plain `.optional()` with no
// preprocess/transform, keeping its input and output types identical. That
// in turn is what lets zodResolver's inferred type match useForm's generic
// without the "optional key vs required-but-possibly-undefined" split that
// a schema-level transform runs into.
export const numberFieldOptions = {
  setValueAs: (value: string) => (value === "" ? undefined : Number(value)),
};

export const textFieldOptions = {
  setValueAs: (value: string) => (value === "" ? undefined : value),
};

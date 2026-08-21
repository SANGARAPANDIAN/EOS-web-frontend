// Ported verbatim from EOSfrontendweb's
// src/modules/fees/components/fee-payments-crud/receipt-utils.ts — pure
// amount-in-words logic, no adaptation needed.

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitsToWords(value: number): string {
  if (value < 20) return ONES[value];
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${TENS[tens]}${ones ? ` ${ONES[ones]}` : ""}`;
}

function threeDigitsToWords(value: number): string {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const hundredsPart = hundreds ? `${ONES[hundreds]} Hundred${rest ? " " : ""}` : "";
  return `${hundredsPart}${rest ? twoDigitsToWords(rest) : ""}`;
}

// Indian numbering (Crore/Lakh/Thousand) — standard for INR amount-in-words on
// receipts. Whole rupees only; paise are not part of this receipt's amounts.
export function amountToWords(amount: number): string {
  const value = Math.round(Math.abs(amount));
  if (value === 0) return "Zero";

  const crore = Math.floor(value / 1_00_00_000);
  const lakh = Math.floor((value % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((value % 1_00_000) / 1_000);
  const hundred = value % 1_000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  return parts.join(" ");
}

export function formatAmountInWords(amount: number): string {
  return `${amountToWords(amount)} Rupees only`;
}

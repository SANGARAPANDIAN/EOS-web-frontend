"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";
import { Modal, Button } from "@/modules/admin/components/ui";
import { ApiError } from "@/types/api";
import { sendFacultyVerification, checkFacultyVerification, type OtpChannel } from "@/modules/admin/api/facultyVerification";

interface OtpVerifyDialogProps {
  open: boolean;
  fieldLabel: string;
  channel: OtpChannel;
  phoneNumber: string;
  onVerified: () => void;
  onClose: () => void;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Real Twilio Verify integration — the backend owns OTP generation, expiry,
 * and attempt-counting entirely. This component only ever renders the
 * digit-entry UI and reports send/check results; it never generates or
 * stores a code itself.
 */
export function OtpVerifyDialog({ open, fieldLabel, channel, phoneNumber, onVerified, onClose }: OtpVerifyDialogProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(6).fill(""));
  const [codeError, setCodeError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendMutation = useMutation({
    mutationFn: () => sendFacultyVerification(phoneNumber, channel),
    onSuccess: () => inputRefs.current[0]?.focus(),
  });

  const checkMutation = useMutation({
    mutationFn: (code: string) => checkFacultyVerification(phoneNumber, code),
    onSuccess: (result) => {
      if (result.valid) onVerified();
      else setCodeError("Incorrect code. Try again.");
    },
  });

  // Resets to a clean slate every time the dialog transitions closed -> open.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDigits(Array(6).fill(""));
    setCodeError(null);
    sendMutation.reset();
    checkMutation.reset();
  }

  useEffect(() => {
    if (open) sendMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setCodeError(null);
    checkMutation.reset();
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleVerify() {
    const entered = digits.join("");
    if (entered.length < 6) {
      setCodeError("Enter all 6 digits.");
      return;
    }
    setCodeError(null);
    checkMutation.mutate(entered);
  }

  function handleResend() {
    setDigits(Array(6).fill(""));
    setCodeError(null);
    checkMutation.reset();
    sendMutation.mutate();
  }

  const isSending = sendMutation.isPending;
  const isVerifying = checkMutation.isPending;
  const sendFailed = sendMutation.isError;

  const checkNetworkError = checkMutation.isError
    ? errorMessage(checkMutation.error, "Couldn't verify that code. Check your connection and try again.")
    : null;
  const inlineError = codeError ?? checkNetworkError;

  return (
    <Modal open={open} onClose={onClose} title={`Verify ${fieldLabel}`} widthClassName="max-w-sm">
      <div className="flex flex-col items-center gap-4 py-1 text-center">
        <span className="grid size-14 place-items-center rounded-admin-pill bg-admin-tint-strong text-admin-primary">
          <Icon name="verified_user" size={24} />
        </span>

        {isSending ? (
          <p className="text-sm text-admin-body">
            Sending a code to <span className="font-semibold text-admin-ink">{phoneNumber}</span> via{" "}
            {channel === "whatsapp" ? "WhatsApp" : "SMS"}…
          </p>
        ) : (
          <p className="text-sm text-admin-body">
            We sent a verification code to <span className="font-semibold text-admin-ink">{phoneNumber}</span> via{" "}
            {channel === "whatsapp" ? "WhatsApp" : "SMS"}.
          </p>
        )}

        {sendFailed && (
          <div className="w-full rounded-admin-lg border border-admin-danger-border bg-admin-danger-bg p-3 text-left text-xs text-admin-danger-fg">
            {errorMessage(sendMutation.error, "Couldn't reach the verification service. Check your connection and try again.")}
          </div>
        )}

        <div className="flex gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              disabled={isSending || isVerifying || sendFailed}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`h-12 w-10 rounded-admin-control border text-center text-lg font-semibold text-admin-ink outline-none disabled:bg-admin-tint ${
                inlineError ? "border-admin-danger-border" : "border-admin-border focus:border-admin-primary"
              }`}
            />
          ))}
        </div>

        {inlineError && <p className="text-xs text-admin-danger-fg">{inlineError}</p>}

        <button type="button" onClick={handleResend} disabled={isSending} className="text-xs font-semibold text-admin-primary hover:text-admin-primary-dark disabled:text-admin-subtle">
          {sendFailed ? "Try sending again" : "Didn't receive a code? Resend"}
        </button>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="primary" onClick={handleVerify} disabled={isSending || sendFailed || isVerifying}>
          {isVerifying ? "Verifying…" : "Verify & authenticate"}
        </Button>
      </div>
    </Modal>
  );
}

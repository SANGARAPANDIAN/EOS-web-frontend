"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button, Input, Modal, useToast } from "@/modules/admin/components/ui";
import { ApiError } from "@/types/api";
import { friendlyError } from "@/lib/utils/errors";
import { useResetStaffAccountPassword } from "@/modules/admin/api/staffAccounts";

/**
 * Same one-time-reveal + step-up-confirmation pattern as the Student
 * ResetPasswordModal — the calling admin re-enters their own password
 * (checked server-side) before a new temporary password is generated and
 * shown exactly once.
 */
export function StaffAccountResetPasswordModal({
  accountId,
  accountEmail,
  open,
  onClose,
}: {
  accountId: number;
  accountEmail: string;
  open: boolean;
  onClose: () => void;
}) {
  const { show } = useToast();
  const resetPassword = useResetStaffAccountPassword();
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleClose() {
    onClose();
    setAdminPassword("");
    setAdminPasswordError(null);
    setResult(null);
    setCopied(false);
  }

  function handleSubmit() {
    if (!adminPassword) {
      setAdminPasswordError("Re-enter your password to confirm.");
      return;
    }
    setAdminPasswordError(null);
    resetPassword.mutate(
      { id: accountId, adminPassword },
      {
        onSuccess: ({ temporary_password }) => setResult(temporary_password),
        onError: (err: unknown) => {
          if (err instanceof ApiError && err.errorCode === "ADMIN_PASSWORD_INCORRECT") {
            setAdminPasswordError("That's not your current password.");
            return;
          }
          show(friendlyError(err), "error");
        },
      },
    );
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      show("Couldn't copy — select and copy the password manually.", "error");
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Reset password" widthClassName="max-w-md">
      {result ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-admin-body">
            New password for <strong>{accountEmail}</strong>. Copy it now and hand it over directly — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2 rounded-admin-md border border-admin-warning-border bg-admin-warning-bg px-3 py-2.5">
            <Icon name="lock" size={17} className="shrink-0 text-admin-warning-fg" />
            <code className="flex-1 select-all break-all font-mono text-sm text-admin-warning-fg">{result}</code>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy to clipboard"
              className="shrink-0 rounded-admin-sm p-1.5 text-admin-warning-fg hover:bg-admin-tint-strong"
            >
              <Icon name={copied ? "check" : "content_copy"} size={17} />
            </button>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-admin-body">
            Generates a new temporary password for <strong>{accountEmail}</strong>. The old one stops working immediately.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-admin-body">Confirm your password</label>
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                setAdminPasswordError(null);
              }}
              placeholder="Your own login password"
              className={adminPasswordError ? "border-admin-danger" : undefined}
              autoComplete="current-password"
            />
            {adminPasswordError ? (
              <p className="text-xs text-admin-danger">{adminPasswordError}</p>
            ) : (
              <p className="text-xs text-admin-subtle">Required to confirm it&apos;s really you making this change.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-admin-divider pt-4">
            <Button variant="secondary" onClick={handleClose} disabled={resetPassword.isPending}>
              Cancel
            </Button>
            <Button variant="primary" disabled={resetPassword.isPending} onClick={handleSubmit}>
              {resetPassword.isPending ? "Resetting…" : "Reset password"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

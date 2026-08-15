"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button, Input, Modal, useToast } from "@/modules/admin/components/ui";
import { ApiError } from "@/types/api";
import { friendlyError } from "@/lib/utils/errors";
import { useResetStudentPassword } from "@/modules/admin/api/students";

/**
 * There's still no email/SMS delivery to a student (see the admission
 * wizard's own notice) — so a reset, like admission itself, ends with the
 * admin reading a plaintext password off the screen and handing it over
 * directly. The result is shown exactly once: password_hash is one-way, so
 * this response is the only place the plaintext will ever exist again.
 */
export function ResetPasswordModal({
  studentId,
  studentName,
  open,
  onClose,
}: {
  studentId: number;
  studentName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { show } = useToast();
  const resetPassword = useResetStudentPassword();
  const [mode, setMode] = useState<"generate" | "custom">("generate");
  const [customPassword, setCustomPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleClose() {
    onClose();
    // Reset after the close animation would run, if this Modal had one —
    // there isn't one, so this is safe to do immediately.
    setMode("generate");
    setCustomPassword("");
    setAdminPassword("");
    setError(null);
    setAdminPasswordError(null);
    setResult(null);
    setCopied(false);
  }

  async function handleSubmit() {
    let hasError = false;
    if (!adminPassword) {
      setAdminPasswordError("Re-enter your password to confirm.");
      hasError = true;
    }
    if (mode === "custom") {
      if (customPassword.length < 6) {
        setError("At least 6 characters.");
        hasError = true;
      } else if (customPassword.length > 72) {
        setError("72 characters or fewer.");
        hasError = true;
      }
    }
    if (hasError) return;
    setError(null);
    setAdminPasswordError(null);
    try {
      const { password } = await resetPassword.mutateAsync({
        id: studentId,
        adminPassword,
        password: mode === "custom" ? customPassword : undefined,
      });
      setResult(password);
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === "ADMIN_PASSWORD_INCORRECT") {
        setAdminPasswordError("That's not your current password.");
        return;
      }
      show(friendlyError(err), "error");
    }
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
            New password for <strong>{studentName}</strong>. Copy it now and hand it to the student directly — it won&apos;t be shown
            again.
          </p>
          <div className="flex items-center gap-2 rounded-admin-md border border-admin-warning-border bg-admin-warning-bg px-3 py-2.5">
            <Icon name="lock" size={17} className="shrink-0 text-admin-warning-fg" />
            <code className="flex-1 select-all break-all font-mono text-sm text-admin-warning-fg">{result}</code>
            <button type="button" onClick={handleCopy} title="Copy to clipboard" className="shrink-0 rounded-admin-sm p-1.5 text-admin-warning-fg hover:bg-admin-tint-strong">
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
            Sets a new password for <strong>{studentName}</strong>&apos;s login. There&apos;s no email/SMS delivery yet, so whatever
            password results here has to be handed to the student directly.
          </p>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-admin-body">
              <input
                type="radio"
                checked={mode === "generate"}
                onChange={() => setMode("generate")}
                className="h-4 w-4 border-admin-border-input text-admin-primary accent-admin-primary focus:ring-2 focus:ring-admin-border-hover"
              />
              Generate a random password
            </label>
            <label className="flex items-center gap-2 text-sm text-admin-body">
              <input
                type="radio"
                checked={mode === "custom"}
                onChange={() => setMode("custom")}
                className="h-4 w-4 border-admin-border-input text-admin-primary accent-admin-primary focus:ring-2 focus:ring-admin-border-hover"
              />
              Set a specific password
            </label>
            {mode === "custom" && (
              <div className="mt-1 ml-6">
                <Input
                  type="text"
                  value={customPassword}
                  onChange={(e) => {
                    setCustomPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Minimum 6 characters"
                  maxLength={72}
                  className={error ? "border-admin-danger" : undefined}
                  autoComplete="new-password"
                />
                {error && <p className="mt-1 text-xs text-admin-danger">{error}</p>}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 border-t border-admin-divider pt-4">
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

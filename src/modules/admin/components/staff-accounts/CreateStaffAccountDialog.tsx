"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button, Input, Modal, Select, useToast } from "@/modules/admin/components/ui";
import { ApiError } from "@/types/api";
import { friendlyError } from "@/lib/utils/errors";
import { useDepartments } from "@/modules/shared/api/departments";
import {
  useCreateStaffAccount,
  useProvisionableRoles,
  type CreateStaffAccountResponse,
} from "@/modules/admin/api/staffAccounts";

const SECRETARY_ROLE_NAME = "secretary";

function roleLabel(name: string, description: string | null): string {
  if (description) return description;
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function CreateStaffAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { show } = useToast();
  const { data: roles = [] } = useProvisionableRoles();
  const { data: departments = [] } = useDepartments();
  const createAccount = useCreateStaffAccount();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleName, setRoleName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateStaffAccountResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const isSecretary = roleName === SECRETARY_ROLE_NAME;

  function reset() {
    setEmail("");
    setPhone("");
    setRoleName("");
    setFirstName("");
    setLastName("");
    setDepartmentId("");
    setError(null);
    setCreated(null);
    setCopied(false);
  }

  function handleClose() {
    onClose();
    reset();
  }

  function handleCreate() {
    setError(null);
    if (!email.trim()) return setError("Email is required.");
    if (!roleName) return setError("Choose a role.");
    if (isSecretary && !firstName.trim()) return setError("Name is required for a Secretary account.");
    if (isSecretary && !departmentId) return setError("Choose a department for this Secretary account.");

    createAccount.mutate(
      {
        email: email.trim(),
        phone: phone.trim() || undefined,
        role_name: roleName,
        first_name: isSecretary ? firstName.trim() : undefined,
        last_name: isSecretary ? lastName.trim() || undefined : undefined,
        department_id: isSecretary ? Number(departmentId) : undefined,
      },
      {
        onSuccess: (account) => setCreated(account),
        onError: (err: unknown) => setError(err instanceof ApiError ? err.message : friendlyError(err)),
      },
    );
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.temporary_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      show("Couldn't copy — select and copy the password manually.", "error");
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={created ? "Account created" : "Add staff account"} widthClassName="max-w-lg">
      {created ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-admin-body">
            Login for <strong>{created.email}</strong> is ready. Copy the temporary password now and hand it to them directly — it
            won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2 rounded-admin-md border border-admin-warning-border bg-admin-warning-bg px-3 py-2.5">
            <Icon name="lock" size={17} className="shrink-0 text-admin-warning-fg" />
            <code className="flex-1 select-all break-all font-mono text-sm text-admin-warning-fg">
              {created.temporary_password}
            </code>
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
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-admin-body">Role *</label>
            <Select value={roleName} onChange={(e) => setRoleName(e.target.value)}>
              <option value="">Choose a role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {roleLabel(r.name, r.description)}
                </option>
              ))}
            </Select>
          </div>

          {isSecretary && (
            <>
              <div className="flex gap-2.5">
                <div className="flex-1">
                  <label className="mb-1 block text-[12.5px] font-semibold text-admin-body">First name *</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[12.5px] font-semibold text-admin-body">Last name</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[12.5px] font-semibold text-admin-body">Department *</label>
                <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  <option value="">Choose a department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-admin-body">Email *</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@sece.ac.in" />
            <p className="mt-1 text-[11px] text-admin-subtle">This becomes the login. A temporary password is generated automatically.</p>
          </div>

          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-admin-body">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
          </div>

          {error && <p className="text-[11.5px] text-admin-danger">{error}</p>}

          <div className="flex justify-end gap-2.5 border-t border-admin-divider pt-4">
            <Button variant="secondary" onClick={handleClose} disabled={createAccount.isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={createAccount.isPending}>
              {createAccount.isPending ? "Creating…" : "Create account"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

"use client";

import { useState } from "react";
import {
  Button,
  FormField,
  Input,
  Modal,
  Select,
  SegmentedPillToggle,
  Typeahead,
  useToast,
} from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import {
  useCreateParentAccount,
  useLinkParentAccount,
  useSearchParents,
  type ParentRelationship,
  type ParentSearchResult,
} from "@/modules/admin/api/parentAccounts";

const RELATIONSHIP_OPTIONS: { value: ParentRelationship; label: string }[] = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "guardian", label: "Guardian" },
];

interface AddParentDialogProps {
  open: boolean;
  onClose: () => void;
  studentId: number;
}

export function AddParentDialog({ open, onClose, studentId }: AddParentDialogProps) {
  const [mode, setMode] = useState<"create" | "link">("create");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState<ParentRelationship>("father");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParent, setSelectedParent] = useState<ParentSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; temporary_password: string } | null>(null);

  const createParent = useCreateParentAccount();
  const linkParent = useLinkParentAccount();
  const search = useSearchParents(searchTerm);
  const { show } = useToast();

  function reset() {
    setMode("create");
    setEmail("");
    setPhone("");
    setRelationship("father");
    setSearchTerm("");
    setSelectedParent(null);
    setError(null);
    setCreatedCredentials(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleCreate() {
    setError(null);
    if (!email.trim()) return setError("Email is required.");

    createParent.mutate(
      { studentId, input: { email: email.trim(), phone: phone.trim() || undefined, relationship } },
      {
        onSuccess: (result) => setCreatedCredentials({ email: result.email, temporary_password: result.temporary_password }),
        onError: (err) => setError(friendlyError(err)),
      },
    );
  }

  function handleLink() {
    setError(null);
    if (!selectedParent) return setError("Search for and select the parent account to link.");

    linkParent.mutate(
      { studentId, parent_user_id: selectedParent.id, relationship },
      {
        onSuccess: () => {
          show("Parent linked", "success");
          handleClose();
        },
        onError: (err) => setError(friendlyError(err)),
      },
    );
  }

  if (createdCredentials) {
    return (
      <Modal open={open} onClose={handleClose} title="Parent account created">
        <p className="text-sm text-admin-body">
          Share these credentials with the parent — the temporary password is shown only once and cannot be retrieved again.
        </p>
        <div className="mt-4 rounded-admin-md border border-admin-border bg-admin-tint px-4 py-3">
          <div className="text-[13px] text-admin-muted">Email</div>
          <div className="font-mono text-sm font-semibold text-admin-ink">{createdCredentials.email}</div>
          <div className="mt-3 text-[13px] text-admin-muted">Temporary password</div>
          <div className="font-mono text-sm font-semibold text-admin-ink">{createdCredentials.temporary_password}</div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={handleClose}>Done</Button>
        </div>
      </Modal>
    );
  }

  const pending = createParent.isPending || linkParent.isPending;

  return (
    <Modal open={open} onClose={handleClose} title="Add parent" subtitle="Create a new parent login, or link one that already exists (e.g. a sibling's parent).">
      <SegmentedPillToggle
        options={[
          { value: "create", label: "Create new" },
          { value: "link", label: "Link existing" },
        ]}
        value={mode}
        onChange={setMode}
        className="mb-4"
      />

      {mode === "create" ? (
        <div className="flex flex-col gap-4">
          <FormField label="Email *">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="parent@example.com" />
          </FormField>
          <FormField label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
          </FormField>
          <FormField label="Relationship">
            <Select value={relationship} onChange={(e) => setRelationship(e.target.value as ParentRelationship)}>
              {RELATIONSHIP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <FormField label="Search by email, roll number, or a sibling's name">
            <Typeahead<ParentSearchResult>
              value={selectedParent ? selectedParent.email : searchTerm}
              onChange={(v) => {
                setSelectedParent(null);
                setSearchTerm(v);
              }}
              results={search.data ?? []}
              isLoading={search.isFetching}
              getKey={(item) => item.id}
              onSelect={(item) => {
                setSelectedParent(item);
                setSearchTerm(item.email);
              }}
              placeholder="Type to search…"
              renderResult={(item) => (
                <>
                  <span className="text-sm font-semibold text-admin-ink">{item.email}</span>
                  <span className="text-[12.5px] text-admin-muted">
                    {item.children.length > 0
                      ? item.children.map((c) => `${c.name ?? c.student_id_no} (${c.relationship})`).join(", ")
                      : "No children linked yet"}
                  </span>
                </>
              )}
            />
          </FormField>
          <FormField label="Relationship to this student">
            <Select value={relationship} onChange={(e) => setRelationship(e.target.value as ParentRelationship)}>
              {RELATIONSHIP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      )}

      {error && <p className="mt-3 text-[13px] text-admin-danger">{error}</p>}

      <div className="mt-5 flex justify-end gap-2.5 border-t border-admin-divider pt-4">
        <Button variant="secondary" onClick={handleClose} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={mode === "create" ? handleCreate : handleLink} disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create account" : "Link parent"}
        </Button>
      </div>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { Button, FormField, Input, Modal, Textarea } from "@/modules/admin/components/ui";

export interface NotifyModalInput {
  title: string;
  message: string;
}

interface NotifyModalProps {
  open: boolean;
  onClose: () => void;
  /** Shown in the subtitle — "Delivered straight to {recipientName}'s notification inbox". */
  recipientName: string;
  onSend: (input: NotifyModalInput) => Promise<void>;
  isSending: boolean;
}

/**
 * Shared "send an ad-hoc notification" modal — same title/message form
 * regardless of whether the recipient is a faculty member, a student, or
 * any future entity with its own POST /:entity/:id/notify endpoint. Each
 * caller owns its own mutation (useNotifyFaculty/useNotifyStudent/...) and
 * just passes it in as onSend, so this component has no knowledge of which
 * entity it's notifying — the one thing that WOULD otherwise be
 * copy-pasted per page (the form fields, validation, submit state) lives
 * here once.
 */
export function NotifyModal({ open, onClose, recipientName, onSend, isSending }: NotifyModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  function handleClose() {
    setTitle("");
    setMessage("");
    onClose();
  }

  async function handleSend() {
    if (!title.trim() || !message.trim()) return;
    await onSend({ title: title.trim(), message: message.trim() });
    setTitle("");
    setMessage("");
  }

  return (
    <Modal open={open} onClose={handleClose} title="Send notification" subtitle={`Delivered straight to ${recipientName}'s notification inbox`} widthClassName="max-w-md">
      <div className="flex flex-col gap-4 p-5">
        <FormField label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Submit your leave balance report" maxLength={150} />
        </FormField>
        <FormField label="Message">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write the message this person will see…" rows={4} maxLength={1000} />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSend} disabled={!title.trim() || !message.trim() || isSending}>
            {isSending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

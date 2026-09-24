"use client";

import { useMemo, useState } from "react";
import { Button, Modal, Typeahead, useToast } from "@/modules/admin/components/ui";
import { ApiError } from "@/types/api";
import { friendlyError } from "@/lib/utils/errors";
import { useVendors, type Vendor } from "@/modules/admin/api/vendors";
import { useAssignProposalVendor, type ProposalKind, type ProposalView } from "@/modules/admin/api/procurement";

export function AssignVendorDialog({
  open,
  onClose,
  proposal,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  proposal: ProposalView;
  kind: ProposalKind;
}) {
  const { show } = useToast();
  const { data: vendors = [] } = useVendors();
  const assignVendor = useAssignProposalVendor(kind);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors.slice(0, 20);
    return vendors.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 20);
  }, [vendors, query]);

  function handleConfirm() {
    if (!selected) return setError("Choose a vendor first.");
    setError(null);
    assignVendor.mutate(
      { id: proposal.id, vendor_id: selected.id },
      {
        onSuccess: () => {
          show(`${selected.name} assigned to ${proposal.reference}.`, "success");
          onClose();
        },
        onError: (err: unknown) => setError(err instanceof ApiError ? err.message : friendlyError(err)),
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign vendor" widthClassName="max-w-lg">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-admin-body">
          Assigning a vendor to <strong>{proposal.reference}</strong> — {proposal.title}
        </p>
        <Typeahead
          value={selected ? selected.name : query}
          onChange={(v) => {
            setSelected(null);
            setQuery(v);
          }}
          results={results}
          getKey={(v) => v.id}
          renderResult={(v) => (
            <>
              <span className="font-semibold text-admin-ink">{v.name}</span>
              {v.gst_no && <span className="text-xs text-admin-muted">GST {v.gst_no}</span>}
            </>
          )}
          onSelect={(v) => {
            setSelected(v);
            setQuery(v.name);
          }}
          placeholder="Search vendors by name…"
        />
        {error && <p className="text-[11.5px] text-admin-danger">{error}</p>}
        <div className="flex justify-end gap-2.5 border-t border-admin-divider pt-4">
          <Button variant="secondary" onClick={onClose} disabled={assignVendor.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={assignVendor.isPending}>
            {assignVendor.isPending ? "Assigning…" : "Assign vendor"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

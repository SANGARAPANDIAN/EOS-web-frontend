"use client";

import { Modal, Badge } from "@/modules/admin/components/ui";
import { useStudentNoDues } from "@/modules/library/api/studentLookup";
import { formatCurrency, formatDate } from "@/modules/library/lib/borrow-record-format";
import type { LibraryMember } from "@/modules/library/api/members";

interface MemberNoDuesModalProps {
  member: LibraryMember | null;
  onClose: () => void;
}

export function MemberNoDuesModal({ member, onClose }: MemberNoDuesModalProps) {
  const { data, isLoading } = useStudentNoDues(member?.id);

  return (
    <Modal open={member !== null} onClose={onClose} title={member?.name ?? ""} widthClassName="max-w-lg">
      {isLoading && <p className="text-sm text-admin-muted">Checking library standing…</p>}
      {data && (
        <div className="flex flex-col gap-4">
          <div>
            <Badge tone={data.has_outstanding_library_dues ? "warning" : "success"}>
              {data.has_outstanding_library_dues ? "Has outstanding dues" : "Clear"}
            </Badge>
          </div>

          {data.overdue_books.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-bold tracking-wide text-admin-subtle uppercase">Overdue books</p>
              <ul className="flex flex-col gap-1 text-sm text-admin-body">
                {data.overdue_books.map((b) => (
                  <li key={b.borrow_record_id}>
                    {b.title} ({b.accession}) — due {formatDate(b.due_date)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.unpaid_fine_records.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-bold tracking-wide text-admin-subtle uppercase">Unpaid fines</p>
              <ul className="flex flex-col gap-1 text-sm text-admin-body">
                {data.unpaid_fine_records.map((r) => (
                  <li key={r.borrow_record_id}>
                    {r.title} ({r.accession})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.unsettled_lost_damaged_charges.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-bold tracking-wide text-admin-subtle uppercase">
                Unsettled lost / damaged charges
              </p>
              <ul className="flex flex-col gap-1 text-sm text-admin-body">
                {data.unsettled_lost_damaged_charges.map((c) => (
                  <li key={c.borrow_record_id}>
                    {c.title} ({c.accession}) — {formatCurrency(c.charge_amount)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!data.has_outstanding_library_dues && (
            <p className="text-sm text-admin-muted">No overdue books, unpaid fines, or unsettled charges.</p>
          )}
        </div>
      )}
    </Modal>
  );
}

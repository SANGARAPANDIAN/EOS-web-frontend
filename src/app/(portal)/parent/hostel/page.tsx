"use client";

import { Card, Badge, EmptyState, Icon, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildHostelRoom, useChildHostelOutings } from "@/modules/parent/api/hostel";
import type { HostelOuting } from "@/modules/parent/api/hostel";
import { formatDisplayDate } from "@/lib/utils/date";

const STATUS_LABEL: Record<string, string> = { pending: "Pending", approved: "Approved", warden_approved: "Approved", rejected: "Rejected" };

export default function ParentHostelPage() {
  const { selectedChildId } = useSelectedChild();
  const room = useChildHostelRoom(selectedChildId);
  const outings = useChildHostelOutings(selectedChildId);

  const columns: DataTableColumn<HostelOuting>[] = [
    { key: "from", header: "From", width: "1fr", render: (r) => formatDisplayDate(r.from_date) },
    { key: "out", header: "Out", width: "0.8fr", render: (r) => r.start_time },
    { key: "to", header: "To", width: "1fr", render: (r) => formatDisplayDate(r.to_date) },
    { key: "in", header: "In", width: "0.8fr", render: (r) => r.return_time ?? "—" },
    { key: "reason", header: "Reason", width: "1.5fr", render: (r) => r.reason ?? "—" },
    { key: "approver", header: "Approved by", width: "1.3fr", render: (r) => r.approved_by_warden ?? "—" },
    {
      key: "status",
      header: "Status",
      width: "1fr",
      render: (r) => <Badge tone={r.status === "rejected" ? "accentDark" : "accent"}>{STATUS_LABEL[r.status]}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Hostel</h1>
        <ChildSwitcher />
      </div>

      {room.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : !room.data?.is_hostel_resident ? (
        <Card>
          <EmptyState message="Not currently assigned a hostel room." />
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center gap-4">
              <div className="flex size-11 items-center justify-center rounded-[10px] bg-icon-chip">
                <Icon name="apartment" size={22} className="text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold text-ink">
                  {room.data.hostel_name}
                  {room.data.block_name && ` · ${room.data.block_name}`}
                  {room.data.floor_name && ` · ${room.data.floor_name}`} · Room {room.data.room_number}
                </div>
                <div className="text-[12.5px] text-muted">
                  {room.data.room_type_name} {room.data.mess_type && `· ${room.data.mess_type} mess`}
                </div>
              </div>
            </div>
          </Card>

          <h2 className="text-[15px] font-bold text-ink">Outing history</h2>
          {outings.isLoading ? (
            <Card>
              <EmptyState message="Loading…" />
            </Card>
          ) : (
            <DataTable columns={columns} data={outings.data?.data ?? []} rowKey={(r) => r.id} emptyMessage="No outing requests yet." />
          )}
        </>
      )}
    </div>
  );
}

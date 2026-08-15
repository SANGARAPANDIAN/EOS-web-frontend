"use client";

import { useState } from "react";
import { Button, Card, DataTable, EmptyState, ProgressBar, type DataTableColumn } from "@/components/ui";
import { useNightAttendance, useMarkAttendance, useResolveAllAttendance, type AttendanceException } from "@/modules/hostel-warden/api/night-attendance";
import { StudentDetailModal } from "@/modules/hostel-warden/components/StudentDetailModal";
import { formatLongDate } from "@/lib/utils/date";

export default function NightAttendancePage() {
  const attendance = useNightAttendance();
  const mark = useMarkAttendance();
  const resolveAll = useResolveAllAttendance();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const data = attendance.data;
  const marked = data ? data.present + data.absent : 0;
  const pct = data && data.total_residents > 0 ? Math.round((marked / data.total_residents) * 100) : 0;

  const columns: DataTableColumn<AttendanceException>[] = [
    {
      key: "name",
      header: "Student",
      width: "1.6fr",
      render: (row) => (
        <button type="button" onClick={() => setSelectedId(row.student_id)} className="font-bold text-ink hover:text-primary hover:underline">
          {row.name}
        </button>
      ),
    },
    { key: "roll", header: "Register no.", width: "1fr", render: (row) => <span className="font-mono text-body">{row.roll}</span> },
    { key: "room", header: "Room", width: "0.8fr", render: (row) => <span className="text-body">{row.room_number}</span> },
    {
      key: "action",
      header: "",
      width: "1.4fr",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => mark.mutate({ studentId: row.student_id, status: "absent" })}
            disabled={mark.isPending}
            className="rounded-[7px] border border-border-default px-2.5 py-1.5 text-[12.5px] font-bold text-body hover:bg-surface-tint"
          >
            Absent
          </button>
          <button
            type="button"
            onClick={() => mark.mutate({ studentId: row.student_id, status: "present" })}
            disabled={mark.isPending}
            className="rounded-[7px] bg-primary px-2.5 py-1.5 text-[12.5px] font-bold text-white hover:bg-primary-dark"
          >
            Present
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Night attendance</h1>
        <p className="mt-1 text-[13px] text-muted">{formatLongDate()} · manual roll call, once each night.</p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13.5px] font-bold text-ink">
              {marked} of {data?.total_residents ?? 0} marked
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted">{data?.pending ?? 0} still need resolving</div>
          </div>
          <Button variant="primarySmall" className="w-auto" onClick={() => resolveAll.mutate(undefined)} disabled={resolveAll.isPending || !data?.pending}>
            Resolve all as present
          </Button>
        </div>
        <ProgressBar percent={pct} height={7} className="mt-3" />
      </Card>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Present", value: data?.present ?? 0 },
          { label: "Absent", value: data?.absent ?? 0 },
          { label: "On leave", value: data?.on_leave ?? 0 },
          { label: "Pending", value: data?.pending ?? 0 },
        ].map((t) => (
          <div key={t.label} className="rounded-card border border-border-default bg-surface p-[18px_20px]">
            <div className="text-[13px] font-bold text-muted">{t.label}</div>
            <div className="mt-2 text-[30px] font-extrabold text-ink">{t.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 text-[17px] font-extrabold text-ink">Exceptions to resolve</h2>
        {attendance.isLoading ? (
          <EmptyState message="Loading…" />
        ) : (data?.exceptions.length ?? 0) === 0 ? (
          <EmptyState message="Everyone is accounted for." />
        ) : (
          <DataTable columns={columns} data={data!.exceptions} rowKey={(row) => row.student_id} emptyMessage="Everyone is accounted for." hoverableRows={false} />
        )}
      </Card>

      {selectedId != null && <StudentDetailModal studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

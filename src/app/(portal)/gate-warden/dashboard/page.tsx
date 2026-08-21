"use client";

import { useRef } from "react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { GateSearchPanel, type GateSearchPanelHandle } from "@/modules/gate-warden/components/GateSearchPanel";
import { usePendingExits, usePendingReturns } from "@/modules/gate-warden/api/gateLog";
import { formatDisplayDate, formatRelativeTime } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

export default function GateDeskPage() {
  const searchPanelRef = useRef<GateSearchPanelHandle>(null);
  const pendingExits = usePendingExits();
  const pendingReturns = usePendingReturns();

  function handleVerify(rollNo: string) {
    searchPanelRef.current?.search(rollNo);
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Gate desk</h1>
        <p className="mt-1 text-[13.5px] text-muted">Verify students at the gate and log who&apos;s actually going in or out.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GateSearchPanel ref={searchPanelRef} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-card border border-border-default bg-surface p-5">
            <div className="flex items-center gap-2.5">
              <h3 className="text-[15px] font-extrabold text-ink">Cleared, expected at the gate</h3>
              {pendingExits.data && <Badge tone="neutral">{pendingExits.data.length}</Badge>}
            </div>

            <div className="mt-3.5">
              {pendingExits.isLoading && <EmptyState loading />}
              {pendingExits.isError && (
                <p className="py-3 text-[13px] font-semibold text-danger-fg">
                  {pendingExits.error instanceof ApiError ? pendingExits.error.message : "Failed to load the queue."}
                </p>
              )}
              {!pendingExits.isLoading && !pendingExits.isError && pendingExits.data?.length === 0 && (
                <EmptyState message="No approved outings waiting to exit right now." />
              )}
              {!pendingExits.isLoading && !pendingExits.isError && (pendingExits.data?.length ?? 0) > 0 && (
                <div className="flex flex-col">
                  {pendingExits.data!.map((exit) => (
                    <div key={exit.outing_id} className="flex items-center justify-between gap-3 border-t border-divider py-3 first:border-0 first:pt-0">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-bold text-ink">{exit.student.name}</p>
                        <p className="truncate text-[12px] text-muted">
                          {exit.student.roll_no ? `Roll No. ${exit.student.roll_no}` : exit.student.student_id_no}
                          {exit.room_number ? ` · ${exit.room_number}` : ""}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-subtle">
                          {formatDisplayDate(exit.from_date)} · {exit.start_time}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        className="w-auto shrink-0 px-3 py-1.5 text-[12px]"
                        disabled={!exit.student.roll_no}
                        onClick={() => exit.student.roll_no && handleVerify(exit.student.roll_no)}
                      >
                        Verify
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-card border border-border-default bg-surface p-5">
            <div className="flex items-center gap-2.5">
              <h3 className="text-[15px] font-extrabold text-ink">Currently out, expected back</h3>
              {pendingReturns.data && <Badge tone="neutral">{pendingReturns.data.length}</Badge>}
            </div>

            <div className="mt-3.5">
              {pendingReturns.isLoading && <EmptyState loading />}
              {pendingReturns.isError && (
                <p className="py-3 text-[13px] font-semibold text-danger-fg">
                  {pendingReturns.error instanceof ApiError ? pendingReturns.error.message : "Failed to load the queue."}
                </p>
              )}
              {!pendingReturns.isLoading && !pendingReturns.isError && pendingReturns.data?.length === 0 && (
                <EmptyState message="No one is currently off campus." />
              )}
              {!pendingReturns.isLoading && !pendingReturns.isError && (pendingReturns.data?.length ?? 0) > 0 && (
                <div className="flex flex-col">
                  {pendingReturns.data!.map((ret) => (
                    <div
                      key={ret.student.id}
                      className="flex items-center justify-between gap-3 border-t border-divider py-3 first:border-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-bold text-ink">{ret.student.name}</p>
                        <p className="truncate text-[12px] text-muted">
                          {ret.student.roll_no ? `Roll No. ${ret.student.roll_no}` : ret.student.student_id_no}
                          {ret.room_number ? ` · ${ret.room_number}` : ""}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-subtle">
                          Out {formatRelativeTime(ret.checked_out_at)}
                          {ret.expected_return
                            ? ` · back by ${formatDisplayDate(ret.expected_return.to_date)}${
                                ret.expected_return.return_time ? ` · ${ret.expected_return.return_time}` : ""
                              }`
                            : ""}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        className="w-auto shrink-0 px-3 py-1.5 text-[12px]"
                        disabled={!ret.student.roll_no}
                        onClick={() => ret.student.roll_no && handleVerify(ret.student.roll_no)}
                      >
                        Verify
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

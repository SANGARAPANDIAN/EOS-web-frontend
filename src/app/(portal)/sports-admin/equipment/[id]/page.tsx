"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Select, Input, Icon, EmptyState } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useEquipmentList,
  useEquipmentIssues,
  useIssueEquipment,
  useReturnEquipmentIssue,
  type EquipmentStatus,
} from "@/modules/sports-admin/api/equipment";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";

const STATUS_TONE: Record<EquipmentStatus, BadgeTone> = {
  available: "accent",
  in_service: "accentDark",
  retired: "neutral",
};

const ISSUE_STATUS_TONE: Record<string, BadgeTone> = {
  borrowed: "accentDark",
  returned: "accent",
  overdue: "danger",
  lost: "danger",
  damaged: "danger",
};

export default function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const equipmentId = Number(id);
  const router = useRouter();

  const equipmentList = useEquipmentList();
  const item = equipmentList.data?.find((e) => e.id === equipmentId);

  const issues = useEquipmentIssues(equipmentId);
  const issueEquipment = useIssueEquipment();
  const returnIssue = useReturnEquipmentIssue();

  const [issuedToType, setIssuedToType] = useState<"student" | "faculty">("student");
  const [issuedTo, setIssuedTo] = useState<PickedPerson | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!issuedTo) return;
    try {
      await issueEquipment.mutateAsync({
        id: equipmentId,
        issued_to_type: issuedToType,
        student_id: issuedToType === "student" ? issuedTo.id : undefined,
        faculty_id: issuedToType === "faculty" ? issuedTo.id : undefined,
        due_date: dueDate || undefined,
      });
      setIssuedTo(null);
      setDueDate("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button
        onClick={() => router.push("/sports-admin/equipment")}
        className="flex items-center gap-2 self-start text-[13px] font-bold text-primary"
      >
        <Icon name="arrow_back" size={16} />
        Equipment
      </button>

      {!item ? (
        <Card>
          <EmptyState message={equipmentList.isLoading ? "Loading…" : "Equipment item not found."} />
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-extrabold tracking-[-.02em] text-ink">{item.name}</h1>
              <Badge tone={STATUS_TONE[item.status]}>{item.status.replace("_", " ")}</Badge>
            </div>
            <p className="mt-1 text-[13.5px] text-muted">
              {[item.category, item.facility?.name].filter(Boolean).join(" · ") || "—"}
            </p>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { label: "Total quantity", value: item.total_quantity },
                { label: "Issued", value: item.issued_count },
                { label: "Available", value: item.available_count },
                { label: "Reorder level", value: item.reorder_level ?? "—" },
              ].map((k) => (
                <div key={k.label} className="rounded-card-sm border border-border-default bg-surface-muted p-3">
                  <div className="text-[10px] font-extrabold tracking-[.07em] text-subtle uppercase">{k.label}</div>
                  <div className="mt-1 text-[14.5px] font-bold text-ink">{k.value}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4">
            <Card>
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Issue history</h2>
              <div className="mt-3 flex flex-col">
                {issues.isLoading ? (
                  <EmptyState message="Loading…" />
                ) : !issues.data || issues.data.length === 0 ? (
                  <EmptyState message="No items issued yet." />
                ) : (
                  issues.data.map((iss) => (
                    <div
                      key={iss.id}
                      className="flex items-center gap-3.5 border-t border-divider py-3 first:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-bold text-ink">{iss.issued_to.name}</div>
                        <div className="text-[12px] text-muted">
                          Issued {formatDisplayDate(iss.issued_date)}
                          {iss.due_date ? ` · Due ${formatDisplayDate(iss.due_date)}` : ""}
                          {iss.returned_date ? ` · Returned ${formatDisplayDate(iss.returned_date)}` : ""}
                        </div>
                      </div>
                      <Badge tone={ISSUE_STATUS_TONE[iss.status] ?? "neutral"}>{iss.status}</Badge>
                      {(iss.status === "borrowed" || iss.status === "overdue") && (
                        <button
                          onClick={() => returnIssue.mutate(iss.id)}
                          disabled={returnIssue.isPending}
                          className="rounded-[8px] border border-border-accent bg-accent-50 px-3 py-1.5 text-[12px] font-bold text-primary disabled:opacity-50"
                        >
                          Mark returned
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Issue item</h2>
              <form onSubmit={handleIssue} className="mt-3 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">Issued to</label>
                  <Select
                    value={issuedToType}
                    onChange={(e) => {
                      setIssuedToType(e.target.value as "student" | "faculty");
                      setIssuedTo(null);
                    }}
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">
                    {issuedToType === "student" ? "Student" : "Faculty"}
                  </label>
                  <PersonPicker
                    type={issuedToType === "student" ? "student" : "faculty"}
                    value={issuedTo}
                    onChange={setIssuedTo}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">Due date (optional)</label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>

                {error && (
                  <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={!issuedTo || issueEquipment.isPending}>
                  {issueEquipment.isPending ? "Issuing…" : "Issue item"}
                </Button>
              </form>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

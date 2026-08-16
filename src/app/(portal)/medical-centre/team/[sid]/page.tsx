"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { useStaffMember, useSetStaffDuty, useSetStaffStatus } from "@/modules/medical-centre/api/team";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-divider py-3 last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-right text-[14px] font-bold text-ink">{value}</span>
    </div>
  );
}

export default function StaffProfilePage() {
  const params = useParams<{ sid: string }>();
  const router = useRouter();
  const staffId = Number(params.sid);
  const detail = useStaffMember(staffId);
  const setDuty = useSetStaffDuty();
  const setStatus = useSetStaffStatus();
  const member = detail.data;

  if (detail.isLoading) {
    return <EmptyState message="Loading…" />;
  }

  if (!member) {
    return <EmptyState message="Staff member not found." />;
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button
        type="button"
        onClick={() => router.push("/medical-centre/team")}
        className="inline-flex w-fit items-center gap-2.5 rounded-[10px] border border-border-default bg-surface px-4 py-2.5 text-[14px] font-bold text-ink"
      >
        ← Medical team
      </button>

      <Card className="border-[1.5px] border-primary">
        <h1 className="text-[32px] font-extrabold tracking-[-.02em] text-ink">{member.name}</h1>
        <div className="mt-1.5 text-[14px] text-muted">
          {member.desig} · {member.spec}
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <Badge tone={member.status === "Active" ? "accent" : "neutral"}>{member.status}</Badge>
          <Badge tone={member.duty ? "accentDark" : "neutral"}>{member.duty ? "On duty today" : "Off duty today"}</Badge>
          <span className="font-mono text-[12.5px] text-subtle">{member.sid}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <a href={`tel:${member.phone}`}>
            <Button variant="secondary" className="w-auto">
              Call {member.phone}
            </Button>
          </a>
          <a href={`mailto:${member.email}`}>
            <Button variant="secondary" className="w-auto">
              Send email
            </Button>
          </a>
          <Button variant="primarySmall" onClick={() => setDuty.mutate({ id: member.id, duty: !member.duty })} disabled={setDuty.isPending}>
            {member.duty ? "Mark off duty" : "Mark on duty"}
          </Button>
          <Button
            variant="secondary"
            className="w-auto"
            onClick={() => setStatus.mutate({ id: member.id, status: member.status === "Active" ? "on_leave" : "active" })}
            disabled={setStatus.isPending}
          >
            {member.status === "Active" ? "Mark on leave" : "Mark active"}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h2 className="mb-1 text-[17px] font-extrabold text-ink">Professional details</h2>
          <div className="mt-2">
            <Row label="Staff ID" value={member.sid} />
            <Row label="Designation" value={member.desig} />
            <Row label="Qualification" value={member.qual} />
            <Row label="Specialization" value={member.spec} />
            <Row label="Total experience" value={member.exp} />
            <Row label="Medical registration no." value={member.reg} />
          </div>
        </Card>
        <Card>
          <h2 className="mb-1 text-[17px] font-extrabold text-ink">Previous professional history</h2>
          <div className="mt-2">
            <Row label="Institution / hospital" value={member.prevInst} />
            <Row label="Designation" value={member.prevRole} />
            <Row label="Work duration" value={member.prevDur} />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-1 text-[17px] font-extrabold text-ink">Contact and duty</h2>
        <div className="mt-2 grid grid-cols-2 gap-x-8">
          <div>
            <Row label="Mobile number" value={member.phone} />
            <Row label="Email ID" value={member.email} />
            <Row label="Joining date" value={member.joined} />
          </div>
          <div>
            <Row label="Working days" value={member.days} />
            <Row label="Duty timings" value={member.timing} />
            <Row label="Emergency duty availability" value={member.emergency} />
          </div>
        </div>
      </Card>
    </div>
  );
}

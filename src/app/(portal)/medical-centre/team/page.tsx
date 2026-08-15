"use client";

import { useRouter } from "next/navigation";
import { Badge, EmptyState, Icon } from "@/components/ui";
import { useTeam } from "@/modules/medical-centre/api/team";

export default function MedicalTeamPage() {
  const router = useRouter();
  const team = useTeam();

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Medical team</h1>
        <p className="mt-1 text-[13px] text-muted">Doctors, nurses, pharmacist and EMT on the medical centre roster.</p>
      </div>

      {team.isLoading ? (
        <EmptyState message="Loading…" />
      ) : !team.data || team.data.length === 0 ? (
        <EmptyState message="No staff recorded yet." />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {team.data.map((member) => (
            <button
              key={member.sid}
              type="button"
              onClick={() => router.push(`/medical-centre/team/${member.id}`)}
              className="flex flex-col gap-3 rounded-card border border-border-default bg-surface p-[18px_20px] text-left transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-11 items-center justify-center rounded-full bg-icon-chip text-primary">
                  <Icon name="person" size={22} />
                </div>
                <Badge tone={member.status === "Active" ? "accent" : "neutral"}>{member.status}</Badge>
              </div>
              <div>
                <div className="text-[16px] font-extrabold text-ink">{member.name}</div>
                <div className="text-[13px] text-muted">
                  {member.desig} · {member.qual}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-divider pt-3 text-[12.5px]">
                <span className="font-mono text-body">{member.phone}</span>
                <span className={`font-bold ${member.duty ? "text-primary" : "text-subtle"}`}>{member.duty ? "On duty" : "Off duty"}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

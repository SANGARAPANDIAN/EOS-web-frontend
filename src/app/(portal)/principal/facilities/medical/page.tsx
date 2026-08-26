"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import { useMedicalSummary, useMedicalTeam, useTreatmentLog, useMedicalEquipment } from "@/modules/principal/api/facilities";

export default function PrincipalMedicalPage() {
  const summary = useMedicalSummary();
  const team = useMedicalTeam();
  const treatmentLog = useTreatmentLog();
  const equipment = useMedicalEquipment();

  const staffBlurb = summary.data?.staff_by_designation.map((d) => `${d.count} ${d.designation.toLowerCase()}${d.count > 1 ? "s" : ""}`).join(", ");

  return (
    <div className="flex flex-1 flex-col gap-5">
      <Link
        href="/principal/facilities"
        className="flex h-10 w-fit items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
        style={{ borderColor: principalColors.border, color: principalColors.body }}
      >
        <Icon name="arrow_back" size={18} />
        Campus &amp; facilities
      </Link>

      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Medical centre
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          Sick room, pharmacy and ambulance
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <PrincipalStatCard
          label="Students treated"
          icon="healing"
          loading={summary.isLoading}
          value={summary.data?.students_treated_this_year ?? "—"}
          sub={summary.data ? `this academic year · ${summary.data.visits_this_month} visits this month` : undefined}
        />
        <PrincipalStatCard
          label="Medical faculty & staff"
          icon="medical_services"
          loading={summary.isLoading}
          value={summary.data?.staff_count ?? "—"}
          sub={staffBlurb}
        />
        <PrincipalStatCard
          label="Equipment"
          icon="inventory_2"
          loading={summary.isLoading}
          value={summary.data?.equipment_total_quantity ?? "—"}
          sub={summary.data ? `Across ${summary.data.equipment_types} equipment types` : undefined}
        />
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Equipment register
          </div>
          <p className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
            Quantity, location and working condition
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["EQUIPMENT", "QTY", "LOCATION", "CONDITION"].map((h) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${h === "QTY" ? "text-right" : "text-left"}`}
                    style={{ color: principalColors.textFaint }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equipment.isLoading && <PrincipalTableSkeleton columns={4} />}
              {equipment.data?.map((e) => (
                <tr key={e.id} className="border-t transition-colors hover:bg-[rgba(13,30,79,0.03)]" style={{ borderColor: principalColors.borderMuted }}>
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                    {e.name}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {e.quantity}
                  </td>
                  <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                    {e.location ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 capitalize" style={{ color: principalColors.body }}>
                    {e.condition}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!equipment.isLoading && (equipment.data?.length ?? 0) === 0 && (
          <div className="px-5 py-10 text-center text-sm" style={{ color: principalColors.textFaint }}>
            No equipment register exists in this system yet.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
          <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
            <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              Medical team
            </div>
          </div>
          <div className="flex flex-col">
            {team.data?.map((m) => (
              <div key={m.id} className="flex items-center gap-3 border-b px-5 py-3.5 transition-colors last:border-b-0 hover:bg-[rgba(13,30,79,0.03)]" style={{ borderColor: principalColors.borderMuted }}>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}>
                  <Icon name="person" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold" style={{ color: principalColors.heading }}>
                    {m.name}
                  </div>
                  <div className="text-xs" style={{ color: principalColors.textFaint }}>
                    {[m.designation, m.shift_time].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div className="font-mono text-sm" style={{ color: principalColors.textFaint }}>
                  {m.phone ?? "—"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
          <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
            <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              Recent treatment log
            </div>
            <p className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
              Students and staff seen in the last few days
            </p>
          </div>
          <div className="flex flex-col">
            {treatmentLog.data?.map((t) => (
              <div key={t.id} className="border-b px-5 py-3.5 transition-colors last:border-b-0 hover:bg-[rgba(13,30,79,0.03)]" style={{ borderColor: principalColors.borderMuted }}>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-semibold" style={{ color: principalColors.heading }}>
                    {t.person_name} {t.context ? `· ${t.context}` : ""}
                  </div>
                  <div className="shrink-0 font-mono text-xs" style={{ color: principalColors.textFaint }}>
                    {new Date(`${t.visit_date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}
                  </div>
                </div>
                <div className="mt-0.5 text-sm" style={{ color: principalColors.body }}>
                  {[t.diagnosis ?? t.reason, t.treatment_given].filter(Boolean).join(" · ")}
                </div>
                {t.attended_by && (
                  <div className="mt-0.5 text-xs" style={{ color: principalColors.textFaint }}>
                    Seen by {t.attended_by}
                  </div>
                )}
              </div>
            ))}
            {!treatmentLog.isLoading && (treatmentLog.data?.length ?? 0) === 0 && (
              <div className="px-5 py-10 text-center text-sm" style={{ color: principalColors.textFaint }}>
                No visits recorded recently.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

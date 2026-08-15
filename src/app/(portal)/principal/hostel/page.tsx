"use client";

import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import { useHostelSummary, useHostelBlocks, useHostelRoomTypeFees } from "@/modules/principal/api/hostel";

function formatCurfew(time: string): string {
  const [hoursStr, minutesStr] = time.split(":");
  const hours = Number(hoursStr);
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}.${minutesStr} ${period}`;
}

function formatRupees(amount: number): string {
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function PrincipalHostelPage() {
  const summary = useHostelSummary();
  const blocks = useHostelBlocks();
  const roomTypeFees = useHostelRoomTypeFees();

  const hasAnyFeeData = roomTypeFees.data?.some((r) => r.total_per_year != null) ?? false;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Hostel
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          {summary.data
            ? `${summary.data.blocks_count} blocks · ${summary.data.occupied.toLocaleString("en-IN")} residents of ${summary.data.capacity_total.toLocaleString("en-IN")} beds${
                summary.data.curfew_time ? ` · night roll call closes at ${formatCurfew(summary.data.curfew_time)}` : ""
              }`
            : "Loading…"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <PrincipalStatCard
          label="Number of rooms"
          icon="meeting_room"
          loading={summary.isLoading}
          value={summary.data?.rooms_count ?? "—"}
          sub={summary.data ? `across ${summary.data.blocks_count} blocks · ${summary.data.capacity_total.toLocaleString("en-IN")} beds` : undefined}
        />
        <PrincipalStatCard
          label="Occupied"
          icon="bed"
          loading={summary.isLoading}
          value={summary.data?.occupied ?? "—"}
          sub={summary.data?.occupancy_percentage != null ? `${summary.data.occupancy_percentage}% occupancy` : undefined}
        />
        <PrincipalStatCard label="Vacant" icon="door_open" loading={summary.isLoading} value={summary.data?.vacant ?? "—"} sub="vacant now" />
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Block-wise occupancy
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["BLOCK NAME", "WARDEN NAME", "NUMBER", "OCCUPANCY", "VACANT", "OUT ON PASS"].map((h) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${
                      ["NUMBER", "OCCUPANCY", "VACANT", "OUT ON PASS"].includes(h) ? "text-right" : "text-left"
                    }`}
                    style={{ color: principalColors.textFaint }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blocks.isLoading && <PrincipalTableSkeleton columns={6} />}
              {blocks.data?.map((b) => (
                <tr key={b.id} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                    {b.hostel.name} · Block {b.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5" style={{ color: principalColors.body }}>
                    {b.warden ? (
                      <>
                        {b.warden.name}
                        <span className="ml-1.5 text-xs" style={{ color: principalColors.textFaint }}>
                          {b.warden.role === "super_warden" ? "Super Warden" : "Sub Warden"}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: principalColors.textFaint }}>No warden assigned</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {b.rooms_count} rooms
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {b.occupied}/{b.capacity}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {b.vacant}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.primaryDark }}>
                    {b.out_on_pass}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!blocks.isLoading && (blocks.data?.length ?? 0) === 0 && (
          <div className="px-5 py-8 text-center text-sm" style={{ color: principalColors.textFaint }}>
            No hostel blocks on file.
          </div>
        )}
        <div className="border-t px-5 py-3.5 text-xs" style={{ borderColor: principalColors.borderLight, color: principalColors.textSubtle }}>
          OUT ON PASS counts approved outings covering today — it means &quot;authorized to be away right now&quot;,
          not a confirmed gate check-out.
        </div>
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Fee structure by room type
          </div>
          <p className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
            {hasAnyFeeData ? "Annual figures per room type" : "Rates aren't configured in this system yet"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["ROOM TYPE", "TOTAL PER YEAR"].map((h) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${
                      h === "ROOM TYPE" ? "text-left" : "text-right"
                    }`}
                    style={{ color: principalColors.textFaint }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roomTypeFees.isLoading && <PrincipalTableSkeleton columns={2} />}
              {roomTypeFees.data?.map((rt) => (
                <tr key={rt.room_type_id} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                    {rt.room_type}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums font-semibold" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.heading }}>
                    {rt.total_per_year != null ? formatRupees(rt.total_per_year) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

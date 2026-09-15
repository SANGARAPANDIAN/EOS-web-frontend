"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { useVenueBookings } from "@/modules/principal/api/facilities";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";

function statusBadge(status: string): { fg: string; bg: string; bd: string } {
  if (status === "approved") return { fg: "#1B7A3D", bg: "#E9F8EE", bd: "#BEE9CC" };
  if (status === "rejected") return { fg: "#B42318", bg: "#FEF0EE", bd: "#F7C3BB" };
  return { fg: "#92400E", bg: "#FEF3C7", bd: "#FBDE9A" };
}

export default function PrincipalVenueBookingsPage() {
  const [range, setRange] = useState<"week" | "month">("week");
  const bookings = useVenueBookings(range);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/principal/facilities"
          className="flex h-10 w-fit items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
          style={{ borderColor: principalColors.border, color: principalColors.body }}
        >
          <Icon name="arrow_back" size={18} />
          Campus &amp; facilities
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRange("week")}
            className="h-9 rounded-lg px-4 text-sm font-semibold"
            style={range === "week" ? { background: principalColors.primary, color: "#FFFFFF" } : { background: principalColors.bg, border: `1px solid ${principalColors.border}`, color: principalColors.body }}
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setRange("month")}
            className="h-9 rounded-lg px-4 text-sm font-semibold"
            style={range === "month" ? { background: principalColors.primary, color: "#FFFFFF" } : { background: principalColors.bg, border: `1px solid ${principalColors.border}`, color: principalColors.body }}
          >
            This month
          </button>
        </div>
      </div>

      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Venue booked
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          Every venue reserved across the college with the faculty in charge and purpose
        </p>
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="flex items-center border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Booking register
          </div>
          <span className="ml-auto text-[13px]" style={{ color: principalColors.textFaint }}>
            {bookings.isLoading ? "Loading…" : `${bookings.data?.total ?? 0} bookings`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["VENUE", "DATE", "TIME", "FACULTY IN CHARGE", "PURPOSE", "STATUS"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold tracking-wider first:pl-5 last:pr-5" style={{ color: principalColors.textFaint }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.isLoading && <PrincipalTableSkeleton columns={6} />}
              {bookings.data?.bookings.map((b) => {
                const badge = statusBadge(b.status);
                return (
                  <tr key={b.id} className="border-t transition-colors hover:bg-[#F1F6FE] hover:shadow-[inset_0_0_0_1.5px_#1D47AE]" style={{ borderColor: principalColors.borderMuted }}>
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                      {b.venue.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5" style={{ color: principalColors.body }}>
                      {new Date(`${b.date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 font-mono" style={{ color: principalColors.textFaint }}>
                      {b.time}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                      {b.faculty_in_charge}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                      {b.purpose}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full border px-2.5 py-1 text-xs font-semibold capitalize" style={{ color: badge.fg, background: badge.bg, borderColor: badge.bd }}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!bookings.isLoading && (bookings.data?.bookings.length ?? 0) === 0 && (
          <div className="px-5 py-11 text-center text-sm" style={{ color: principalColors.textFaint }}>
            No venue bookings in this {range === "week" ? "week" : "month"}.
          </div>
        )}
      </div>
    </div>
  );
}

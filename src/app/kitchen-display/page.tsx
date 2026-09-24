"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useKitchenQueue } from "@/modules/canteen-queue/api/kitchenQueue";
import { useQueueSocket } from "@/modules/canteen-queue/realtime/useQueueSocket";

/**
 * Public, unauthenticated wall-mounted kitchen screen — a top-level route
 * outside (portal), so it skips RequireAuth/RequireRole/AppShell entirely
 * (same precedent as src/app/login/page.tsx). View-only: kitchen staff read
 * this, status changes happen from the Cashier's own authenticated page.
 * Shows at most 6 orders (queue-based, oldest first) so the screen stays
 * readable regardless of order volume. Every order here is "Paid" (the only
 * pre-ready status) — the ticket's own age is the useful signal, so cards
 * escalate color as they wait, standard KDS practice (Toast/Square-style).
 */

function useClock(): string {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!time) return "--:--:--";
  return time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function elapsedMinutes(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

function urgency(minutes: number): { card: string; chip: string; bar: string; label: string } {
  if (minutes >= 10) {
    return {
      card: "border-red-200 bg-red-50/60",
      chip: "border-red-200 bg-red-100 text-red-700",
      bar: "bg-red-500",
      label: `${minutes}m — needs attention`,
    };
  }
  if (minutes >= 5) {
    return {
      card: "border-amber-200 bg-amber-50/60",
      chip: "border-amber-200 bg-amber-100 text-amber-700",
      bar: "bg-amber-500",
      label: `${minutes}m waiting`,
    };
  }
  return {
    card: "border-slate-200 bg-white",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    bar: "bg-blue-500",
    label: minutes <= 0 ? "Just in" : `${minutes}m`,
  };
}

export default function KitchenDisplayPage() {
  useQueueSocket("kitchen");
  const { data } = useKitchenQueue();
  const orders = data?.orders ?? [];
  const overflow = Math.max(0, (data?.totalActive ?? 0) - orders.length);
  const clock = useClock();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-white p-8 text-[#0b1220] lg:p-10">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Icon name="soup_kitchen" size={30} />
          </div>
          <div>
            <p className="text-[12.5px] font-bold uppercase tracking-[.22em] text-blue-600">Sri Eshwar Canteen</p>
            <h1 className="mt-0.5 text-[32px] font-extrabold leading-none tracking-tight text-[#0b1220]">Kitchen Display</h1>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[30px] font-bold leading-none tabular-nums text-[#0b1220]">{clock}</p>
          <p className="mt-1.5 text-[13px] font-semibold text-slate-500">
            {orders.length} of {data?.totalActive ?? 0} orders in queue
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex h-[55vh] flex-col items-center justify-center gap-4 text-slate-300">
          <Icon name="task_alt" size={72} />
          <p className="text-[22px] font-bold text-slate-400">All caught up — no active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
          {orders.map((o) => {
            const mins = elapsedMinutes(o.createdAt, now);
            const u = urgency(mins);
            return (
              <div
                key={o.orderId}
                className={`relative flex flex-col gap-4 overflow-hidden rounded-[22px] border p-6 shadow-sm transition-colors duration-500 ${u.card}`}
              >
                <span className={`absolute inset-y-0 left-0 w-1.5 ${u.bar}`} />
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0 truncate font-mono text-[clamp(1.75rem,4.5vw,2.875rem)] font-extrabold leading-none tracking-[.02em] text-[#0b1220]">
                    {o.token}
                  </span>
                  <span className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${u.chip}`}>
                    {u.label}
                  </span>
                </div>
                <div className="flex flex-col gap-2 border-t border-slate-200 pt-4">
                  {o.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-[16.5px] text-slate-700">
                      <span className="min-w-0 truncate">
                        {item.name}
                        {item.isParcel && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Parcel</span>}
                      </span>
                      <span className="shrink-0 font-mono text-[17px] font-extrabold text-[#0b1220]">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {overflow > 0 && (
        <div className="mt-7 flex items-center justify-center gap-2 text-[15px] font-semibold text-slate-400">
          <Icon name="hourglass_top" size={18} />
          +{overflow} more waiting in queue
        </div>
      )}
    </div>
  );
}
